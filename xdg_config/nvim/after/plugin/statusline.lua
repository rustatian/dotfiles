-- TODO: Need to add those sweet sweet lsp workspace diagnostic counts

if not pcall(require, "el") then
  -- TODO: Add in a nice default statusline here.
  -- Would be good to research anyway for the course
  return
end

require("el").reset_windows()

vim.opt.laststatus = 3

if false then
  -- Disappearing statusline for commands
  vim.opt.cmdheight = 0

  vim.api.nvim_create_autocmd("ModeChanged", {
    group = vim.api.nvim_create_augroup("StatusDisappear", { clear = true }),
    callback = function()
      if vim.v.event.new_mode == "c" then

        vim.opt.laststatus = 0
      elseif vim.v.event.old_mode == "c" then
        vim.opt.laststatus = 3
      end

      pcall(vim.cmd, [[silent! redraw]])
    end,
  })
end

local builtin = require "el.builtin"

local extensions = require "el.extensions"
local sections = require "el.sections"
local subscribe = require "el.subscribe"
local lsp_statusline = require "el.plugins.lsp_status"
local helper = require "el.helper"
local diagnostic = require "el.diagnostic"

local has_lsp_extensions, ws_diagnostics = pcall(require, "lsp_extensions.workspace.diagnostic")


-- TODO: Spinning planet extension. Integrated w/ telescope.
-- ◐ ◓ ◑ ◒
-- 🌛︎🌝︎🌜︎🌚︎

-- Show telescope icon / emoji when you open it as well

local git_icon = subscribe.buf_autocmd("el_file_icon", "BufRead", function(_, bufnr)
  local icon = extensions.file_icon(_, bufnr)
  if icon then

    return icon .. " "
  end

  return ""
end)

local git_branch = subscribe.buf_autocmd("el_git_branch", "BufEnter", function(window, buffer)
  local branch = extensions.git_branch(window, buffer)
  if branch then
    return " " .. extensions.git_icon() .. " " .. branch

  end

end)


local git_changes = subscribe.buf_autocmd("el_git_changes", "BufWritePost", function(window, buffer)

  return extensions.git_changes(window, buffer)
end)


local ws_diagnostic_counts = function(_, buffer)

  if not has_lsp_extensions then
    return ""
  end

  local messages = {}

  local error_count = ws_diagnostics.get_count(buffer.bufnr, "Error")

  local x = "⬤"
  if error_count == 0 then
    -- pass
  elseif error_count < 5 then
    table.insert(messages, string.format("%s#%s#%s%%*", "%", "StatuslineError" .. error_count, x))
  else

    table.insert(messages, string.format("%s#%s#%s%%*", "%", "StatuslineError5", x))
  end

  return table.concat(messages, "")
end

local show_current_func = function(window, buffer)
  if buffer.filetype == "lua" then
    return ""
  end

  return lsp_statusline.current_function(window, buffer)
end

local minimal_status_line = function(_, buffer)
  if string.find(buffer.name, "sourcegraph/sourcegraph") then
    return true
  end
end

local is_sourcegraph = function(_, buffer)
  if string.find(buffer.name, "sg://") then
    return true
  end
end

local diagnostic_display = diagnostic.make_buffer()

require("el").setup {
  generator = function(window, buffer)
    local is_minimal = minimal_status_line(window, buffer)
    local is_sourcegraph = is_sourcegraph(window, buffer)

    local mode = extensions.gen_mode { format_string = " %s " }
    if is_sourcegraph then
      return {
        { mode },
        { sections.split, required = true },
        { builtin.file },
        { sections.split, required = true },
        { builtin.filetype },
      }
    end

    local items = {
      { mode, required = true },
      { git_branch },
      { " " },
      { sections.split, required = true },
      { git_icon },
      { sections.maximum_width(builtin.file_relative, 0.60), required = true },
      { sections.collapse_builtin { { " " }, { builtin.modified_flag } } },
      { sections.split, required = true },
      { diagnostic_display },
      { show_current_func },
      -- { lsp_statusline.server_progress },
      -- { ws_diagnostic_counts },
      { git_changes },
      { "[" },
      { builtin.line_with_width(3) },
      { ":" },
      { builtin.column_with_width(2) },
      { "]" },

      {
        sections.collapse_builtin {
          "[",
          builtin.help_list,
          builtin.readonly_list,
          "]",
        },
      },
      { builtin.filetype },
    }


    local add_item = function(result, item)
      if is_minimal and not item.required then
        return
      end

      table.insert(result, item)
    end


    local result = {}
    for _, item in ipairs(items) do
      add_item(result, item)
    end

    return result
  end,
}

require"fidget".setup{
  -- Options related to LSP progress subsystem
  progress = {
    poll_rate = 0,                -- How and when to poll for progress messages
    suppress_on_insert = false,   -- Suppress new messages while in insert mode
    ignore_done_already = false,  -- Ignore new tasks that are already complete
    ignore_empty_message = false, -- Ignore new tasks that don't contain a message
    clear_on_detach =             -- Clear notification group when LSP server detaches
      function(client_id)
        local client = vim.lsp.get_client_by_id(client_id)
        return client and client.name or nil
      end,
    notification_group =          -- How to get a progress message's notification group key
      function(msg) return msg.lsp_client.name end,
    ignore = {},                  -- List of LSP servers to ignore

    -- Options related to how LSP progress messages are displayed as notifications
    display = {
      render_limit = 16,          -- How many LSP messages to show at once
      done_ttl = 3,               -- How long a message should persist after completion
      done_icon = "✔",            -- Icon shown when all LSP progress tasks are complete
      done_style = "Constant",    -- Highlight group for completed LSP tasks
      progress_ttl = math.huge,   -- How long a message should persist when in progress
      progress_icon =             -- Icon shown when LSP progress tasks are in progress
        { pattern = "dots", period = 1 },
      progress_style =            -- Highlight group for in-progress LSP tasks
        "WarningMsg",
      group_style = "Title",      -- Highlight group for group name (LSP server name)
      icon_style = "Question",    -- Highlight group for group icons
      priority = 30,              -- Ordering priority for LSP notification group
      skip_history = true,        -- Whether progress notifications should be omitted from history
      format_message =            -- How to format a progress message
        require("fidget.progress.display").default_format_message,
      format_annote =             -- How to format a progress annotation
        function(msg) return msg.title end,
      format_group_name =         -- How to format a progress notification group's name
        function(group) return tostring(group) end,
      overrides = {               -- Override options from the default notification config
        rust_analyzer = { name = "rust-analyzer" },
      },
    },

    -- Options related to Neovim's built-in LSP client
    lsp = {
      progress_ringbuf_size = 0,  -- Configure the nvim's LSP progress ring buffer size
      log_handler = false,        -- Log `$/progress` handler invocations (for debugging)
    },
  },

  -- Options related to notification subsystem
  notification = {
    poll_rate = 10,               -- How frequently to update and render notifications
    filter = vim.log.levels.INFO, -- Minimum notifications level
    history_size = 128,           -- Number of removed messages to retain in history
    override_vim_notify = false,  -- Automatically override vim.notify() with Fidget
    configs =                     -- How to configure notification groups when instantiated
      { default = require("fidget.notification").default_config },
    redirect =                    -- Conditionally redirect notifications to another backend
      function(msg, level, opts)
        if opts and opts.on_open then
          return require("fidget.integration.nvim-notify").delegate(msg, level, opts)
        end
      end,

    -- Options related to how notifications are rendered as text
    view = {
      stack_upwards = true,       -- Display notification items from bottom to top
      icon_separator = " ",       -- Separator between group name and icon
      group_separator = "---",    -- Separator between notification groups
      group_separator_hl =        -- Highlight group used for group separator
        "Comment",
      render_message =            -- How to render notification messages
        function(msg, cnt)
          return cnt == 1 and msg or string.format("(%dx) %s", cnt, msg)
        end,
    },

    -- Options related to the notification window and buffer
    window = {
      normal_hl = "Comment",      -- Base highlight group in the notification window
      winblend = 100,             -- Background color opacity in the notification window
      border = "none",            -- Border around the notification window
      zindex = 45,                -- Stacking priority of the notification window
      max_width = 0,              -- Maximum width of the notification window
      max_height = 0,             -- Maximum height of the notification window
      x_padding = 1,              -- Padding from right edge of window boundary
      y_padding = 0,              -- Padding from bottom edge of window boundary
      align = "bottom",           -- How to align the notification window
      relative = "editor",        -- What the notification window position is relative to
    },
  },

  -- Options related to integrating with other plugins
  integration = {
    ["nvim-tree"] = {
      enable = true,              -- Integrate with nvim-tree/nvim-tree.lua (if installed)
    },
  },

  -- Options related to logging
  logger = {
    level = vim.log.levels.WARN,  -- Minimum logging level
    max_size = 10000,             -- Maximum log file size, in KB
    float_precision = 0.01,       -- Limit the number of decimals displayed for floats
    path =                        -- Where Fidget writes its logs to
      string.format("%s/fidget.nvim.log", vim.fn.stdpath("cache")),
  },
}
