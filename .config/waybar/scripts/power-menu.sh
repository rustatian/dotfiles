#!/usr/bin/env bash
#
# Display a power menu to perform system actions
#
# Requirements:
# 	- fzf
#
# Get fzf color config
# shellcheck disable=SC1090,SC2154
. ~/.config/waybar/scripts/fzf-colors.sh 2> /dev/null

LIST=(
	'Lock'
	'Shutdown'
	'Reboot'
	'Logout'
	'Hibernate'
	'Suspend'
)

main() {
	local opts=(
		--border=sharp
		--border-label=' Power Menu '
		--height=~100%
		--highlight-line
		--no-input
		--pointer=
		--reverse
		"${fcconf[@]}"
	)

	local selected
	selected=$(printf '%s\n' "${LIST[@]}" | fzf "${opts[@]}")
	case $selected in
		'Lock') loginctl lock-session ;;
		'Shutdown') systemctl poweroff ;;
		'Reboot') systemctl reboot ;;
		'Logout') loginctl terminate-session "$XDG_SESSION_ID" ;;
		'Hibernate') systemctl hibernate ;;
		'Suspend') systemctl suspend ;;
	esac
}

main
