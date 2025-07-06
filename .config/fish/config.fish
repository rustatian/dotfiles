set fish_greeting ""

set -Ux EDITOR nvim

set -g fish_prompt_pwd_dir_length 1
set -g fish_cursor_default underscore
set -g fish_cursor_visual underscore

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/Users/rustatian/projects/cache/google-cloud-sdk/path.fish.inc' ]; . '/Users/rustatian/projects/cache/google-cloud-sdk/path.fish.inc'; end

starship init fish | source
