# Restic Backup Service

Hourly `restic backup` + `forget` of `/home/valery` to `/mnt/NFSBackups/MegaArchBackup`, plus a daily `restic prune` (03:30) as a separate unit. If the NAS is not reachable, the service fails and `systemctl --user --failed` shows it.

## NAS mount

The repository is on the UniFi UNAS NFS share `10.0.0.249:/var/nfs/shared/NFSBackups`. Add the IP of this host to the NFS allow list of the share in UniFi Drive.

Omarchy masks `NetworkManager-wait-online.service`, so a boot-time NFS mount starts before DHCP completes and fails. `x-systemd.automount` sets up the mount point at boot and mounts the share on first access:

```bash
sudo pacman -S --needed restic
printf '\n%s\n' '10.0.0.249:/var/nfs/shared/NFSBackups /mnt/NFSBackups nfs x-systemd.automount 0 0' | sudo tee -a /etc/fstab
sudo systemctl daemon-reload
sudo systemctl start mnt-NFSBackups.automount
```

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
   restic --insecure-no-password -r /mnt/NFSBackups/MegaArchBackup cat config ||
   restic --insecure-no-password -r /mnt/NFSBackups/MegaArchBackup init
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

A killed run (for example a hard shutdown during a backup) leaves a stale lock. A stale lock blocks `forget` and `prune`. `backup.sh` runs `restic unlock` before each backup, and this removes only stale locks. To remove a stale lock before the next hourly run:

```bash
restic --insecure-no-password -r /mnt/NFSBackups/MegaArchBackup unlock
```
