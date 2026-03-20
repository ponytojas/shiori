# Shiori

[![IC](https://github.com/go-shiori/shiori/actions/workflows/push.yml/badge.svg?branch=master)](https://github.com/go-shiori/shiori/actions/workflows/push.yml)
[![Go Report Card](https://goreportcard.com/badge/github.com/go-shiori/shiori)](https://goreportcard.com/report/github.com/go-shiori/shiori)
[![#shiori-general:matrix.org](https://img.shields.io/badge/matrix-%23shiori-orange)](https://matrix.to/#/#shiori:matrix.org)
[![Containers](https://img.shields.io/static/v1?label=Container&message=Images&color=1488C6&logo=docker)](https://github.com/go-shiori/shiori/pkgs/container/shiori)

**Check out our latest [Announcements](https://github.com/go-shiori/shiori/discussions/categories/announcements)**

Shiori is a simple bookmarks manager written in the Go language. Intended as a simple clone of [Pocket][pocket]. You can use it as a command line application or as a web application. This application is distributed as a single binary, which means it can be installed and used easily.

![Screenshot][screenshot]

## Features

- Basic bookmarks management i.e. add, edit, delete and search.
- Import and export bookmarks from and to Netscape Bookmark file.
- Import bookmarks from Pocket.
- Simple and clean command line interface.
- Simple and pretty web interface for those who don't want to use a command line app.
- Portable, thanks to its single binary format.
- Support for sqlite3, PostgreSQL, MariaDB and MySQL as its database.
- Where possible, by default `shiori` will parse the readable content and create an offline archive of the webpage.
- [BETA] [web extension][web-extension] support for Firefox and Chrome.

![Comparison of reader mode and archive mode][mode-comparison]

## Documentation

All documentation is available in the [docs folder][documentation]. If you think there is incomplete or incorrect information, feel free to edit it by submitting a pull request.

## Operational Reading MVP

This repository now includes a small operational-reading layer in the web Inbox.

- Shiori bookmarks remain the single source of truth.
- The workflow uses existing bookmark tags such as `leer-hoy`, `rapido`, `foco`, and `inspiracion`.
- The Inbox surfaces a `leer-hoy` shortlist, lightweight search, workflow filters, and quick operational tag toggles without introducing a second store.

Use it from `/bookmarks`:

1. Save bookmarks as usual.
2. Mark a few items with `leer-hoy`, `rapido`, `foco`, or `inspiracion` directly from Inbox.
3. Switch workflow chips to narrow the list.
4. Use search to reduce the visible set when Inbox grows.

## Inbox Refresh Automation

The repository also includes a refresh flow for the Inbox layer.

- `shiori refresh-inbox` refreshes bookmark title metadata and recalculates the workflow tags for non-archived bookmarks.
- `scripts/refresh_inbox.sh` is the scheduler-friendly wrapper script.
- `scripts/systemd/` includes a user-level service and timer that run the refresh every 2 hours.

Setup details are documented in [docs/inbox-refresh-automation.md](docs/inbox-refresh-automation.md).

## License

Shiori is distributed under the terms of the [MIT license][mit], which means you can use it and modify it however you want. However, if you make an enhancement for it, if possible, please send a pull request.

[documentation]: https://github.com/go-shiori/shiori/blob/master/docs/index.md
[mit]: https://choosealicense.com/licenses/mit/
[web-extension]: https://github.com/go-shiori/shiori-web-ext
[screenshot]: https://raw.githubusercontent.com/go-shiori/shiori/master/docs/assets/screenshots/cover.png
[mode-comparison]: https://raw.githubusercontent.com/go-shiori/shiori/master/docs/assets/screenshots/comparison.png
[pocket]: https://getpocket.com/
[256]: https://github.com/go-shiori/shiori/issues/256
