local null_ls = require("null-ls")
local u = require("null-ls.utils")

null_ls.setup({
	sources = {
		null_ls.builtins.diagnostics.mypy.with({
			extra_args = function(params)
				local args = {}

				-- Find project root using same patterns as mypy's cwd
				local root = u.root_pattern("pyproject.toml", "mypy.ini", ".mypy.ini", "setup.cfg")(params.bufname)

				if root then
					-- Check for uv's .venv in project root
					local venv_python = root .. "/.venv/bin/python"
					if vim.fn.executable(venv_python) == 1 then
						table.insert(args, "--python-executable")
						table.insert(args, venv_python)
					end
				elseif os.getenv("VIRTUAL_ENV") then
					-- Fallback to VIRTUAL_ENV if set
					table.insert(args, "--python-executable")
					table.insert(args, os.getenv("VIRTUAL_ENV") .. "/bin/python")
				end

				return args
			end,
		}),
	},
})
