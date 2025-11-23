local status_ok, mason = pcall(require, "mason")
if not status_ok then
	return
end

-- LSP servers (for mason-lspconfig)
local servers = {
	"bashls",
	"buf_ls",
	"clangd",
	"cmake",
	"codeqlls",
	"copilot",
	"docker_compose_language_service",
	"docker_language_server",
	"dockerls",
	"fish_lsp",
	"gh_actions_ls",
	"gitlab_ci_ls",
	"golangci_lint_ls",
	"gopls",
	"grammarly",
	"helm_ls",
	"html",
	"hyprls",
	"jqls",
	"jsonls",
	"lua_ls",
	"nginx_language_server",
	"pylsp",
	"pyright",
	"rust_analyzer",
	"sqlls",
	"sqls",
	"stylelint_lsp",
	"terraformls",
	"ts_ls",
	"yamlls",
	"zls",
}

-- All Mason packages (formatters, linters, DAP, tools, etc.)
local packages = {
	-- Formatters
	"black",
	"blackd-client",
	"blade-formatter",
	"clang-format",
	"cmakelang",
	"docformatter",
	"gofumpt",
	"goimports",
	"isort",
	"luaformatter",
	"mdformat",
	"nginx-config-formatter",
	"prettier",
	"prettierd",
	"pyink",
	"pyproject-fmt",
	"sql-formatter",
	"sqlfmt",
	"stylua",
	"taplo",
	"yamlfix",
	"yamlfmt",

	-- Linters
	"checkmake",
	"checkstyle",
	"cmakelint",
	"codespell",
	"commitlint",
	"cpplint",
	"flake8",
	"gitleaks",
	"gitlint",
	"golangci-lint",
	"intelephense",
	"jsonlint",
	"luacheck",
	"marksman",
	"markuplint",
	"misspell",
	"mypy",
	"protolint",
	"pydocstyle",
	"pyflakes",
	"pylint",
	"revive",
	"ruff",
	"semgrep",
	"stylelint",
	"yamllint",

	-- Debug Adapters
	"bash-debug-adapter",
	"codelldb",
	"cpptools",
	"debugpy",
	"delve",

	-- Other Tools
	"gh",
	"gitui",
	"iferr",
	"jq",
	"nomad",
	"terraform",
	"ty",
	"uv",
	"wasm-language-tools",
}

mason.setup({
	ensure_installed = packages,
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
