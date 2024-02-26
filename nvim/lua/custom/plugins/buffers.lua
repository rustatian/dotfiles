return {
	"akinsho/bufferline.nvim",
	version = "v4.*",
	dependencies = "nvim-tree/nvim-web-devicons",
	config = function()
		require("bufferline").setup({
			options = {
				mode = "buffers", -- set to "tabs" to only show tabpages instead
				themable = false, -- allows highlight groups to be overriden i.e. sets highlights as default
				numbers = "both",
				close_command = "bdelete! %d", -- can be a string | function, | false see "Mouse actions"
				right_mouse_command = "bdelete! %d", -- can be a string | function | false, see "Mouse actions"
				left_mouse_command = "buffer %d", -- can be a string | function, | false see "Mouse actions"
				middle_mouse_command = nil, -- can be a string | function, | false see "Mouse actions"
				indicator = {
					icon = "▎", -- this should be omitted if indicator style is not 'icon'
					style = "none",
				},
				buffer_close_icon = "󰅖",
				modified_icon = "●",
				close_icon = "",
				left_trunc_marker = "",
				right_trunc_marker = "",
				max_name_length = 18,
				max_prefix_length = 15, -- prefix used when a buffer is de-duplicated
				truncate_names = true, -- whether or not tab names should be truncated
				tab_size = 20,
				diagnostics = "nvim_lsp",
				diagnostics_update_in_insert = false,
				-- The diagnostics indicator can be set to nil to keep the buffer name highlight but delete the highlighting
				diagnostics_indicator = function(count, level, diagnostics_dict, context)
					return "(" .. count .. ")"
				end,
				get_element_icon = function(element)
					-- element consists of {filetype: string, path: string, extension: string, directory: string}
					-- This can be used to change how bufferline fetches the icon
					-- for an element e.g. a buffer or a tab.
					-- e.g.
					local icon, hl =
						require("nvim-web-devicons").get_icon_by_filetype(element.filetype, { default = true })
					return icon, hl
				end,
				-- offsets = {
				-- 	{
				-- 		filetype = "NvimTree",
				-- 		text = "File Explorer",
				-- 		text_align = "center",
				-- 		highlight = "Directory",
				-- 		separator = true,
				-- 	},
				-- },
				color_icons = true, -- whether or not to add the filetype icon highlights
				show_buffer_close_icons = true,
				show_close_icon = true,
				show_tab_indicators = true,
				show_duplicate_prefix = true, -- whether to show duplicate buffer prefix
				persist_buffer_sort = true, -- whether or not custom sorted buffers should persist
				-- can also be a table containing 2 custom separators
				-- [focused and unfocused]. eg: { '|', '|' }
				separator_style = "thin",
				enforce_regular_tabs = true,
				always_show_bufferline = true,
				hover = {
					enabled = true,
					delay = 200,
					reveal = { "close" },
				},
			},
		})
	end,
}
