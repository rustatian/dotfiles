local status_ok, mason = pcall(require, "mason")
if not status_ok then
	return
end

-- LSP servers (for mason-lspconfig)
local servers = {
	"bashls",
	"buf_ls",
	"clangd",
	"copilot",
	"docker_compose_language_service",
	"docker_language_server",
	"dockerls",
	"fish_lsp",
	"gh_actions_ls",
	"gitlab_ci_ls",
	"golangci_lint_ls",
	"gopls",
	"helm_ls",
	"html",
	"hyprls",
	"intelephense",
	"jqls",
	"jsonls",
	"lua_ls",
	"marksman",
	"ruff",
	"rust_analyzer",
	"sqlls",
	"sqls",
	"stylelint_lsp",
	"systemd_lsp",
	"terraformls",
	"ts_ls",
	"basedpyright",
	"yamlls",
	"zls",
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
	automatic_installation = true,
})
