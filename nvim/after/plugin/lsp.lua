local null_ls = require("null-ls")
null_ls.setup({
    sources = {
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

require'lspconfig'.rust_analyzer.setup ({
        capabilities = capabilities,
        settings = {
                ["rust-analyzer"] = {
                checkOnSave = {
                        command = "clippy",
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

require'lspconfig'.gopls.setup {
        capabilities = capabilities,
        on_attach = on_attach,
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
