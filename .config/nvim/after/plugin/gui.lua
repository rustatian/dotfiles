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
	inverse = true,
	contrast = "", -- "hard", "soft" or "" (empty = medium, matches "Gruvbox Dark")
	dim_inactive = false,
	transparent_mode = false,
})
vim.o.background = "dark"
vim.cmd("colorscheme gruvbox")

require("barbecue").setup({
	theme = "auto",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
