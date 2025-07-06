require("trouble").setup({
	signs = {
		-- icons / text used for a diagnostic
		error = "",
		warning = "",
		hint = "",
		information = "",
		other = "",
	},
	use_diagnostic_signs = true, -- enabling this will use the signs defined in your lsp client
})
