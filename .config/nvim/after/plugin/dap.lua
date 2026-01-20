local dap = require("dap")
local dapui = require("dapui")

-- mason-nvim-dap: auto-install and configure adapters
-- Note: Uses DAP adapter names, not Mason package names
-- Docs: https://github.com/jay-babu/mason-nvim-dap.nvim
-- Adapter configs: https://codeberg.org/mfussenegger/nvim-dap/wiki/Debug-Adapter-installation
require("mason-nvim-dap").setup({
	ensure_installed = { "python", "delve", "codelldb", "cppdbg", "bash" },
	automatic_installation = true,
	handlers = {
		-- Default handler - REQUIRED for automatic setup
		-- Without this, no adapters get configured (handlers = {} means no setup)
		function(config)
			require("mason-nvim-dap").default_setup(config)
		end,

		-- codelldb: override to use modern executable type (1.11.0+ supports stdio)
		-- See: https://codeberg.org/mfussenegger/nvim-dap/wiki/C-C---Rust-(via--codelldb)
		codelldb = function(config)
			config.adapters = {
				type = "executable",
				command = vim.fn.stdpath("data") .. "/mason/bin/codelldb",
			}
			require("mason-nvim-dap").default_setup(config)
		end,

		-- cppdbg (vscode-cpptools) for C/C++
		-- See: https://codeberg.org/mfussenegger/nvim-dap/wiki/C-C---Rust-(gdb-via--vscode-cpptools)
		cppdbg = function(config)
			config.adapters = {
				id = "cppdbg",
				type = "executable",
				command = vim.fn.stdpath("data") .. "/mason/bin/OpenDebugAD7",
			}
			require("mason-nvim-dap").default_setup(config)
		end,

		-- bash-debug-adapter for shell scripts
		bash = function(config)
			config.adapters = {
				type = "executable",
				command = vim.fn.stdpath("data") .. "/mason/bin/bash-debug-adapter",
			}
			require("mason-nvim-dap").default_setup(config)
		end,
	},
})

-- DAP UI setup
dapui.setup()

-- Virtual text (inline variable values)
-- Uses treesitter to find variable definitions
require("nvim-dap-virtual-text").setup({
	enabled = true,
	highlight_changed_variables = true,
	highlight_new_as_changed = false,
	show_stop_reason = true,
	commented = false,
	virt_text_pos = "inline",
})

-- Track NvimTree state before debugging
local nvimtree_was_open = false

-- Auto open/close UI on debug events
dap.listeners.before.attach.dapui_config = function()
	local nvimtree_api = require("nvim-tree.api")
	nvimtree_was_open = nvimtree_api.tree.is_visible()
	if nvimtree_was_open then
		nvimtree_api.tree.close()
	end
	dapui.open()
end
dap.listeners.before.launch.dapui_config = function()
	local nvimtree_api = require("nvim-tree.api")
	nvimtree_was_open = nvimtree_api.tree.is_visible()
	if nvimtree_was_open then
		nvimtree_api.tree.close()
	end
	dapui.open()
end
dap.listeners.before.event_terminated.dapui_config = function()
	dapui.close()
	if nvimtree_was_open then
		require("nvim-tree.api").tree.open()
		nvimtree_was_open = false
	end
end
dap.listeners.before.event_exited.dapui_config = function()
	dapui.close()
	if nvimtree_was_open then
		require("nvim-tree.api").tree.open()
		nvimtree_was_open = false
	end
end

-- Go: nvim-dap-go setup
require("dap-go").setup()

-- Python: nvim-dap-python setup
-- Uses uv which you have installed via Mason
require("dap-python").setup("uv")

-- Keybindings (matching lspconfig.lua style)
local map = function(keys, func, desc)
	vim.keymap.set("n", keys, func, { desc = "DAP: " .. desc })
end

-- Session control
map("<leader>dc", dap.continue, "[D]ebug [C]ontinue/Start")
map("<leader>dx", dap.terminate, "[D]ebug E[x]it/Terminate")
map("<leader>dr", dap.repl.toggle, "[D]ebug [R]EPL Toggle")
map("<leader>dl", dap.run_last, "[D]ebug Run [L]ast")

-- Breakpoints
map("<leader>db", dap.toggle_breakpoint, "[D]ebug [B]reakpoint Toggle")
map("<leader>dB", function()
	dap.set_breakpoint(vim.fn.input("Breakpoint condition: "))
end, "[D]ebug [B]reakpoint Conditional")
map("<leader>dp", function()
	dap.set_breakpoint(nil, nil, vim.fn.input("Log point message: "))
end, "[D]ebug Log [P]oint")

-- Stepping
map("<leader>do", dap.step_over, "[D]ebug Step [O]ver")
map("<leader>di", dap.step_into, "[D]ebug Step [I]nto")
map("<leader>dO", dap.step_out, "[D]ebug Step [O]ut")

-- UI & Inspection
map("<leader>du", dapui.toggle, "[D]ebug [U]I Toggle")
map("<leader>de", dapui.eval, "[D]ebug [E]val Expression")
map("<leader>dh", function()
	require("dap.ui.widgets").hover()
end, "[D]ebug [H]over")
map("<leader>df", function()
	local widgets = require("dap.ui.widgets")
	widgets.centered_float(widgets.frames)
end, "[D]ebug [F]rames")
map("<leader>ds", function()
	local widgets = require("dap.ui.widgets")
	widgets.centered_float(widgets.scopes)
end, "[D]ebug [S]copes")

-- Test debugging (language-specific)
map("<leader>dt", function()
	local ft = vim.bo.filetype
	if ft == "go" then
		require("dap-go").debug_test()
	elseif ft == "python" then
		require("dap-python").test_method()
	else
		vim.notify("Test debugging not supported for " .. ft, vim.log.levels.WARN)
	end
end, "[D]ebug [T]est Nearest")

map("<leader>dT", function()
	local ft = vim.bo.filetype
	if ft == "go" then
		require("dap-go").debug_last_test()
	elseif ft == "python" then
		require("dap-python").test_class()
	else
		vim.notify("Test debugging not supported for " .. ft, vim.log.levels.WARN)
	end
end, "[D]ebug [T]est Last/Class")

-- Signs (breakpoint icons)
vim.fn.sign_define("DapBreakpoint", { text = "●", texthl = "DapBreakpoint" })
vim.fn.sign_define("DapBreakpointCondition", { text = "◐", texthl = "DapBreakpointCondition" })
vim.fn.sign_define("DapLogPoint", { text = "◆", texthl = "DapLogPoint" })
vim.fn.sign_define("DapStopped", { text = "→", texthl = "DapStopped", linehl = "DapStoppedLine" })
vim.fn.sign_define("DapBreakpointRejected", { text = "○", texthl = "DapBreakpointRejected" })
