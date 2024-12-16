local ok, lspkind = pcall(require, "lspkind")
if not ok then
	return
end

lspkind.init({
	-- defines how annotations are shown
	-- default: symbol
	-- options: 'text', 'text_symbol', 'symbol_text', 'symbol'
	mode = "symbol_text",

	-- default symbol map
	-- can be either 'default' (requires nerd-fonts font) or
	-- 'codicons' for codicon preset (requires vscode-codicons font)
	--
	-- default: 'default'
	preset = "default",

	-- override preset symbols
	--
	-- default: {}
	symbol_map = {
		Text = "󰉿",
		Method = "󰆧",
		Function = "󰊕",
		Copilot = "",
		Constructor = "",
		Field = "󰜢",
		Variable = "󰀫",
		Class = "󰠱",
		Interface = "",
		Module = "",
		Property = "󰜢",
		Unit = "󰑭",
		Value = "󰎠",
		Enum = "",
		Keyword = "󰌋",
		Snippet = "",
		Color = "󰏘",
		File = "󰈙",
		Reference = "󰈇",
		Folder = "󰉋",
		EnumMember = "",
		Constant = "󰏿",
		Struct = "󰙅",
		Event = "",
		Operator = "󰆕",
		TypeParameter = "",
	},
})

local luasnip = require("luasnip")
luasnip.config.setup({
	history = true,
	updateevents = "TextChanged,TextChangedI",
})

require("blink-cmp").setup({

	appearance = {
		-- Sets the fallback highlight groups to nvim-cmp's highlight groups
		-- Useful for when your theme doesn't support blink.cmp
		-- will be removed in a future release
		use_nvim_cmp_as_default = false,
		-- Set to 'mono' for 'Nerd Font Mono' or 'normal' for 'Nerd Font'
		-- Adjusts spacing to ensure icons are aligned
		nerd_font_variant = 'mono'
	},
	sources = {
		completion = {
			enabled_providers = { "lsp", "path", "snippets", "buffer", "lazydev" },
		},
		providers = {
			-- dont show LuaLS require statements when lazydev has items
			lsp = { fallback_for = { "lazydev" } },
			lazydev = { name = "LazyDev", module = "lazydev.integrations.blink" },
		},
	},

	-- experimental signature help support
	signature = {
		enabled = true,
		trigger = {
			blocked_trigger_characters = {},
			blocked_retrigger_characters = {},
			-- When true, will show the signature help window when the cursor comes after a trigger character when entering insert mode
			show_on_insert_on_trigger_character = true,
		},
		window = {
			min_width = 1,
			max_width = 100,
			max_height = 10,
			border = 'padded',
			winblend = 0,
			winhighlight = 'Normal:BlinkCmpSignatureHelp,FloatBorder:BlinkCmpSignatureHelpBorder',
			scrollbar = false, -- Note that the gutter will be disabled when border ~= 'none'
			-- Which directions to show the window,
			-- falling back to the next direction when there's not enough space,
			-- or another window is in the way
			direction_priority = { 'n', 's' },
			-- Disable if you run into performance issues
			treesitter_highlighting = true,
		},
	},
	documentation = {
		enabled = true,
		-- Controls whether the documentation window will automatically show when selecting a completion item
		auto_show = true,
		-- Delay before showing the documentation window
		auto_show_delay_ms = 500,
		-- Delay before updating the documentation window when selecting a new item,
		-- while an existing item is still visible
		update_delay_ms = 50,
		-- Whether to use treesitter highlighting, disable if you run into performance issues
		treesitter_highlighting = true,
		window = {
			min_width = 10,
			max_width = 60,
			max_height = 30,
			border = 'padded',
			winblend = 0,
			winhighlight =
			'Normal:BlinkCmpDoc,FloatBorder:BlinkCmpDocBorder,CursorLine:BlinkCmpDocCursorLine,Search:None',
			-- Note that the gutter will be disabled when border ~= 'none'
			scrollbar = true,
			-- Which directions to show the documentation window,
			-- for each of the possible menu window directions,
			-- falling back to the next direction when there's not enough space
			direction_priority = {
				menu_north = { 'e', 'w', 'n', 's' },
				menu_south = { 'e', 'w', 's', 'n' },
			},
		},
	},
	-- Displays a preview of the selected item on the current line
	ghost_text = {
		enabled = false,
	},
	menu = {
		enabled = true,
		min_width = 30,
		max_height = 50,
		border = 'none',
		winblend = 0,
		winhighlight =
		'Normal:BlinkCmpMenu,FloatBorder:BlinkCmpMenuBorder,CursorLine:BlinkCmpMenuSelection,Search:None',
		-- Keep the cursor X lines away from the top/bottom of the window
		scrolloff = 2,
		-- Note that the gutter will be disabled when border ~= 'none'
		scrollbar = true,
		-- Which directions to show the window,
		-- falling back to the next direction when there's not enough space
		direction_priority = { 's', 'n' },

		-- Whether to automatically show the window when new completion items are available
		auto_show = true,

		-- Screen coordinates of the command line
		cmdline_position = function()
			if vim.g.ui_cmdline_pos ~= nil then
				local pos = vim.g.ui_cmdline_pos -- (1, 0)-indexed
				return { pos[1] - 1, pos[2] }
			end
			local height = (vim.o.cmdheight == 0) and 1 or vim.o.cmdheight
			return { vim.o.lines - height, 0 }
		end,

		-- Controls how the completion items are rendered on the popup window
		draw = {
			-- Aligns the keyword you've typed to a component in the menu
			align_to_component = 'label', -- or 'none' to disable
			-- Left and right padding, optionally { left, right } for different padding on each side
			padding = 1,
			-- Gap between columns
			gap = 1,
			-- Use treesitter to highlight the label text of completions from these sources
			treesitter = {},
			-- Recommended to enable it just for the LSP source
			-- treesitter = { 'lsp' }

			-- Components to render, grouped by column
			columns = { { 'kind_icon' }, { 'label', 'label_description', gap = 1 } },
			-- for a setup similar to nvim-cmp: https://github.com/Saghen/blink.cmp/pull/245#issuecomment-2463659508
			-- columns = { { "label", "label_description", gap = 1 }, { "kind_icon", "kind" } },

			-- Definitions for possible components to render. Each component defines:
			--   ellipsis: whether to add an ellipsis when truncating the text
			--   width: control the min, max and fill behavior of the component
			--   text function: will be called for each item
			--   highlight function: will be called only when the line appears on screen
			components = {
				label = {
					width = { fill = true, max = 60 },
					text = function(ctx) return ctx.label .. ctx.label_detail end,
					highlight = function(ctx)
						-- label and label details
						local highlights = {
							{ 0, #ctx.label, group = ctx.deprecated and 'BlinkCmpLabelDeprecated' or 'BlinkCmpLabel' },
						}
						if ctx.label_detail then
							table.insert(highlights,
								{
									#ctx.label,
									#ctx.label + #ctx.label_detail,
									group =
									'BlinkCmpLabelDetail'
								})
						end

						-- characters matched on the label by the fuzzy matcher
						for _, idx in ipairs(ctx.label_matched_indices) do
							table.insert(highlights,
								{ idx, idx + 1, group = 'BlinkCmpLabelMatch' })
						end

						return highlights
					end,
				},

				label_description = {
					width = { max = 30 },
					text = function(ctx) return ctx.label_description end,
					highlight = 'BlinkCmpLabelDescription',
				},

				source_name = {
					width = { max = 30 },
					text = function(ctx) return ctx.source_name end,
					highlight = 'BlinkCmpSource',
				},
			},
		},
	},
})
