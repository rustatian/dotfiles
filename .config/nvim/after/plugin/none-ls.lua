local null_ls = require("null-ls")
local u = require("null-ls.utils")

null_ls.setup({
	sources = {
		-- Python type checking
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

		-- Spelling/typos
		null_ls.builtins.diagnostics.codespell,

		-- Makefile
		null_ls.builtins.diagnostics.checkmake,

		-- Markdown
		null_ls.builtins.diagnostics.markdownlint,

		-- YAML
		null_ls.builtins.diagnostics.yamllint,

		-- Security - detect secrets
		null_ls.builtins.diagnostics.gitleaks,

		-- Git commit messages
		null_ls.builtins.diagnostics.gitlint,

		-- Protobuf
		null_ls.builtins.diagnostics.protolint,

		-- Security/code analysis
		null_ls.builtins.diagnostics.semgrep,
	},
})
