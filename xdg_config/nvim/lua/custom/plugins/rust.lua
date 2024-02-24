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
						vim.lsp.inlay_hint.enable(bufnr, true)
					end

					vim.keymap.set("n", "<leader>z", function()
						vim.cmd.RustLsp("codeAction")
					end, { silent = true, buffer = bufnr })

					require("lang.on_attach").setup_all(client, bufnr)
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
						inlayHints = {
							bindingModeHints = {
								enable = true,
							},
							closureCaptureHints = {
								enable = true,
							},
							closureReturnTypeHints = {
								enable = "always",
							},
							discriminantHints = {
								enable = "always",
							},
							implicitDrops = {
								enable = true,
							},
							expressionAdjustmentHints = {
								enable = true,
							},

							lifetimeElisionHints = {
								enable = true,
								useParameterNames = true,
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
	ft = { "rust" },
}
