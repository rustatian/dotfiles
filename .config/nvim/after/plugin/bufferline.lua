require("bufferline").setup({
	options = {
		diagnostics = "nvim_lsp",
		color_icons = true,
		show_buffer_close_icons = true,
		show_close_icon = true,
		show_buffer_icons = true,
		offsets = {
			{
				filetype = "NvimTree",
				text = "File Explorer",
				highlight = "Directory",
			},
		},
	},
	highlights = require("catppuccin.special.bufferline").get_theme(),
})
