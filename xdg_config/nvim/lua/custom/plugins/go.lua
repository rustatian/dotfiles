return {
  {
	'ray-x/go.nvim',
	dependencies = {
  		'ray-x/guihua.lua', -- recommended if need floating window support
  		"folke/neodev.nvim",
  		'leoluz/nvim-dap-go',
	},
	build = ':lua require("go.install").update_all_sync()',
  },
}
