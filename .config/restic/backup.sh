#!/bin/bash
set -u

restic --insecure-no-password \
	-r /mnt/synology/MegaArchBackup \
	backup /home/valery \
	--exclude='.cache' \
	--exclude='Downloads' \
	--exclude='/home/valery/projects/vms' \
	--exclude='node_modules' \
	--exclude='target' \
	--exclude='__pycache__'
rc=$?
# exit code 3 = some source files could not be read; normal on a live /home
if [ "$rc" -ne 0 ] && [ "$rc" -ne 3 ]; then
	exit "$rc"
fi

restic --insecure-no-password \
	-r /mnt/synology/MegaArchBackup \
	forget \
	--keep-monthly 1 \
	--keep-weekly 4 \
	--keep-daily 31 \
	--keep-hourly 48
