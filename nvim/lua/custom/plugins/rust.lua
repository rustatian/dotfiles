return {
	"mrcjkb/rustaceanvim",
	version = "^4",
	dependencies = {
		"nvim-lua/plenary.nvim",
	},
	init = function()
		-- Configure rustaceanvim here
		vim.g.rustaceanvim = {
			server = {
				on_attach = function(client, bufnr)
					if client.server_capabilities.inlayHintProvider then
						vim.lsp.inlay_hint.enable(true, {})
					end

					vim.keymap.set("n", "<leader>z", function()
						vim.cmd.RustLsp("codeAction")
					end, { silent = true, buffer = bufnr })
				end,
				settings = {
					["rust-analyzer"] = {
						diagnostics = {
							enable = true,
						},
						checkOnSave = {
							command = "clippy",
							extraArgs = {},
							allFeatures = true,
						},
						imports = {
							granularity = {
								group = "module",
							},
							prefix = "self",
						},
						cargo = {
							allFeatures = true,
							runBuildScripts = true,
							loadOutDirsFromCheck = true,
							buildScripts = {
								enable = true,
							},
						},
						procMacro = {
							enable = true,
						},
					},
				},
			},
		}
	end,
	hint = {
		enable = true,
	},
	ft = { "rust" },
}
