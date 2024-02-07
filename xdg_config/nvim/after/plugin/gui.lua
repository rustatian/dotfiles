vim.cmd[[colorscheme moonfly]]
vim.cmd[[hi WinSeparator guibg=None]]

-- lualine
require('lualine').setup {
    options = {
	icons_enabled = true,
	theme = 'auto',
	component_separator = '|',
	section_separator = '',
    }
}

require("barbecue").setup({
  attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})

require'notify'.setup()

require("ibl").setup {
    indent = { char = "" },
    whitespace = {
        remove_blankline_trail = false,
    },
    scope = { enabled = false },
}
