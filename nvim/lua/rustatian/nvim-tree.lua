require("nvim-tree").setup({
  sort_by = "case_sensitive",
  renderer = {
    group_empty = true,
  },
  filters = {
    dotfiles = true,
  },
})

----------------
-- Nvim-Tree ---
----------------

-- global
-- vim.api.nvim_set_keymap("n", "<C-h>", ":NvimTreeToggle<CR>", {silent = true, noremap = true})
