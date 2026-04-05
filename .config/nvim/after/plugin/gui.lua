require("onedarkpro").setup({
	styles = {
		types = "NONE",
		methods = "NONE",
		numbers = "NONE",
		strings = "NONE",
		comments = "NONE",
		keywords = "NONE",
		constants = "NONE",
		functions = "NONE",
		operators = "NONE",
		variables = "NONE",
		parameters = "NONE",
		conditionals = "NONE",
		virtual_text = "NONE",
	},
	options = {
		cursorline = true,
		transparency = false,
		terminal_colors = true,
		highlight_inactive_windows = false,
	},
})

vim.o.background = "dark"
vim.cmd("colorscheme onedark")

require("barbecue").setup({
	theme = "auto",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
