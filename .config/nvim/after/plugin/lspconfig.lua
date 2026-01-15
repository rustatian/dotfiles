require("lazydev").setup()

local capabilities = vim.lsp.protocol.make_client_capabilities()

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

vim.lsp.config("rust_analyzer", {
	capabilities = capabilities,
	on_attach = on_attach,
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
})
vim.lsp.enable("rust_analyzer")

vim.lsp.config("zls", {
	capabilities = capabilities,
	on_attach = on_attach,
})
vim.lsp.enable("zls")

vim.lsp.config("jsonls", {
	capabilities = capabilities,
	on_attach = on_attach,
})
vim.lsp.enable("jsonls")
vim.lsp.enable("helm_ls")
vim.lsp.enable("gitlab_ci_ls")

vim.lsp.config("buf_ls", {
	capabilities = capabilities,
	on_attach = on_attach,
	cmd = { "buf", "lsp", "serve", "--timeout=0", "--log-format=text" },
})
vim.lsp.enable("buf_ls")
vim.lsp.enable("stylelint_lsp")

vim.lsp.config("lua_ls", {
	capabilities = capabilities,
	on_attach = on_attach,
	on_init = function(client)
		if client.workspace_folders then
			local path = client.workspace_folders[1].name
			if
			    path ~= vim.fn.stdpath("config")
			    and (vim.uv.fs_stat(path .. "/.luarc.json") or vim.uv.fs_stat(path .. "/.luarc.jsonc"))
			then
				return
			end
		end

		client.config.settings.Lua = vim.tbl_deep_extend("force", client.config.settings.Lua, {
			runtime = {
				-- Tell the language server which version of Lua you're using (most
				-- likely LuaJIT in the case of Neovim)
				version = "LuaJIT",
				-- Tell the language server how to find Lua modules same way as Neovim
				-- (see `:h lua-module-load`)
				path = {
					"lua/?.lua",
					"lua/?/init.lua",
				},
			},
			-- Make the server aware of Neovim runtime files
			workspace = {
				checkThirdParty = false,
				library = {
					vim.env.VIMRUNTIME,
					-- Depending on the usage, you might want to add additional paths
					-- here.
					-- '${3rd}/luv/library'
					-- '${3rd}/busted/library'
				},
				-- Or pull in all of 'runtimepath'.
				-- NOTE: this is a lot slower and will cause issues when working on
				-- your own configuration.
				-- See https://github.com/neovim/nvim-lspconfig/issues/3189
				-- library = {
				--   vim.api.nvim_get_runtime_file('', true),
				-- }
			},
		})
	end,
	settings = {
		Lua = {},
	},
})
vim.lsp.enable("lua_ls")

vim.lsp.config("golangci_lint_ls", {
	capabilities = capabilities,
	on_attach = on_attach,
	init_options = {
		command = { "golangci-lint", "run", "--output.json.path=stdout", "--show-stats=false" },
	},
})
vim.lsp.enable("golangci_lint_ls")

vim.lsp.config("gopls", {
	capabilities = capabilities,
	on_attach = on_attach,
	cmd = { "gopls" },
	filetypes = { "go", "gomod", "gowork", "gotmpl" },
	settings = {
		gopls = {
			usePlaceholders = true,
			completeUnimported = true,
			buildFlags = { "-tags=debug" },
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
})
vim.lsp.enable("gopls")

-- C/C++ LSP ---------------------
vim.lsp.config("cmake", {
	capabilities = capabilities,
	on_attach = on_attach,
})
vim.lsp.enable("cmake")

vim.lsp.config("clangd", {
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
vim.lsp.enable("clangd")

vim.lsp.config("docker_compose_language_service", {
	capabilities = capabilities,
	on_attach = on_attach,
})
vim.lsp.enable("docker_compose_language_service")

vim.lsp.config("dockerls", {
	capabilities = capabilities,
	on_attach = on_attach,
})
vim.lsp.enable("dockerls")

vim.lsp.config("jsonls", {
	capabilities = capabilities,
	on_attach = on_attach,
})
vim.lsp.enable("jsonls")

vim.lsp.config("sqlls", {
	capabilities = capabilities,
	on_attach = on_attach,
})
vim.lsp.enable("sqlls")

vim.lsp.config("basedpyright", {
	capabilities = capabilities,
	python = {
		analysis = {
			autoSearchPaths = true,
			diagnosticMode = "openFilesOnly",
			useLibraryCodeForTypes = true,
		},
	},
})
vim.lsp.enable("basedpyright")

vim.lsp.config('ruff', {
	capabilities = capabilities,
	on_attach = on_attach,
	init_options = {
		settings = {
			lineLength = 120,
			fixAll = true,
			organizeImports = true,
			showSyntaxErrors = true,
			lint = {
				enable = true,
			}
		}
	}
})
vim.lsp.enable('ruff')

vim.lsp.config('ty', {
	capabilities = capabilities,
	on_attach = on_attach,
	settings = {
		ty = {
			disableLanguageServices = false,
			showSyntaxErrors = true,
			completions = {
				autoImport = true,
			},
			inlayHints = {
				variableTypes = true,
				callArgumentNames = true,
			},
			diagnosticMode = "workspace",
			configuration = {
				rules = {
					["unresolved-reference"] = "warn"
				}
			}
		},
	},
})

vim.lsp.enable('ty')

vim.lsp.config("intelephense", {
	capabilities = capabilities,
	on_attach = on_attach,
	init_options = {
		globalStoragePath = os.getenv("HOME") .. "/.local/share/intelephense",
	},
})
vim.lsp.enable("intelephense")

vim.lsp.config("bashls", {
	capabilities = capabilities,
	on_attach = on_attach,
})
vim.lsp.enable("bashls")

vim.lsp.config("marksman", {
	capabilities = capabilities,
	flags = { debounce_text_changes = 200 },
	on_attach = on_attach,
})
vim.lsp.enable("marksman")

vim.lsp.config("yamlls", {
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
vim.lsp.enable("yamlls")


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
