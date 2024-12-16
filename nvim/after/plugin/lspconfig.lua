require("lazydev").setup()

local capabilities = require('blink.cmp').get_lsp_capabilities()
local lspconfig = require('lspconfig')

capabilities = vim.tbl_deep_extend("force", capabilities, capabilities)
capabilities.textDocument.completion.completionItem.snippetSupport = true
capabilities.textDocument.foldingRange = {
	dynamicRegistration = false,
	lineFoldingOnly = true,
}

local on_attach = function(client, _)
	if client.server_capabilities.inlayHintProvider then
		vim.lsp.inlay_hint.enable(true, {})
	end
end

-- Rust-Analyzer setup in the init.lua

-- local lspconfig = require("lspconfig")
local util = require("lspconfig/util")

require("lspconfig").rust_analyzer.setup({
	capabilities = capabilities,
	settings = {
		["rust-analyzer"] = {
			diagnostics = {
				enable = true,
			},
			checkOnSave = {
				allTargets = true,
			},
			imports = {
				granularity = {
					group = "module",
				},
				prefix = "self",
			},
			cargo = {
				buildScripts = {
					enable = true,
				},
			},
			procMacro = {
				enable = true,
			},
			experimental = {
				serverStatusNotification = true,
			},
		},
	},
	on_attach = on_attach,
})

lspconfig.zls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.jsonls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.helm_ls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.gitlab_ci_ls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.buf_ls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.stylelint_lsp.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.lua_ls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.golangci_lint_ls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
	command = { "golangci-lint", "run", "--build-tags=race", "--out-format", "json" },
})

lspconfig.gopls.setup({
	cmd = { "gopls", "serve" },
	filetypes = { "go", "gomod" },
	root_dir = util.root_pattern("go.work", "go.mod", ".git"),
	settings = {
		gopls = {
			usePlaceholders = true,
			completeUnimported = true,
			buildFlags = { "-tags=debug", "-tags=goexperiment.rangefunc" },
			analyses = {
				unusedparams = true,
			},
			staticcheck = true,
			experimentalPostfixCompletions = true,
			hints = {
				parameterNames = true,
				assignVariableTypes = true,
				constantValues = true,
				rangeVariableTypes = true,
				compositeLiteralTypes = true,
				compositeLiteralFields = true,
				functionTypeParameters = true,
			},
		},
	},
	capabilities = capabilities,
	on_attach = on_attach,
})

-- C/C++ LSP ---------------------
lspconfig.cmake.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.clangd.setup({
	capabilities = capabilities,
	on_attach = on_attach,
	cmd = {
		"clangd",
		"--background-index",
		"--clang-tidy",
		"--header-insertion=iwyu",
		"--completion-style=detailed",
		"--function-arg-placeholders",
		"--fallback-style=llvm",
	},
	flags = {
		debounce_text_changes = 200,
	},
	settings = {
		clangd = {},
	},
	init_options = {
		clangdFileStatus = true, -- Provides information about activity on clangd’s per-file worker thread
		usePlaceholders = true,
		completeUnimported = true,
		semanticHighlighting = true,
	},
	filetypes = { "c", "cpp", "h", "hpp" },
})

lspconfig.docker_compose_language_service.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.dockerls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.jsonls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.sqlls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.pyright.setup({
	capabilities = capabilities,
	on_attach = on_attach,
	python = {
		analysis = {
			autoSearchPaths = true,
			useLibraryCodeForTypes = true,
		},
	},
})

lspconfig.intelephense.setup({
	capabilities = capabilities,
	on_attach = on_attach,
	init_options = {
		globalStoragePath = os.getenv("HOME") .. "/.local/share/intelephense",
	},
})

lspconfig.bashls.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.grammarly.setup({
	capabilities = capabilities,
	on_attach = on_attach,
})

lspconfig.jsonls.setup({
	capabilities = capabilities,
})

lspconfig.marksman.setup({
	capabilities = capabilities,
	flags = { debounce_text_changes = 200 },
	on_attach = on_attach,
})

lspconfig.yamlls.setup({
	settings = {
		yaml = {
			schemas = {
				["https://json.schemastore.org/github-workflow.json"] = "/.github/workflows/*",
				["https://raw.githubusercontent.com/instrumenta/kubernetes-json-schema/master/v1.18.0-standalone-strict/all.json"] =
				"/*.k8s.yaml",
				["https://cdn.jsdelivr.net/gh/roadrunner-server/roadrunner@latest/schemas/config/3.0.schema.json"] =
				".rr*.yaml",
			},
		},
	},
})

vim.keymap.set("n", "<space>e", vim.diagnostic.open_float)
vim.keymap.set("n", "[d", vim.diagnostic.goto_prev)
vim.keymap.set("n", "]d", vim.diagnostic.goto_next)
vim.keymap.set("n", "<space>q", vim.diagnostic.setloclist)

-- Use LspAttach autocommand to only map the following keys
-- after the language server attaches to the current buffer
vim.api.nvim_create_autocmd("LspAttach", {
	group = vim.api.nvim_create_augroup("UserLspConfig", { clear = true }),
	callback = function(ev)
		-- Enable completion triggered by <c-x><c-o>
		vim.bo[ev.buf].omnifunc = "v:lua.vim.lsp.omnifunc"

		local map = function(keys, func, desc)
			vim.keymap.set("n", keys, func, { buffer = ev.buf, desc = "LSP: " .. desc })
		end

		-- Jump to the definition of the word under your cursor.
		--  This is where a variable was first declared, or where a function is defined, etc.
		--  To jump back, press '<C-t>'.
		map("gd", require("telescope.builtin").lsp_definitions, "[G]oto [D]efinition")

		-- Find references for the word under your cursor.
		map("gr", require("telescope.builtin").lsp_references, "[G]oto [R]eferences")

		-- Jump to the implementation of the word under your cursor.
		--  Useful when your language has ways of declaring types without an actual implementation.
		map("gI", require("telescope.builtin").lsp_implementations, "[G]oto [I]mplementation")

		-- Jump to the type of the word under your cursor.
		--  Useful when you're not sure what type a variable is and you want to see
		--  the definition of its *type*, not where it was *defined*.
		map("<leader>D", require("telescope.builtin").lsp_type_definitions, "Type [D]efinition")

		-- Fuzzy find all the symbols in your current document.
		--  Symbols are things like variables, functions, types, etc.
		map("<leader>ds", require("telescope.builtin").lsp_document_symbols, "[D]ocument [S]ymbols")

		-- Fuzzy find all the symbols in your current workspace
		--  Similar to document symbols, except searches over your whole project.
		map("<leader>ws", require("telescope.builtin").lsp_dynamic_workspace_symbols, "[W]orkspace [S]ymbols")

		-- Rename the variable under your cursor
		--  Most Language Servers support renaming across files, etc.
		map("<leader>rn", vim.lsp.buf.rename, "[R]e[n]ame")

		-- Execute a code action, usually your cursor needs to be on top of an error
		-- or a suggestion from your LSP for this to activate.
		map("<leader>ca", vim.lsp.buf.code_action, "[C]ode [A]ction")

		-- Opens a popup that displays documentation about the word under your cursor
		--  See `:help K` for why this keymap
		map("K", vim.lsp.buf.hover, "Hover Documentation")

		-- WARN: This is not Goto Definition, this is Goto Declaration.
		--  For example, in C this would take you to the header
		map("gD", vim.lsp.buf.declaration, "[G]oto [D]eclaration")

		-- Signature help is the popup that shows the types of function arguments
		map("<C-k>", vim.lsp.buf.signature_help, "Signature [H]elp")

		-- The following two autocommands are used to highlight references of the
		-- word under your cursor when your cursor rests there for a little while.
		--    See `:help CursorHold` for information about when this is executed
		--
		-- When you move your cursor, the highlights will be cleared (the second autocommand).
		local client = vim.lsp.get_client_by_id(ev.data.client_id)
		if client and client.server_capabilities.documentHighlightProvider then
			vim.api.nvim_create_autocmd({ "CursorHold", "CursorHoldI" }, {
				buffer = ev.buf,
				callback = vim.lsp.buf.document_highlight,
			})

			vim.api.nvim_create_autocmd({ "CursorMoved", "CursorMovedI" }, {
				buffer = ev.buf,
				callback = vim.lsp.buf.clear_references,
			})
		end
	end,
})
