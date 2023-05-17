
vim.keymap.set("n", "<C-n>", ":NvimTreeToggle<CR>", { noremap = true, silent = true })

require("nvim-tree").setup({
  sort_by = "case_sensitive",
        diagnostics = {
        enable = false,
        show_on_dirs = false,
        show_on_open_dirs = true,
        debounce_delay = 50,
        severity = {
          min = vim.diagnostic.severity.HINT,
          max = vim.diagnostic.severity.ERROR,
        },
        icons = {
          hint = "",
          info = "",
          warning = "",
          error = "",
        },
      },
  renderer = {
    group_empty = true,
  },
  filters = {
    dotfiles = false,
    git_clean = false,
    exclude = { ".git", "target", },
  },
})

