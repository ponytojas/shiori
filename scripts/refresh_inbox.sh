#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -x "$ROOT_DIR/shiori" ]]; then
  go build -o "$ROOT_DIR/shiori" .
fi

"$ROOT_DIR/shiori" refresh-inbox "$@"
