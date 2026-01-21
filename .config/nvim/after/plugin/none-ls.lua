local null_ls = require("null-ls")
local u = require("null-ls.utils")

null_ls.setup({
	sources = {
		-- Python type checking
		-- Run mypy from project's venv so plugins (like pydantic.mypy) are available
		null_ls.builtins.diagnostics.mypy.with({
			command = function(params)
				local root = u.root_pattern("pyproject.toml", "mypy.ini", ".mypy.ini", "setup.cfg")(params.bufname)
				if root then
					local venv_mypy = root .. "/.venv/bin/mypy"
					if vim.fn.executable(venv_mypy) == 1 then
						return venv_mypy
					end
				end
				return "mypy"
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
