return {
  ----------
  -- Rust --
  ----------
  'rust-lang/rust.vim',
  'simrat39/rust-tools.nvim',
  {
    'saecki/crates.nvim',
    version = 'v0.*',
    dependencies = 'nvim-lua/plenary.nvim',
    config = function()
        require('crates').setup()
    end,
  },

  -----------------------
  -- GUI enhancements --
  -----------------------

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
	'nvim-lualine/lualine.nvim',
  	dependencies = 'nvim-tree/nvim-web-devicons',
  },
  {
	'akinsho/bufferline.nvim', 
	version = "v3.*", 
	dependencies = 'nvim-tree/nvim-web-devicons',
  },
  {
  	"olimorris/onedarkpro.nvim",
  	priority = 1001 -- Ensure it loads first
  },
  'folke/tokyonight.nvim',
  'nvim-tree/nvim-web-devicons',
  'nvim-treesitter/nvim-treesitter-context',
  'onsails/lspkind.nvim',
  'tjdevries/express_line.nvim',
  'j-hui/fidget.nvim',

  --------------
  -- Snippers --
  --------------
  {
	"L3MON4D3/LuaSnip",
	-- follow latest release.
	version = "v1.*", -- Replace <CurrentMajor> by the latest released major (first number of latest release)
	-- install jsregexp (optional!:).
	build = "make install_jsregexp",
  },
  'rafamadriz/friendly-snippets',
  "github/copilot.vim",

  -------------------
  -- Autocopletion --
  -------------------
  'hrsh7th/nvim-cmp',
  'hrsh7th/cmp-buffer',
  'hrsh7th/cmp-path',
  'hrsh7th/cmp-nvim-lsp',
  'hrsh7th/cmp-nvim-lua',
  {
    "folke/trouble.nvim",
    config = function()
          require("trouble").setup {
              icons = true,
          }
      end
  },

  ---------------
  -- Debugging --
  ---------------
  'mfussenegger/nvim-dap',
  {
	  "rcarriga/nvim-dap-ui", 
	  dependencies = "mfussenegger/nvim-dap", 
  },
  'theHamsta/nvim-dap-virtual-text',
  
  ----------
  -- Tree --
  ----------
  {
	 'nvim-telescope/telescope.nvim', 
	 version = '0.1.1',
	 dependencies = 'nvim-lua/plenary.nvim',
  },

  {
        'nvim-tree/nvim-tree.lua',
  	dependencies = 'nvim-tree/nvim-web-devicons',
  	config = function()
    		require("nvim-tree").setup()
  	end,
  },

  -----------
  -- Other --
  -----------

  -- Autopairs 
  {
	"windwp/nvim-autopairs",
	config = function() 
		require("nvim-autopairs").setup {} 
	end,
  },

  -- Git
 'lewis6991/gitsigns.nvim',

 -- Comment
 {
	 'numToStr/Comment.nvim',
	 config = function()
		 require('Comment').setup()
	 end
 },
}

