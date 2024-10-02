-- I am helpers.lua and I should live in ~/.config/wezterm/helpers.lua

local wezterm = require("wezterm")
local mux = wezterm.mux

-- This is the module table that we will export
local module = {}

wezterm.on("gui-startup", function(cmd) -- set startup Window position
	local tab, pane, window = mux.spawn_window(cmd or {
		position = {
			x = 1000,
			y = 700,
		},
	})
end)

-- define a function in the module table.
-- Only functions defined in `module` will be exported to
-- code that imports this module.
-- The suggested convention for making modules that update
-- the config is for them to export an `apply_to_config`
-- function that accepts the config object, like this:
function module.apply_to_config(config)
	config.font = wezterm.font("MonaspiceNe Nerd Font Propo", { weight = "Medium", italic = false })
	config.font_size = 14.0
	config.color_scheme = "tokyonight"
	config.line_height = 1
	config.cell_width = 1

	config.window_padding = {
		left = 0,
		right = 0,
		top = 0,
		bottom = 0,
	}

	config.webgpu_power_preference = "HighPerformance"
	config.window_close_confirmation = "NeverPrompt"
	config.enable_tab_bar = false
	config.use_fancy_tab_bar = false
	config.show_tabs_in_tab_bar = false
	config.show_new_tab_button_in_tab_bar = false
end

-- return our module table
return module
