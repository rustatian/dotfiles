require("onedark").setup({
	style = "dark", -- dark, darker, cool, deep, warm, warmer, light
	transparent = false,
	term_colors = true,
	code_style = {
		comments = "none",
		keywords = "none",
		functions = "none",
		strings = "none",
		variables = "none",
	},
	diagnostics = {
		darker = true,
		undercurl = true,
		background = true,
	},
})
require("onedark").load()

require("barbecue").setup({
	theme = "auto",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
