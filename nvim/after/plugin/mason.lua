local status_ok, mason = pcall(require, "mason")
if not status_ok then
	return
end

local servers = {
	"gopls",
	"rust_analyzer",
	"yamlls",
	"cmake",
	"dockerls",
	"docker_compose_language_service",
	"golangci_lint_ls",
	"grammarly",
	"lua_ls",
	"marksman",
	"intelephense",
	"pylsp",
	"taplo",
}

mason.setup({
	ui = {
		icons = {
			package_installed = "✓",
			package_pending = "➜",
			package_uninstalled = "✗",
		},
	},
})

require("mason-lspconfig").setup({
	ensure_installed = servers,
})
