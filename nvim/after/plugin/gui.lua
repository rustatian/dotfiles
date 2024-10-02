require("tokyonight").setup({
	-- use the night style
	style = "night",
	-- disable italic for functions
	styles = {
		comments = {
			italic = false,
		},
		functions = {
			italic = false,
		},
		keywords = {
			italic = false,
		},
		variables = {
			italic = false,
		},
	},
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

-- setup must be called before loading
vim.o.background = "dark"
vim.cmd.hi("Comment gui=none")
vim.cmd([[colorscheme tokyonight]])

require("barbecue").setup({
	theme = "tokyonight",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
