local luasnip = require("luasnip")
luasnip.config.setup({
	history = true,
	updateevents = "TextChanged,TextChangedI",
})
require("blink.cmp").setup({
	enabled = function() return not vim.tbl_contains({ "lua", "markdown" }, vim.bo.filetype) end,
	cmdline = { enabled = false },
	appearance = {
		nerd_font_variant = 'mono',
	},
	completion = {
		keyword = { range = 'full' },
		accept = { auto_brackets = { enabled = false } },
		list = { selection = { preselect = false, auto_insert = true } },
		menu = {
			auto_show = true,
			min_width = 30,
			max_height = 30,
			draw = {
				columns = {
					{ "label", "kind", gap = 1 },
					{ "detail" },
				},
				components = {
					detail = {
						width = { max = 80 },
						text = function(ctx) return ctx.item.detail or "" end,
						highlight = "BlinkCmpLabelDescription",
					},
				},
			},
		},
		documentation = { auto_show = true, auto_show_delay_ms = 500 },
		ghost_text = { enabled = true },
	},
	sources = {
		default = { 'lsp', 'path', 'snippets', 'buffer' },
	},
	snippets = { preset = 'luasnip' },
	signature = { enabled = true },
})
