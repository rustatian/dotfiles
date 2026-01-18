<img width="3840" height="2160" alt="image" src="https://github.com/user-attachments/assets/eaab0f6b-716f-460e-be84-8cc9829e0a33" />

## Neovim Python Setup

Some Neovim plugins require Python <= 3.13. To avoid conflicts with newer system Python versions, a dedicated virtual environment is used.

### Initial Setup

```bash
# Create the venv with Python 3.13
uv venv --python 3.13 ~/.config/nvim/.venv

# Activate and install pynvim
source ~/.config/nvim/.venv/bin/activate
uv pip install pynvim
```

The `init.lua` is already configured to use this venv via `vim.g.python3_host_prog`.

### Verification

Run `:checkhealth provider` in Neovim to verify the Python provider is working correctly.

## Mason Packages

LSP servers are automatically installed via `mason-lspconfig`. For non-LSP packages (formatters, linters, DAP adapters, tools), run the following command in Neovim:

```vim
:MasonInstall clang-format cmakelang gofumpt goimports luaformatter mdformat prettier prettierd pyproject-fmt sql-formatter sqlfmt stylua taplo yamlfix yamlfmt buf checkmake checkstyle cmakelint codespell commitlint cpplint gitleaks gitlint golangci-lint jsonlint luacheck markdownlint markuplint misspell mypy protolint pydocstyle revive semgrep shellcheck stylelint systemdlint yamllint bash-debug-adapter codelldb cpptools debugpy delve codeql gh gitui iferr jq nomad terraform tree-sitter-cli uv wasm-language-tools
```

---

# Useful apps:
1. Mission Center
2. LACT
3. devtoolbox
4. Planify (with ToDoist)
5. https://github.com/Vladimir-csp/uwsm (uwsm start Hyprland)
6. Net auto-optimizer: https://github.com/oracle-samples/bpftune
7. Arch Linux installation steps can be found in my other repository (general steps, not a full tutorial): [link](https://github.com/rustatian/archlinux_modern_luks_install)



