#!/bin/zsh
set -u

ROOT="/Users/arjunkrishna/Developer/My Projects/ai-trading-bot"
LOG="$ROOT/.watch.log"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:$HOME/.local/bin"
export NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-/etc/ssl/cert.pem}"
export WATCH_INTERVAL_SECONDS="${WATCH_INTERVAL_SECONDS:-60}"

cd "$ROOT/server" || exit 1
exec bun run --silent watch >> "$LOG" 2>&1
