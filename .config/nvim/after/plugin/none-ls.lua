local null_ls = require("null-ls")

null_ls.setup({
	sources = {
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
