return {
	----------
	-- Sys  --
	----------
	{
		"folke/lazydev.nvim",
	},
	{
		"nvim-neotest/nvim-nio",
	},

	----------
	--  AI  --
	----------
	{
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
		config = function() end,
		opts = {
			inlay_hints = {
				inline = false,
			},
			ast = {
				--These require codicons (https://github.com/microsoft/vscode-codicons)
				role_icons = {
					type = "",
					declaration = "",
					expression = "",
					specifier = "",
					statement = "",
					["template argument"] = "",
				},
				kind_icons = {
					Compound = "",
					Recovery = "",
					TranslationUnit = "",
					PackExpansion = "",
					TemplateTypeParm = "",
					TemplateTemplateParm = "",
					TemplateParamObject = "",
				},
			},
		},
	},

	---------
	-- Zig --
	---------
	{
		"ziglang/zig.vim",
	},

	-----------------------
	-- GUI enhancements --
	-----------------------
	{
		"ellisonleao/gruvbox.nvim",
		priority = 1000,
		config = true,
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
		"j-hui/fidget.nvim",
	},

	{
		"nvim-tree/nvim-web-devicons",
		enabled = true,
	},

	"nvim-treesitter/nvim-treesitter-context",
	"j-hui/fidget.nvim",
	"onsails/lspkind.nvim",
	{
		"stevearc/conform.nvim",
	},
	--------------
	-- Snippers --
	--------------
	{
		"L3MON4D3/LuaSnip",
		version = "v2.*",
		build = "make install_jsregexp",
	},
	"rafamadriz/friendly-snippets",
	"github/copilot.vim",

	-------------------
	-- Autocopletion --
	-------------------
	{
		"saghen/blink.cmp",
		version = 'v0.*',
		lazy = false, -- lazy loading handled internally
		-- optional: provides snippets for the snippet source
		dependencies = 'rafamadriz/friendly-snippets',

		-- use a release tag to download pre-built binaries
		opts = {
		},
	},

	-------------------
	--  Diagnostic   --
	-------------------
	"folke/trouble.nvim",
	{             -- Useful plugin to show you pending keybinds.
		"folke/which-key.nvim",
		event = "VimEnter", -- Sets the loading event to 'VimEnter'
		config = function() -- This is the function that runs, AFTER loading
			require("which-key").setup()

			-- Document existing key chains
			require("which-key").add({
				{ "<leader>c",  group = "[C]ode" },
				{ "<leader>c_", hidden = true },
				{ "<leader>d",  group = "[D]ocument" },
				{ "<leader>d_", hidden = true },
				{ "<leader>r",  group = "[R]ename" },
				{ "<leader>r_", hidden = true },
				{ "<leader>s",  group = "[S]earch" },
				{ "<leader>s_", hidden = true },
				{ "<leader>w",  group = "[W]orkspace" },
				{ "<leader>w_", hidden = true },
			})
		end,
	},

	----------
	-- Tree --
	----------
	{
		"nvim-telescope/telescope.nvim",
		dependencies = "nvim-lua/plenary.nvim",
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
		config = function()
			require("nvim-autopairs").setup({})
		end,
	},

	-- Git
	"lewis6991/gitsigns.nvim",
	"tpope/vim-fugitive",

	-- Comment
	{
		"numToStr/Comment.nvim",
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
			require("mini.statusline").setup()
		end,
	},
}
