local fn = vim.fn

-- Automatically install packer
local install_path = fn.stdpath("data") .. "/site/pack/packer/start/packer.nvim"
if fn.empty(fn.glob(install_path)) > 0 then
  PACKER_BOOTSTRAP = fn.system({
    "git",
    "clone",
    "--depth",
    "1",
    "https://github.com/wbthomason/packer.nvim",
    install_path,
  })
  print("Installing packer close and reopen Neovim...")
  vim.cmd([[packadd packer.nvim]])
end


-- Autocommand that reloads neovim whenever you save the plugins.lua file
vim.cmd([[
  augroup packer_user_config
    autocmd!
    autocmd BufWritePost plugins.lua source <afile> | PackerSync
  augroup end
]])

local status_ok, packer = pcall(require, "packer")
if not status_ok then
  return
end

packer.init({
  display = {
    open_fn = function()
      return require("packer.util").float({ border = "rounded" })
    end,
  },
})

return require('packer').startup(function(use)
  --
  -- Package manager
  --
  use ({'wbthomason/packer.nvim'})
  use ({"nvim-treesitter/nvim-treesitter", run = ":TSUpdate"})
  
  --
  -- Go
  --
  use ({'ray-x/go.nvim'})
  use ({'ray-x/guihua.lua'}) -- recommended if need floating window support
  use ({"folke/neodev.nvim"})

  -- 
  -- GUI enhancement
  --
  use({
	'rose-pine/neovim',
	 as = 'rose-pine',
	 config = function()
		vim.cmd('colorscheme rose-pine')
	 end
  })
  use ({'akinsho/bufferline.nvim', tag = "v3.*", requires = 'nvim-tree/nvim-web-devicons'})
  use ({'nvim-tree/nvim-web-devicons'})

  --
  -- LSP configuration
  --
  use ({
    "williamboman/mason.nvim",
    run = ":MasonUpdate" -- :MasonUpdate updates registry contents
  })
  use ({"neovim/nvim-lspconfig"})
  use ({'williamboman/mason-lspconfig.nvim'})
  if packer_bootstrap then
    require('packer').sync()
  end
  use ({'simrat39/rust-tools.nvim'})

  --
  -- Snippers
  --
  use ({'L3MON4D3/LuaSnip'})
  use ({'rafamadriz/friendly-snippets'})
  use ({"github/copilot.vim"})

  --
  -- Autocopletion
  --
  use ({'hrsh7th/nvim-cmp'})
  use ({'hrsh7th/cmp-buffer'})
  use ({'hrsh7th/cmp-path'})
  use ({'saadparwaiz1/cmp_luasnip'})
  use ({'hrsh7th/cmp-nvim-lsp'})
  use ({'hrsh7th/cmp-nvim-lua'})
  use({
    "folke/trouble.nvim",
      config = function()
          require("trouble").setup {
              icons = true,
              -- your configuration comes here
              -- or leave it empty to use the default settings
              -- refer to the configuration section below
          }
      end
  })

  --
  -- Debugging
  --
  use ({'mfussenegger/nvim-dap'})
  use { "rcarriga/nvim-dap-ui", requires = {"mfussenegger/nvim-dap"} }
  
  --
  -- Tree
  --
  use ({
	 'nvim-telescope/telescope.nvim', tag = '0.1.1',
	  requires = { {'nvim-lua/plenary.nvim'} }
  })
  use ({
         'nvim-tree/nvim-tree.lua',
  requires = {
         'nvim-tree/nvim-web-devicons',
  },
  config = function()
    require("nvim-tree").setup {}
  end
  })

  --
  -- Other
  --
  -- Terminal
  use ({"akinsho/toggleterm.nvim", tag = '*', config = function()
  	require("toggleterm").setup()
  end })
  -- Autopairs
  use ({
	"windwp/nvim-autopairs",
	config = function() require("nvim-autopairs").setup {} end
  })

end)
