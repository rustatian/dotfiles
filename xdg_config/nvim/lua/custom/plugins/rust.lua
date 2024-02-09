return {
    "mrcjkb/rustaceanvim",
    version = '^4',
    lazy = false,
    init = function()
      -- Configure rustaceanvim here
      vim.g.rustaceanvim = {
	        server = {
		on_attach = function(client, bufnr)
			vim.keymap.set(
    				"n",
    				"<leader>z",
    				function()
        				vim.cmd.RustLsp('codeAction')
    				end,
    				{ silent = true, buffer = bufnr }
			)
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
				lifetimeElisionHints = {
					enable = true,
					useParameterNames = true,
				}
			},
                	procMacro = {
                        	enable = true,
                        },
                    }
        	},
	      }
      }
    end,
    ft = { 'rust' },
}
