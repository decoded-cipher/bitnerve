#!/bin/zsh
set -u

ROOT="/Users/arjunkrishna/Developer/My Projects/ai-trading-bot"
LOCK="$ROOT/.cycle.lock"
LOG="$ROOT/.cycle.log"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:$HOME/.local/bin"
export NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-/etc/ssl/cert.pem}"

stamp() { date "+%Y-%m-%d %H:%M:%S"; }

# A cycle can outlast the 5 minute tick; never run two at once
if [[ -f "$LOCK" ]] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  echo "$(stamp) SKIP - cycle $(cat "$LOCK") still running" >> "$LOG"
  exit 0
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT INT TERM

cd "$ROOT" || exit 1

echo "$(stamp) START" >> "$LOG"

if ! BRIEF="$(cd server && bun run --silent brief 2>&1)"; then
  echo "$(stamp) BRIEF FAILED" >> "$LOG"
  echo "$BRIEF" | tail -5 >> "$LOG"
  exit 1
fi

claude -p "$BRIEF" \
  --append-system-prompt "$(cat server/prompts/system.md)" \
  --mcp-config .mcp.json \
  --strict-mcp-config \
  --model claude-opus-5 \
  --allowed-tools "mcp__bitnerve__create_position mcp__bitnerve__close_position mcp__bitnerve__record_analysis" \
  --output-format text >> "$LOG" 2>&1

echo "$(stamp) END (exit $?)" >> "$LOG"
