require("conform").setup({
	notify_on_error = false,
	format_on_save = {
		timeout_ms = 500,
		lsp_fallback = true,
	},
	formatters_by_ft = {
		lua = { "stylua" },
		python = {
			"ruff_format",
			"ruff_fix",
			"ruff_organize_imports",
		},
		javascript = { "prettierd", "prettier", stop_after_first = true },
		rust = { "rustfmt" },
		go = { "gofmt", "gofumpt", stop_after_first = true },
	},
})
