local set = vim.opt

vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- inlay hints
vim.g.inlay_hints_visible = true

vim.g.mapleader = ";"
vim.g.maplocalleader = "\\"
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- Set highlight on search, but clear on pressing <Esc> in normal mode
vim.opt.hlsearch = true
vim.keymap.set("n", "<Esc>", "<cmd>nohlsearch<CR>")

-- save undo history
vim.o.undofile = true

-- case insensitive search
vim.o.ignorecase = true
vim.o.smartcase = true

-- decrease update time
vim.o.updatetime = 250
vim.wo.signcolumn = "yes"

-- fold text
vim.o.fillchars = [[eob: ,fold: ,foldopen:,foldsep: ,foldclose:,vert: ]]
vim.o.foldenable = true
vim.o.foldtext = ""
vim.o.foldcolumn = "0" -- '0' is not bad
vim.o.foldlevel = 99   -- Using ufo provider need a large value, feel free to decrease the value
vim.o.foldlevelstart = 99

-- set termguicolors to enable highlight groups
set.termguicolors = true

-- Preview substitutions live, as you type!
vim.opt.inccommand = "split"

-- theme
vim.g.moonflyNormalFloat = true
vim.g.moonflyTerminalColors = true

-- zig
vim.g.zig_fmt_autosave = true

-- splits
set.splitright = true
set.splitbelow = true

-- set how neovim will display the following chars
vim.opt.list = true
vim.opt.listchars = { tab = "» ", trail = "·", nbsp = "␣" }

set.encoding = "UTF-8"
set.mouse = "a"
set.number = true
set.relativenumber = true
set.clipboard = "unnamedplus"

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

local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/folke/lazy.nvim.git",
		"--branch=stable", -- latest stable release
		lazypath,
	})
end

vim.opt.rtp:prepend(lazypath)

require("lazy").setup("custom.plugins", {
	ui = {
		icons = {
			cmd = "⌘",
			config = "🛠",
			event = "📅",
			ft = "📂",
			init = "⚙",
			keys = "🗝",
			plugin = "🔌",
			runtime = "💻",
			source = "📄",
			start = "🚀",
			task = "📌",
		},
	},
})
