return {
	----------
	-- Sys  --
	----------
	{
		-- SHOULD BE SETUP BEFORE lspconfig
		"folke/neodev.nvim",
	},

	----------
	-- Rust --
	----------
	{
		"saecki/crates.nvim",
		version = "*",
		dependencies = "nvim-lua/plenary.nvim",
		config = function()
			require("crates").setup()
		end,
	},

	-----------------------
	-- GUI enhancements --
	-----------------------
	{
		"folke/todo-comments.nvim",
		event = "VimEnter",
		dependencies = { "nvim-lua/plenary.nvim" },
		opts = { signs = false },
	},

	{ -- Collection of various small independent plugins/modules
		"echasnovski/mini.nvim",
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

			-- Simple and easy statusline.
			--  You could remove this setup call if you don't like it,
			--  and try some other statusline plugin
			local statusline = require("mini.statusline")
			statusline.setup()

			-- You can configure sections in the statusline by overriding their
			-- default behavior. For example, here we disable the section for
			-- cursor information because line numbers are already enabled
			---@diagnostic disable-next-line: duplicate-set-field
			statusline.section_location = function()
				return ""
			end

			-- ... and there is more!
			--  Check out: https://github.com/echasnovski/mini.nvim
		end,
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
		"nvim-lualine/lualine.nvim",
		dependencies = "nvim-tree/nvim-web-devicons",
	},
	{
		"folke/tokyonight.nvim",
		lazy = false,
		priority = 1000,
	},
	{
		"j-hui/fidget.nvim",
	},
	"nvim-tree/nvim-web-devicons",
	"nvim-treesitter/nvim-treesitter-context",
	"j-hui/fidget.nvim",
	"onsails/lspkind.nvim",
	{
		"stevearc/conform.nvim",
		opts = {},
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
	"saadparwaiz1/cmp_luasnip",

	-------------------
	-- Autocopletion --
	-------------------
	"hrsh7th/nvim-cmp",
	"hrsh7th/cmp-buffer",
	"hrsh7th/cmp-path",
	"hrsh7th/cmp-nvim-lsp",
	"hrsh7th/cmp-nvim-lua",

	-------------------
	--  Diagnostic   --
	-------------------
	"folke/trouble.nvim",

	---------------
	-- Debugging --
	---------------
	"mfussenegger/nvim-dap",
	{
		"rcarriga/nvim-dap-ui",
		dependencies = "mfussenegger/nvim-dap",
	},
	"theHamsta/nvim-dap-virtual-text",

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

	-- WakaTime
	{ "wakatime/vim-wakatime", lazy = false },
}
