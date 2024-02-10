require("catppuccin").setup({
	flavour = "mocha", -- latte, frappe, macchiato, mocha
	background = { -- :h background
		light = "latte",
		dark = "mocha",
	},
	transparent_background = false, -- disables setting the background color.
	show_end_of_buffer = true, -- shows the '~' characters after the end of buffers
	term_colors = true, -- sets terminal colors (e.g. `g:terminal_color_0`)
	dim_inactive = {
		enabled = false, -- dims the background color of inactive window
		shade = "dark",
		percentage = 0.15, -- percentage of the shade to apply to the inactive window
	},
	no_italic = true, -- Force no italic
	no_bold = false, -- Force no bold
	no_underline = false, -- Force no underline
	styles = { -- Handles the styles of general hi groups (see `:h highlight-args`):
		comments = { "italic" }, -- Change the style of comments
		conditionals = { "italic" },
		loops = {},
		functions = {},
		keywords = {},
		strings = {},
		variables = {},
		numbers = {},
		booleans = {},
		properties = {},
		types = {},
		operators = {},
	},
	color_overrides = {},
	custom_highlights = {},
	integrations = {
		cmp = true,
		gitsigns = true,
		nvimtree = true,
		treesitter = true,
		treesitter_context = false,
		notify = true,
		mini = {
			enabled = true,
			indentscope_color = "",
		},
	},
})

-- setup must be called before loading
vim.cmd.colorscheme("catppuccin")

-- lualine
require("lualine").setup({
	options = {
		icons_enabled = true,
		theme = "catppuccin",
		component_separator = "|",
		section_separator = "",
	},
})

require("barbecue").setup({
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})

require("notify").setup()

require("ibl").setup({
	indent = { char = "" },
	whitespace = {
		remove_blankline_trail = false,
	},
	scope = { enabled = false },
})
