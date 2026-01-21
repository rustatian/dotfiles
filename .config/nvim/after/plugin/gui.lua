require("tokyonight").setup({
	-- use the night style
	style = "night",
	terminal_colors = true,
	-- disable italic for functions
	styles = {
		comments = { italic = false },
		keywords = { italic = false },
		functions = { italic = false },
		variables = { italic = false },
	},
	sidebars = "dark",
	floats = "dark",
	transparent = false,

	-- Change the "hint" color to the "orange" color, and make the "error" color bright red
	on_colors = function(colors)
		colors.hint = colors.orange
		colors.error = "#ff0000"
	end,
	on_highlights = function(hl, c)
		local prompt = "#2d3149"
		hl.TelescopeNormal = {
			bg = c.bg_dark,
			fg = c.fg_dark,
		}
		hl.TelescopeBorder = {
			bg = c.bg_dark,
			fg = c.bg_dark,
		}
		hl.TelescopePromptNormal = {
			bg = prompt,
		}
		hl.TelescopePromptBorder = {
			bg = prompt,
			fg = prompt,
		}
		hl.TelescopePromptTitle = {
			bg = prompt,
			fg = prompt,
		}
		hl.TelescopePreviewTitle = {
			bg = c.bg_dark,
			fg = c.bg_dark,
		}
		hl.TelescopeResultsTitle = {
			bg = c.bg_dark,
			fg = c.bg_dark,
		}
	end,
})

vim.cmd([[colorscheme tokyonight]])

require("barbecue").setup({
	theme = "tokyonight", -- theme
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
