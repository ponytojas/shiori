# Inbox Refresh Automation

The repository includes a maintenance command and a user-level `systemd` timer to refresh the Inbox workflow every 2 hours.

## What it does

- Refreshes bookmark metadata from the source URL, including the current title.
- Recalculates the Inbox workflow tags used by the webapp: `leer-hoy`, `rapido`, `foco`, and `inspiracion`.
- Leaves non-workflow tags untouched.

## Manual run

From the repository root:

```bash
scripts/refresh_inbox.sh
```

Helpful options:

```bash
scripts/refresh_inbox.sh --skip-metadata
scripts/refresh_inbox.sh --limit 100
scripts/refresh_inbox.sh --with-archival
```

## User systemd timer

The unit files live in:

- `scripts/systemd/shiori-inbox-refresh.service`
- `scripts/systemd/shiori-inbox-refresh.timer`

Install them for the current user:

```bash
mkdir -p ~/.config/systemd/user
cp scripts/systemd/shiori-inbox-refresh.service ~/.config/systemd/user/
cp scripts/systemd/shiori-inbox-refresh.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now shiori-inbox-refresh.timer
systemctl --user list-timers shiori-inbox-refresh.timer
```

Check the last runs:

```bash
journalctl --user -u shiori-inbox-refresh.service -n 100
```

## Notes

- The timer is not auto-installed by the repo because that would write outside the workspace and mutate machine-level user config.
- The wrapper script builds `./shiori` if the binary does not exist yet, then runs `shiori refresh-inbox`.
