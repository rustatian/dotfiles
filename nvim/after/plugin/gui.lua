require("catppuccin").setup({
	flavour = "mocha", -- latte, frappe, macchiato, mocha
	-- flavour = "auto" -- will respect terminal's background
	background = { -- :h background
		light = "latte",
		dark = "mocha",
	},
	transparent_background = false, -- disables setting the background color.
	show_end_of_buffer = false, -- shows the '~' characters after the end of buffers
	term_colors = true, -- sets terminal colors (e.g. `g:terminal_color_0`)
	dim_inactive = {
		enabled = false, -- dims the background color of inactive window
		shade = "dark",
		percentage = 0.15, -- percentage of the shade to apply to the inactive window
	},
	no_italic = false, -- Force no italic
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
		-- miscs = {}, -- Uncomment to turn off hard-coded styles
	},
	color_overrides = {
		latte = {
			rosewater = "#c14a4a",
			flamingo = "#c14a4a",
			red = "#c14a4a",
			maroon = "#c14a4a",
			pink = "#945e80",
			mauve = "#945e80",
			peach = "#c35e0a",
			yellow = "#b47109",
			green = "#6c782e",
			teal = "#4c7a5d",
			sky = "#4c7a5d",
			sapphire = "#4c7a5d",
			blue = "#45707a",
			lavender = "#45707a",
			text = "#654735",
			subtext1 = "#73503c",
			subtext0 = "#805942",
			overlay2 = "#8c6249",
			overlay1 = "#8c856d",
			overlay0 = "#a69d81",
			surface2 = "#bfb695",
			surface1 = "#d1c7a3",
			surface0 = "#e3dec3",
			base = "#f9f5d7",
			mantle = "#f0ebce",
			crust = "#e8e3c8",
		},
		mocha = {
			rosewater = "#ea6962",
			flamingo = "#ea6962",
			red = "#ea6962",
			maroon = "#ea6962",
			pink = "#d3869b",
			mauve = "#d3869b",
			peach = "#e78a4e",
			yellow = "#d8a657",
			green = "#a9b665",
			teal = "#89b482",
			sky = "#89b482",
			sapphire = "#89b482",
			blue = "#7daea3",
			lavender = "#7daea3",
			text = "#ebdbb2",
			subtext1 = "#d5c4a1",
			subtext0 = "#bdae93",
			overlay2 = "#a89984",
			overlay1 = "#928374",
			overlay0 = "#595959",
			surface2 = "#4d4d4d",
			surface1 = "#404040",
			surface0 = "#292929",
			base = "#1d2021",
			mantle = "#191b1c",
			crust = "#141617",
		},
	},
	highlight_overrides = {
		all = function(colors)
			return {
				CmpItemMenu = { fg = colors.surface2 },
				CursorLineNr = { fg = colors.text },
				FloatBorder = { bg = colors.base, fg = colors.surface0 },
				GitSignsChange = { fg = colors.peach },
				LineNr = { fg = colors.overlay0 },
				LspInfoBorder = { link = "FloatBorder" },
				NormalFloat = { bg = colors.base },
				Pmenu = { bg = colors.mantle, fg = "" },
				PmenuSel = { bg = colors.surface0, fg = "" },
				TelescopePreviewBorder = { bg = colors.crust, fg = colors.crust },
				TelescopePreviewNormal = { bg = colors.crust },
				TelescopePreviewTitle = { fg = colors.crust, bg = colors.crust },
				TelescopePromptBorder = { bg = colors.surface0, fg = colors.surface0 },
				TelescopePromptCounter = { fg = colors.mauve, style = { "bold" } },
				TelescopePromptNormal = { bg = colors.surface0 },
				TelescopePromptPrefix = { bg = colors.surface0 },
				TelescopePromptTitle = { fg = colors.surface0, bg = colors.surface0 },
				TelescopeResultsBorder = { bg = colors.mantle, fg = colors.mantle },
				TelescopeResultsNormal = { bg = colors.mantle },
				TelescopeResultsTitle = { fg = colors.mantle, bg = colors.mantle },
				TelescopeSelection = { bg = colors.surface0 },
				VertSplit = { bg = colors.base, fg = colors.surface0 },
				WhichKeyFloat = { bg = colors.mantle },
				YankHighlight = { bg = colors.surface2 },
				FidgetTitle = { fg = colors.peach },

				IblIndent = { fg = colors.surface0 },
				IblScope = { fg = colors.overlay0 },

				Boolean = { fg = colors.mauve },
				Number = { fg = colors.mauve },
				Float = { fg = colors.mauve },

				PreProc = { fg = colors.mauve },
				PreCondit = { fg = colors.mauve },
				Include = { fg = colors.mauve },
				Define = { fg = colors.mauve },
				Conditional = { fg = colors.red },
				Repeat = { fg = colors.red },
				Keyword = { fg = colors.red },
				Typedef = { fg = colors.red },
				Exception = { fg = colors.red },
				Statement = { fg = colors.red },

				Error = { fg = colors.red },
				StorageClass = { fg = colors.peach },
				Tag = { fg = colors.peach },
				Label = { fg = colors.peach },
				Structure = { fg = colors.peach },
				Operator = { fg = colors.peach },
				Title = { fg = colors.peach },
				Special = { fg = colors.yellow },
				SpecialChar = { fg = colors.yellow },
				Type = { fg = colors.yellow, style = { "bold" } },
				Function = { fg = colors.green, style = { "bold" } },
				Macro = { fg = colors.teal },
			}
		end,
	},
	custom_highlights = {},
	integrations = {
		cmp = true,
		gitsigns = true,
		nvimtree = true,
		treesitter = true,
		notify = false,
		mini = {
			enabled = true,
			indentscope_color = "",
		},
	},
})

vim.cmd([[colorscheme catppuccin]])
vim.cmd.hi("Comment gui=none")

require("barbecue").setup({
	theme = "catppuccin",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
