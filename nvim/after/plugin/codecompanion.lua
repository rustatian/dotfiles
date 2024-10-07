vim.api.nvim_set_keymap("n", "<C-a>", "<cmd>CodeCompanionActions<cr>", { noremap = true, silent = true })
vim.api.nvim_set_keymap("v", "<C-a>", "<cmd>CodeCompanionActions<cr>", { noremap = true, silent = true })
vim.api.nvim_set_keymap("n", "<LocalLeader>a", "<cmd>CodeCompanionChat Toggle<cr>", { noremap = true, silent = true })
vim.api.nvim_set_keymap("v", "<LocalLeader>a", "<cmd>CodeCompanionChat Toggle<cr>", { noremap = true, silent = true })
vim.api.nvim_set_keymap("v", "ga", "<cmd>CodeCompanionChat Add<cr>", { noremap = true, silent = true })

-- Expand 'cc' into 'CodeCompanion' in the command line
vim.cmd([[cab cc CodeCompanion]])

require("codecompanion").setup({
	strategies = {
		chat = {
			adapter = "openai",
		},
		inline = {
			adapter = "copilot",
		},
		agent = {
			adapter = "openai",
		},
	},
	adapters = {
		openai = function()
			return require("codecompanion.adapters").extend("openai", {
				env = {
					api_key = "cmd:gpg --decrypt ~/.gnupg/openaikey.gpg 2>/dev/null",
				},
			})
		end,
	},
})
