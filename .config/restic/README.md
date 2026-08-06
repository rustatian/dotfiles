# Restic Backup Service

Hourly `restic backup` + `forget` of `/home/valery` to `/mnt/synology/MegaArchBackup`,
plus a daily `restic prune` (03:30) as a separate unit. Both services are gated on
`ConditionPathIsMountPoint=/mnt/synology`, so they are silently skipped while the NAS
is not mounted.

## Installation

1. Symlink this directory into `~/.config` and the unit files into your user systemd
   directory:

   ```bash
   ln -s $(pwd) ~/.config/restic
   mkdir -p ~/.config/systemd/user
   ln -s $(pwd)/restic-backup.service ~/.config/systemd/user/
   ln -s $(pwd)/restic-backup.timer ~/.config/systemd/user/
   ln -s $(pwd)/restic-prune.service ~/.config/systemd/user/
   ln -s $(pwd)/restic-prune.timer ~/.config/systemd/user/
   ```

2. Reload systemd to pick up the new units:

   ```bash
   systemctl --user daemon-reload
   ```

3. If the repository does not exist yet (checks first, init only creates a new one):

   ```bash
   restic --insecure-no-password -r /mnt/synology/MegaArchBackup cat config ||
   restic --insecure-no-password -r /mnt/synology/MegaArchBackup init
   ```

## Usage

Enable and start the timers:

```bash
systemctl --user enable --now restic-backup.timer restic-prune.timer
```

Check the status:

```bash
systemctl --user status restic-backup.timer
systemctl --user list-timers
```

Trigger a backup manually (returns immediately; follow the journal):

```bash
systemctl --user start --no-block restic-backup.service
journalctl --user -fu restic-backup.service
```

## Recovery

If a hard shutdown mid-backup leaves a stale lock (usually self-clears):

```bash
restic --insecure-no-password -r /mnt/synology/MegaArchBackup unlock
```
