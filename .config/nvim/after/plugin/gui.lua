require("darcula").setup({
	opt = {
		integrations = {
			telescope = true,
			snacks = true,
			lualine = true,
			lsp_semantics_token = true,
			nvim_cmp = true,
			dap_nvim = true,
		},
	},
})

vim.cmd.colorscheme("darcula-solid")

require("barbecue").setup({
	theme = "auto",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
