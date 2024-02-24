-----------------------
-- LSP configuration --
-----------------------
return {
	{
		"williamboman/mason.nvim",
		build = ":MasonUpdate", -- :MasonUpdate updates registry contents
	},
	{
		"neovim/nvim-lspconfig",
	},
	"williamboman/mason-lspconfig.nvim",
}
