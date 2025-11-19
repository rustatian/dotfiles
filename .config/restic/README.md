# Restic Backup Service

## Installation

1. Copy or symlink the unit files to your user systemd directory:
   ```bash
   mkdir -p ~/.config/systemd/user
   ln -s $(pwd)/restic-backup.service ~/.config/systemd/user/
   ln -s $(pwd)/restic-backup.timer ~/.config/systemd/user/
   ```

2. Reload systemd to pick up the new units:
   ```bash
   systemctl --user daemon-reload
   ```

## Usage

Enable and start the timer:

```bash
systemctl --user enable --now restic-backup.timer
```

Check the status:

```bash
systemctl --user status restic-backup.timer
systemctl --user list-timers
```

Trigger a backup manually:

```bash
systemctl --user start restic-backup.service
```
