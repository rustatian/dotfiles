require("cyberdream").setup({
	transparent = false,
	borderless_pickers = false,
	saturation = 1,
	cache = true,
	highlights = {
		TroubleNormal = { bg = "NONE", ctermbg = "NONE" },
		TroubleNormalNC = { bg = "NONE", ctermbg = "NONE" },
		WinSeparator = { fg = "#3c4048", bg = "NONE" },
		IndentBlanklineChar = { fg = "#7b8496" },
		TreesitterContext = { bg = "#232429" },
		TreesitterContextLineNumber = { bg = "#232429" },
		TreesitterContextBottom = { bg = "#232429" },
		CursorLineNr = { fg = "#ffffff" },
	},
})

vim.cmd("colorscheme cyberdream")
vim.api.nvim_set_hl(0, "@lsp.mod.readonly", { link = "@constant" })
vim.api.nvim_set_hl(0, "@lsp.typemod.variable.readonly", { link = "@constant" })
vim.api.nvim_set_hl(0, "@lsp.mod.deprecated", { link = "DiagnosticDeprecated" })

require("barbecue").setup({
	theme = "cyberdream",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
