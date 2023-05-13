require('onedark').setup {
    style = 'warmer',
    code_style = {
        comments = 'none',
        keywords = 'none',
        functions = 'none',
        strings = 'none',
        variables = 'none'
    },
    diagnostics = {
        darker = true, -- darker colors for diagnostic
        undercurl = true,   -- use undercurl instead of underline for diagnostics
        background = true,    -- use background color for virtual text
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
