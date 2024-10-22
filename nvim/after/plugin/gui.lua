vim.o.background = "dark"
vim.cmd.hi("Comment gui=none")

require("barbecue").setup({
	theme = "auto",
	attach_navic = false, -- prevent barbecue from automatically attaching nvim-navic
})
