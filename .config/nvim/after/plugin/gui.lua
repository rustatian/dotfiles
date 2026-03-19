require("gruvbox").setup({
	terminal_colors = true,
	undercurl = true,
	underline = true,
	bold = true,
	italic = {
		strings = false,
		emphasis = false,
		comments = false,
		operators = false,
		folds = false,
	},
	strikethrough = true,
	invert_selection = false,
	invert_signs = false,
	invert_tabline = false,
	inverse = true,
	contrast = "",
	palette_overrides = {},
	overrides = {
		IndentBlanklineChar = { link = "GruvboxFg4" },
		["@lsp.mod.readonly"] = { italic = false },
		["@lsp.typemod.variable.readonly"] = { bold = true, italic = false },
		["@lsp.mod.deprecated"] = { strikethrough = false },
	},
	dim_inactive = false,
	transparent_mode = false,
})

vim.o.background = "dark"
vim.cmd("colorscheme gruvbox")

require("barbecue").setup({
	theme = "auto",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
