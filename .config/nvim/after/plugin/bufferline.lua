local function setup_bufferline()
	require("bufferline").setup({
		options = {
			diagnostics = "nvim_lsp",
			color_icons = true,
			show_buffer_close_icons = true,
			show_close_icon = true,
			show_buffer_icons = true,
				offsets = {
					{
						filetype = "NvimTree",
						text = "File Explorer",
						highlight = "Directory",
						separator = true,
					},
				},
		},
	})
end

local function get_bg(name)
	local ok, hl = pcall(vim.api.nvim_get_hl, 0, { name = name, link = false })
	if not ok or not hl then
		return "NONE"
	end
	return hl.bg or "NONE"
end

local function sync_icon_backgrounds()
	local bg = get_bg("BufferLineBackground")
	local bg_selected = get_bg("BufferLineBufferSelected")

	for _, name in ipairs(vim.fn.getcompletion("BufferLineDevIcon", "highlight")) do
		local ok, hl = pcall(vim.api.nvim_get_hl, 0, { name = name, link = false })
		if ok and hl and not vim.tbl_isempty(hl) then
			hl.bg = name:find("Selected", 1, true) and bg_selected or bg
			vim.api.nvim_set_hl(0, name, hl)
		end
	end
end

setup_bufferline()

local group = vim.api.nvim_create_augroup("BufferlineThemeSync", { clear = true })
vim.api.nvim_create_autocmd("ColorScheme", {
	group = group,
	callback = function()
		setup_bufferline()
		vim.schedule(sync_icon_backgrounds)
	end,
})
