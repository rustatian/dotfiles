local set = vim.opt

vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

vim.g.mapleader = '\\'
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- set termguicolors to enable highlight groups
vim.opt.termguicolors = true

set.encoding = 'UTF-8'
set.mouse = 'a'
set.number = true
set.relativenumber = true
set.clipboard = 'unnamedplus'
set.bg = 'dark'
set.splitright = true
set.splitbelow = true
set.termguicolors = true

set.guifont = "Berkeley Mono:h3"

vim.opt.runtimepath:append("/home/valery/.config/nvim/lua/users")

require'nvim-treesitter.configs'.setup {
	parser_install_dir = "/home/valery/.config/nvim/lua/users",
}
