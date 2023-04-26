-- theme
require('onedark').setup {
    style = 'darker',
    code_style = {
        comments = 'none',
        keywords = 'none',
        functions = 'none',
        strings = 'none',
        variables = 'none'
    },
}

require('onedark').load()

-- lualine
require('lualine').setup {
    options = {
	icons_enabled = true,
	theme = 'onedark',
	component_separator = '|',
	section_separator = '',
    }
}
