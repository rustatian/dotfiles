require("nvim-treesitter").setup({
	-- Directory to install parsers and queries to (prepended to `runtimepath` to have priority)
	install_dir = os.getenv("HOME") .. "/.config/treesitter",
})

require("nvim-treesitter").install({
	"make",
	"html",
	"bash",
	"yaml",
	"markdown",
	"dockerfile",
	"php",
	"python",
	"lua",
	"rust",
	"c",
	"cpp",
	"go",
	"gomod",
	"gosum",
	"toml",
	"yaml",
	"yml",
	"json",
	"lua",
	"python",
	"zig",
	"rust",
	"typescript",
	"javascript",
})

vim.api.nvim_create_autocmd("FileType", {
	pattern = {
		"make",
		"html",
		"bash",
		"zig",
		"yaml",
		"markdown",
		"dockerfile",
		"php",
		"python",
		"lua",
		"rust",
		"c",
		"cpp",
		"go",
		"gomod",
		"gosum",
		"toml",
		"yaml",
		"yml",
		"json",
		"lua",
		"python",
		"rust",
		"typescript",
		"javascript",
	},
	callback = function()
		vim.treesitter.start()
		-- folds, provided by Neovim
		vim.wo.foldexpr = "v:lua.vim.treesitter.foldexpr()"
		vim.wo.foldmethod = "expr"
		-- indentation, provided by nvim-treesitter
		vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
	end,
})

-- Treesitter context
require("treesitter-context").setup({
	enable = true, -- Enable this plugin (Can be enabled/disabled later via commands)
	max_lines = 5, -- How many lines the window should span. Values <= 0 mean no limit.
	min_window_height = 0, -- Minimum editor window height to enable context. Values <= 0 mean no limit.
	line_numbers = true,
	multiline_threshold = 2, -- Maximum number of lines to collapse for a single context line
	multiwindow = false, -- Enable multiwindow support.
	trim_scope = "outer", -- Which context lines to discard if `max_lines` is exceeded. Choices: 'inner', 'outer'
	mode = "cursor", -- Line used to calculate context. Choices: 'cursor', 'topline'
	-- Separator between context and content. Should be a single character string, like '-'.
	-- When separator is set, the context will only show up when there are at least 2 lines above cursorline.
	separator = nil,
	zindex = 20, -- The Z-index of the context window
})
