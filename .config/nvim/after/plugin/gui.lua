require("catppuccin").setup({
	flavour = "mocha",
	term_colors = true,
	no_italic = true,
})
vim.o.background = "dark"
vim.cmd("colorscheme catppuccin-mocha")

require("barbecue").setup({
	theme = "auto",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
