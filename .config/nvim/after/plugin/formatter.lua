require("conform").setup({
	notify_on_error = false,
	format_on_save = {
		timeout_ms = 500,
		lsp_fallback = true,
	},
	formatters_by_ft = {
		lua = { "stylua" },
		python = { "ruff", "isort" },
		javascript = { "prettierd", "prettier", stop_after_first = true },
		rust = { "rustfmt" },
		go = { "gofmt", "gofumpt", stop_after_first = true },
	},
	keys = {
		"<leader>f",
		function()
			require("conform").format({ formatters = { "injected" }, timeout_ms = 3000 })
		end,
		mode = { "n", "v" },
		desc = "Format Injected Langs",
	},
})
