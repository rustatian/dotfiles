local status_ok, mason = pcall(require, "mason")
if not status_ok then
  return
end

local servers = {'gopls', 'rust_analyzer' } --'buf', 'cmakelint', 'codelldb', 'delve', 'goimports', 'golangci-lint', 'gomodifytags', 'gotest', 'protolint', 'pydocstyle', 'pylint'}

mason.setup({
    ui = {
        icons = {
            package_installed = "✓",
            package_pending = "➜",
            package_uninstalled = "✗"
        }
    }
})

require('mason-lspconfig').setup {
	ensure_installed = servers,
}
