local status_ok, mason = pcall(require, "mason")
if not status_ok then
  return
end

local servers = {'gopls', 'rust_analyzer'}

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

