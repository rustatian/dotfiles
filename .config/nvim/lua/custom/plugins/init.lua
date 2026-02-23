return {
	----------
	-- Sys  --
	----------
	{
		"folke/lazydev.nvim",
		opts = {
			library = { "nvim-dap-ui" },
		},
	},
	{
		"nvim-neotest/nvim-nio",
	},

	-------------
	-- Folding --
	-------------
	{
		"kevinhwang91/nvim-ufo",
		dependencies = {
			"kevinhwang91/promise-async",
		},
	},

	---------
	-- C++ --
	---------
	{
		"p00f/clangd_extensions.nvim",
		lazy = true,
		opts = {
			inlay_hints = {
				inline = false,
			},
			ast = {
				role_icons = {
					type = "",
					declaration = "",
					expression = "",
					specifier = "",
					statement = "",
					["template argument"] = "",
				},
				kind_icons = {
					Compound = "",
					Recovery = "",
					TranslationUnit = "",
					PackExpansion = "",
					TemplateTypeParm = "",
					TemplateTemplateParm = "",
					TemplateParamObject = "",
				},
			},
		},
	},

	---------
	-- Zig --
	---------
	{
		"ziglang/zig.vim",
		ft = "zig",
	},

	-----------------------
	-- GUI enhancements --
	-----------------------
	{
		"scottmckendry/cyberdream.nvim",
		lazy = false,
		priority = 1000000,
	},
	{
		"stevearc/dressing.nvim",
		opts = {},
	},
	{
		"folke/todo-comments.nvim",
		event = "VimEnter",
		dependencies = { "nvim-lua/plenary.nvim" },
		opts = { signs = true },
	},
	{
		"nvim-telescope/telescope-ui-select.nvim",
	},
	{
		"utilyre/barbecue.nvim",
		name = "barbecue",
		version = "*",
		dependencies = {
			"SmiteshP/nvim-navic",
			"nvim-tree/nvim-web-devicons", -- optional dependency
		},
	},
	{
		"akinsho/bufferline.nvim",
		version = "*",
		dependencies = "nvim-tree/nvim-web-devicons",
	},
	{
		"j-hui/fidget.nvim",
	},

	{
		"nvim-tree/nvim-web-devicons",
		enabled = true,
	},
	{
		"nvim-treesitter/nvim-treesitter",
		lazy = false,
		branch = "main",
		build = ":TSUpdate",
	},

	"nvim-treesitter/nvim-treesitter-context",
	{
		"stevearc/conform.nvim",
	},
	--------------
	-- Snippers --
	--------------
	{
		"L3MON4D3/LuaSnip",
		version = "v2.*",
	},
	"rafamadriz/friendly-snippets",
	"github/copilot.vim",

	-------------------
	-- Autocopletion --
	-------------------
	{
		"saghen/blink.cmp",
		version = "1.*",
		lazy = false,
		config = function()
			-- Setup done in after/plugin/cmp.lua
		end,
	},

	-------------------------
	--- LSP configuration ---
	-------------------------
	{
		"williamboman/mason.nvim",
		build = ":MasonUpdate", -- :MasonUpdate updates registry contents
	},
	{
		"neovim/nvim-lspconfig",
	},
	"williamboman/mason-lspconfig.nvim",

	-------------------
	--  Diagnostic   --
	-------------------
	"folke/trouble.nvim",
	{
		"nvimtools/none-ls.nvim",
		dependencies = { "nvim-lua/plenary.nvim" },
	},

	-----------
	-- Debug --
	-----------
	{
		"mfussenegger/nvim-dap",
	},
	{
		"rcarriga/nvim-dap-ui",
		dependencies = { "mfussenegger/nvim-dap", "nvim-neotest/nvim-nio" },
	},
	{
		"theHamsta/nvim-dap-virtual-text",
	},
	{
		"jay-babu/mason-nvim-dap.nvim",
		dependencies = { "williamboman/mason.nvim", "mfussenegger/nvim-dap" },
	},
	{
		"leoluz/nvim-dap-go",
		ft = "go",
	},
	{
		"mfussenegger/nvim-dap-python",
		ft = "python",
	},

	{ -- Useful plugin to show you pending keybinds.
		"folke/which-key.nvim",
		event = "VimEnter", -- Sets the loading event to 'VimEnter'
		config = function() -- This is the function that runs, AFTER loading
			require("which-key").setup()

			-- Document existing key chains
			require("which-key").add({
				{ "<leader>c", group = "[C]ode" },
				{ "<leader>c_", hidden = true },
				{ "<leader>h", group = "[H]unk (Git)" },
				{ "<leader>h_", hidden = true },
				{ "<leader>r", group = "[R]ename" },
				{ "<leader>r_", hidden = true },
				{ "<leader>s", group = "[S]earch" },
				{ "<leader>s_", hidden = true },
				{ "<leader>t", group = "[T]oggle" },
				{ "<leader>t_", hidden = true },
				{ "<leader>w", group = "[W]orkspace" },
				{ "<leader>w_", hidden = true },
			})
		end,
	},

	----------
	-- Tree --
	----------
	{
		"nvim-telescope/telescope.nvim",
		dependencies = {
			"nvim-lua/plenary.nvim",
			{
				"nvim-telescope/telescope-fzf-native.nvim",
				build = "make",
			},
		},
	},

	{
		"nvim-tree/nvim-tree.lua",
		dependencies = "nvim-tree/nvim-web-devicons",
	},

	-----------
	-- Other --
	-----------

	-- Autopairs
	{
		"windwp/nvim-autopairs",
		event = "InsertEnter",
		config = function()
			require("nvim-autopairs").setup({})
		end,
	},

	-- Git
	{
		"lewis6991/gitsigns.nvim",
		event = { "BufReadPre", "BufNewFile" },
	},

	{
		"lukas-reineke/indent-blankline.nvim",
		main = "ibl",
		opts = {
			indent = {
				highlight = {
					"WhiteSpace",
				},
				char = "┊",
			},
			scope = {
				show_start = false,
				show_end = false,
				char = "┊",
				highlight = {
					"IndentBlanklineChar",
				},
			},
		},
	},

	"tpope/vim-fugitive",

	-- Comment
	{
		"numToStr/Comment.nvim",
		event = { "BufReadPre", "BufNewFile" },
		config = function()
			require("Comment").setup()
		end,
	},
	{ -- Collection of various small independent plugins/modules
		"echasnovski/mini.nvim",
		version = "*",
		config = function()
			-- Better Around/Inside textobjects
			--
			-- Examples:
			--  - va)  - [V]isually select [A]round [)]paren
			--  - yinq - [Y]ank [I]nside [N]ext [']quote
			--  - ci'  - [C]hange [I]nside [']quote
			require("mini.ai").setup({ n_lines = 500 })

			-- Add/delete/replace surroundings (brackets, quotes, etc.)
			--
			-- - saiw) - [S]urround [A]dd [I]nner [W]ord [)]Paren
			-- - sd'   - [S]urround [D]elete [']quotes
			-- - sr)'  - [S]urround [R]eplace [)] [']
			require("mini.surround").setup()

			-- mini statusline: https://github.com/echasnovski/mini.nvim/blob/main/readmes/mini-statusline.md
			require("mini.statusline").setup({
				content = {
					active = function()
						local mode, mode_hl = MiniStatusline.section_mode({ trunc_width = 120 })
						local git           = MiniStatusline.section_git({ trunc_width = 40 })
						local diff          = MiniStatusline.section_diff({ trunc_width = 75 })
						local diagnostics   = MiniStatusline.section_diagnostics({ trunc_width = 75 })
						local lsp           = MiniStatusline.section_lsp({ trunc_width = 75 })
						local filename      = MiniStatusline.section_filename({ trunc_width = 140 })
						local fileinfo      = MiniStatusline.section_fileinfo({ trunc_width = 120 })
						local location      = MiniStatusline.section_location({ trunc_width = 75 })
						local search        = MiniStatusline.section_searchcount({ trunc_width = 75 })

						-- Prepend file icon from nvim-web-devicons to filename
						local icon = require("nvim-web-devicons").get_icon(vim.fn.expand("%:t")) or ""
						if icon ~= "" then
							filename = icon .. " " .. filename
						end

						return MiniStatusline.combine_groups({
							{ hl = mode_hl,                  strings = { mode } },
							{ hl = "MiniStatuslineDevinfo",  strings = { git, diff, diagnostics, lsp } },
							"%<",
							{ hl = "MiniStatuslineFilename", strings = { filename } },
							"%=",
							{ hl = "MiniStatuslineFileinfo", strings = { fileinfo } },
							{ hl = mode_hl,                  strings = { search, location } },
						})
					end,
				},
			})
		end,
	},
}
