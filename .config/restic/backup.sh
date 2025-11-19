#!/bin/bash
set -e

restic --insecure-no-password \
	-r /mnt/synology/MegaArchBackup \
	backup /home/valery \
	--exclude='.cache' \
	--exclude='Downloads' \
	--exclude='/home/valery/projects/vms' \
	--exclude='node_modules' \
	--exclude='target' \
	--exclude='__pycache__'

restic --insecure-no-password \
	-r /mnt/synology/MegaArchBackup \
	forget \
	--keep-monthly 1 \
	--keep-weekly 4 \
	--keep-daily 31 \
	--keep-hourly 48 \
	--prune