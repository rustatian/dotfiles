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
		opts = { signs = true },
	},
	{
		"nvim-telescope/telescope-ui-select.nvim",
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
			-- set use_icons to true if you have a Nerd Font
			statusline.setup({ use_icons = vim.g.have_nerd_font })

			-- You can configure sections in the statusline by overriding their
			-- default behavior. For example, here we set the section for
			-- cursor location to LINE:COLUMN
			---@diagnostic disable-next-line: duplicate-set-field
			statusline.section_location = function()
				return "%2l:%-2v"
			end
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
		"navarasu/onedark.nvim",
		lazy = false,
		priority = 1000,
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

	{ -- Useful plugin to show you pending keybinds.
		"folke/which-key.nvim",
		event = "VimEnter", -- Sets the loading event to 'VimEnter'
		config = function() -- This is the function that runs, AFTER loading
			require("which-key").setup()

			-- Document existing key chains
			require("which-key").register({
				["<leader>c"] = { name = "[C]ode", _ = "which_key_ignore" },
				["<leader>d"] = { name = "[D]ocument", _ = "which_key_ignore" },
				["<leader>r"] = { name = "[R]ename", _ = "which_key_ignore" },
				["<leader>s"] = { name = "[S]earch", _ = "which_key_ignore" },
				["<leader>w"] = { name = "[W]orkspace", _ = "which_key_ignore" },
			})
		end,
	},

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
