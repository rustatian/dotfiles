local null_ls = require("null-ls")
null_ls.setup({
    sources = {
	null_ls.builtins.code_actions.gitsigns,
        null_ls.builtins.formatting.rustfmt,
        null_ls.builtins.diagnostics.fish,
        null_ls.builtins.diagnostics.gitlint,
        null_ls.builtins.diagnostics.golangci_lint,
        null_ls.builtins.completion.spell,
    },
})

local capabilities = require('cmp_nvim_lsp').default_capabilities()
local on_attach = function(client)
    require'completion'.on_attach(client)
end

--rust-analyzer.cachePriming.numThreads
require'lspconfig'.rust_analyzer.setup ({
        capabilities = capabilities,
        settings = {
                ["rust-analyzer"] = {
                checkOnSave = {
                        command = "cargo clippy --all-targets --all-features -- -D warnings",
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
                        enable = true
                        },
                }
        },
        on_attach = on_attach,
})

lspconfig = require'lspconfig'
util = require'lspconfig/util'

require'lspconfig'.gopls.setup {
    	cmd = {"gopls", "serve"},
    	filetypes = {"go", "gomod"},
    	root_dir = util.root_pattern("go.work", "go.mod", ".git"),
	settings = {
		gopls = {
        		analyses = {
          			unusedparams = true,
        		},
        		staticcheck = true,
      		},
    	},
        capabilities = capabilities,
        on_attach = on_attach,
}

require'lspconfig'.bufls.setup {
        capabilities = capabilities,
        on_attach = on_attach,
}

require'lspconfig'.docker_compose_language_service.setup{
        capabilities = capabilities,
        on_attach = on_attach,
}

require'lspconfig'.dockerls.setup{
        capabilities = capabilities,
        on_attach = on_attach,
}

require'lspconfig'.jsonls.setup {
  	capabilities = capabilities,
        on_attach = on_attach,
}

require'lspconfig'.sqlls.setup{
  	capabilities = capabilities,
        on_attach = on_attach,
}

require'lspconfig'.semgrep.setup {
        capabilities = capabilities,
        on_attach = on_attach,
}

require'lspconfig'.bashls.setup{}
require'lspconfig'.grammarly.setup{}

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities.textDocument.completion.completionItem.snippetSupport = true

require'lspconfig'.jsonls.setup {
  capabilities = capabilities,
}

require'lspconfig'.marksman.setup{}
require('lspconfig').yamlls.setup {
  settings = {
    yaml = {
      schemas = {
        ["https://json.schemastore.org/github-workflow.json"] = "/.github/workflows/*",
        ["https://raw.githubusercontent.com/instrumenta/kubernetes-json-schema/master/v1.18.0-standalone-strict/all.json"] = "/*.k8s.yaml",
	["https://cdn.jsdelivr.net/gh/roadrunner-server/roadrunner@latest/schemas/config/3.0.schema.json"] = ".rr*.yaml",
      },
    },
  }
}

require'lspconfig'.golangci_lint_ls.setup {
         capabilities = capabilities,
         on_attach = on_attach,
         command = {"golangci-lint", "run", "--build-tags=race"},
         settings = {
                 gopls = {
                         gofumpt = true,
                 }
         }
}
vim.keymap.set('n', '<space>e', vim.diagnostic.open_float)
vim.keymap.set('n', '[d', vim.diagnostic.goto_prev)
vim.keymap.set('n', ']d', vim.diagnostic.goto_next)
vim.keymap.set('n', '<space>q', vim.diagnostic.setloclist)

-- Use LspAttach autocommand to only map the following keys
-- after the language server attaches to the current buffer
vim.api.nvim_create_autocmd('LspAttach', {
  group = vim.api.nvim_create_augroup('UserLspConfig', {}),
  callback = function(ev)
    -- Enable completion triggered by <c-x><c-o>
    vim.bo[ev.buf].omnifunc = 'v:lua.vim.lsp.omnifunc'

    -- Buffer local mappings.
    -- See `:help vim.lsp.*` for documentation on any of the below functions
    local opts = { buffer = ev.buf }
    local nmap = function(keys, func, desc)
        if desc then
                desc = 'LSP: ' .. desc
        end
        vim.keymap.set('n', keys, func, { buffer = bufnr, desc = desc})
    end

    nmap('gd', vim.lsp.buf.definition, '[G]oto [D]efinition')
    nmap('gI', vim.lsp.buf.implementation, '[G]oto [I]mplementation')
    nmap('gr', require('telescope.builtin').lsp_references, '[G]oto [R]eferences')

    vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
    vim.keymap.set('n', '<C-k>', vim.lsp.buf.signature_help, opts)
    vim.keymap.set('n', '<space>wa', vim.lsp.buf.add_workspace_folder, opts)
    vim.keymap.set('n', '<space>wr', vim.lsp.buf.remove_workspace_folder, opts)
    vim.keymap.set('n', '<space>wl', function()
      print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
    end, opts)
    vim.keymap.set('n', '<space>D', vim.lsp.buf.type_definition, opts)
    vim.keymap.set('n', '<space>rn', vim.lsp.buf.rename, opts)
    vim.keymap.set({ 'n', 'v' }, '<space>ca', vim.lsp.buf.code_action, opts)
    vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
    vim.keymap.set('n', '<space>f', function()
      vim.lsp.buf.format { async = true }
    end, opts)
  end,
})
