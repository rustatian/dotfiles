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
  ---------------------
  -- Package manager --
  ---------------------
  use ({'wbthomason/packer.nvim'})
  use ({"nvim-treesitter/nvim-treesitter", run = ":TSUpdate"})
  
  --------
  -- Go --
  --------
  use ({'ray-x/go.nvim'})
  use ({'ray-x/guihua.lua'}) -- recommended if need floating window support
  use ({"folke/neodev.nvim"})
  use ({'leoluz/nvim-dap-go'})

  ----------
  -- Rust --
  ----------
  use ({'rust-lang/rust.vim'})
  use ({'simrat39/rust-tools.nvim'})

  ---------------------
  -- GUI enhancement --
  --------------------- 
  use ({
  	'nvim-lualine/lualine.nvim',
  	requires = { 'nvim-tree/nvim-web-devicons', opt = true }
  })
  use ({'navarasu/onedark.nvim'})
  use ({'akinsho/bufferline.nvim', tag = "v3.*", requires = 'nvim-tree/nvim-web-devicons'})
  use ({'nvim-tree/nvim-web-devicons'})
  use ({'nvim-treesitter/nvim-treesitter-context'})

  -----------------------
  -- LSP configuration --
  -----------------------
  use ({
    "williamboman/mason.nvim",
    run = ":MasonUpdate" -- :MasonUpdate updates registry contents
  })
  use ({"neovim/nvim-lspconfig"})
  use ({'williamboman/mason-lspconfig.nvim'})
  if packer_bootstrap then
    require('packer').sync()
  end

  --------------
  -- Snippers --
  --------------
  use ({'L3MON4D3/LuaSnip'})
  use ({'rafamadriz/friendly-snippets'})
  use ({"github/copilot.vim"})

  -------------------
  -- Autocopletion --
  -------------------
  use ({'hrsh7th/nvim-cmp'})
  use ({'hrsh7th/cmp-buffer'})
  use ({'hrsh7th/cmp-path'})
  use ({'saadparwaiz1/cmp_luasnip'})
  use ({'hrsh7th/cmp-nvim-lsp'})
  use ({'hrsh7th/cmp-nvim-lua'})
  use ({
    "folke/trouble.nvim",
      config = function()
          require("trouble").setup {
              icons = true,
          }
      end
  })

  ---------------
  -- Debugging --
  ---------------
  use ({'mfussenegger/nvim-dap'})
  use ({"rcarriga/nvim-dap-ui", requires = {"mfussenegger/nvim-dap"} })
  use ({'theHamsta/nvim-dap-virtual-text'})
  
  ----------
  -- Tree --
  ----------
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
    require("nvim-tree").setup{}
  end
  })

  -----------
  -- Other --
  -----------

  -- Autopairs
  use ({
	"windwp/nvim-autopairs",
	config = function() require("nvim-autopairs").setup {} end
  })

  -- Git
  use ({'lewis6991/gitsigns.nvim'})

end)
