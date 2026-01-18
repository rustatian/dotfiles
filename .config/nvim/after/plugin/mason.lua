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
	"ty",
	"yamlls",
	"zls",
}

-- All Mason packages (formatters, linters, DAP, tools, etc.)
-- NOTE: mason.setup() does not support ensure_installed for non-LSP packages.
-- To install all packages manually, run:
-- :MasonInstall clang-format cmakelang gofumpt goimports luaformatter mdformat prettier prettierd pyproject-fmt sql-formatter sqlfmt stylua taplo yamlfix yamlfmt buf checkmake checkstyle cmakelint codespell commitlint cpplint gitleaks gitlint golangci-lint jsonlint luacheck markdownlint markuplint misspell mypy protolint pydocstyle revive semgrep shellcheck stylelint systemdlint yamllint bash-debug-adapter codelldb cpptools debugpy delve codeql gh gitui iferr jq nomad terraform tree-sitter-cli uv wasm-language-tools
local packages = {
	-- Formatters
	"clang-format",
	"cmakelang",
	"gofumpt",
	"goimports",
	"luaformatter",
	"mdformat",
	"prettier",
	"prettierd",
	"pyproject-fmt",
	"sql-formatter",
	"sqlfmt",
	"stylua",
	"taplo",
	"yamlfix",
	"yamlfmt",

	-- Linters
	"buf",
	"checkmake",
	"checkstyle",
	"cmakelint",
	"codespell",
	"commitlint",
	"cpplint",
	"gitleaks",
	"gitlint",
	"golangci-lint",
	"jsonlint",
	"luacheck",
	"markdownlint",
	"markuplint",
	"misspell",
	"mypy",
	"protolint",
	"pydocstyle",
	"revive",
	"semgrep",
	"shellcheck",
	"stylelint",
	"systemdlint",
	"yamllint",

	-- Debug Adapters
	"bash-debug-adapter",
	"codelldb",
	"cpptools",
	"debugpy",
	"delve",

	-- Other Tools
	"codeql",
	"gh",
	"gitui",
	"iferr",
	"jq",
	"nomad",
	"terraform",
	"tree-sitter-cli",
	"uv",
	"wasm-language-tools",
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
