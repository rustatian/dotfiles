# Neovim Keybindings

Leader key: `;`

## General

| Keybind | Action |
|---------|--------|
| `<Esc>` | Clear search highlight |

## Navigation

| Keybind | Action |
|---------|--------|
| `<C-n>` | Toggle file tree |
| `<C-L>` | Next buffer |
| `<C-H>` | Previous buffer |

## Telescope (Search)

| Keybind | Action |
|---------|--------|
| `<leader>?` | Find recently opened files |
| `<leader>/` | Fuzzy search in current buffer |
| `<leader>sf` | Search files (including hidden) |
| `<leader>sh` | Search help tags |
| `<leader>sw` | Search current word (grep) |
| `<leader>sg` | Live grep search |
| `<leader>sd` | Search diagnostics |
| `<leader>sb` | Search buffers |

## LSP

| Keybind | Action |
|---------|--------|
| `gd` | Go to definition |
| `gD` | Go to declaration |
| `gr` | Go to references |
| `gI` | Go to implementation |
| `K` | Hover documentation |
| `<C-k>` | Signature help |
| `<leader>D` | Type definition |
| `<leader>ss` | Document symbols |
| `<leader>ws` | Workspace symbols |
| `<leader>rn` | Rename |
| `<leader>ca` | Code action |

## Diagnostics

| Keybind | Action |
|---------|--------|
| `<space>e` | Open diagnostic float |
| `<space>q` | Set diagnostic loclist |
| `[d` | Previous diagnostic |
| `]d` | Next diagnostic |

## Debug (DAP)

| Keybind | Action |
|---------|--------|
| `<leader>dc` | Continue/Start |
| `<leader>dx` | Exit/Terminate |
| `<leader>dr` | REPL toggle |
| `<leader>dl` | Run last |
| `<leader>db` | Toggle breakpoint |
| `<leader>dB` | Conditional breakpoint |
| `<leader>dp` | Log point |
| `<leader>do` | Step over |
| `<leader>di` | Step into |
| `<leader>dO` | Step out |
| `<leader>du` | Toggle UI |
| `<leader>de` | Eval expression |
| `<leader>dh` | Hover |
| `<leader>df` | Frames |
| `<leader>ds` | Scopes |
| `<leader>dt` | Debug test nearest |
| `<leader>dT` | Debug test last/class |

## Git (Gitsigns)

| Keybind | Action |
|---------|--------|
| `]c` | Next hunk |
| `[c` | Previous hunk |
| `<leader>hs` | Stage hunk |
| `<leader>hr` | Reset hunk |
| `<leader>hS` | Stage buffer |
| `<leader>hu` | Undo stage hunk |
| `<leader>hR` | Reset buffer |
| `<leader>hp` | Preview hunk |
| `<leader>hb` | Blame line |
| `<leader>hd` | Diff this |
| `<leader>hD` | Diff this (cached) |
| `<leader>tb` | Toggle current line blame |
| `<leader>td` | Toggle deleted |
| `ih` | Select hunk (text object) |

## Completion (blink.cmp)

| Keybind | Action |
|---------|--------|
| `<C-space>` | Show completion / toggle documentation |
| `<C-e>` | Hide completion |
| `<C-y>` | Select and accept |
| `<Up>` | Select previous item |
| `<Down>` | Select next item |
| `<C-p>` | Select previous item |
| `<C-n>` | Select next item |
| `<C-b>` | Scroll documentation up |
| `<C-f>` | Scroll documentation down |
| `<Tab>` | Snippet forward |
| `<S-Tab>` | Snippet backward |
| `<C-k>` | Show/hide signature |

## Copilot

| Keybind | Action |
|---------|--------|
| `<C-J>` | Accept suggestion (insert mode) |

## Mini.nvim

### Text Objects

| Keybind | Action |
|---------|--------|
| `va)` | Visually select around paren |
| `yinq` | Yank inside next quote |
| `ci'` | Change inside quote |

### Surround

| Keybind | Action |
|---------|--------|
| `saiw)` | Surround add inner word with paren |
| `sd'` | Surround delete quotes |
| `sr)'` | Surround replace ) with ' |
