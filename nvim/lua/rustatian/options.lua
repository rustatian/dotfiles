local set = vim.opt

vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

vim.g.mapleader = '\\'
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- set termguicolors to enable highlight groups
set.termguicolors = true

set.encoding = 'UTF-8'
set.mouse = 'a'
set.number = true
set.relativenumber = true
set.clipboard = 'unnamedplus'
set.splitright = true
set.splitbelow = true
set.termguicolors = true
set.showmatch = true
set.ignorecase = true
set.cursorline = true

local group = vim.api.nvim_create_augroup("CursorLineControl", { clear = true })
local set_cursorline = function(event, value, pattern)
  vim.api.nvim_create_autocmd(event, {
    group = group,
    pattern = pattern,
    callback = function()
      vim.opt_local.cursorline = value
    end,
  })
end
set_cursorline("WinLeave", false)
set_cursorline("WinEnter", true)
set_cursorline("FileType", false, "TelescopePrompt")


----------
-- TABS --
----------
vim.autoindent = true
vim.cindent = true
vim.wrap = true

vim.tabstop = 4

vim.breakindent = true

------------------------
-- Tree-Sitter config --
------------------------
set.runtimepath:append("/home/valery/.config/nvim/treesitter")

require'nvim-treesitter.configs'.setup {
	parser_install_dir = "/home/valery/.config/nvim/treesitter",
}

