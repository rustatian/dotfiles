require'onedarkpro'.setup({})
require'onedarkpro'.load()
vim.cmd("colorscheme onedark_dark")

-- lualine
require('lualine').setup {
    options = {
	icons_enabled = true,
	theme = 'onedark_dark',
	component_separator = '|',
	section_separator = '',
    }
}

require("barbecue").setup({
  attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
