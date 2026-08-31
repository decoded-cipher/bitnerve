#!/bin/zsh
set -u

ROOT="/Users/arjunkrishna/Developer/My Projects/ai-trading-bot"
CYCLE_INTERVAL="${CYCLE_INTERVAL:-900}"
PIDS="$ROOT/.bitnerve.pids"

start() {
  if [[ -f "$PIDS" ]] && kill -0 $(cat "$PIDS") 2>/dev/null; then
    echo "already running: $(cat "$PIDS")"; exit 1
  fi
  cd "$ROOT" || exit 1

  nohup zsh -c 'while true; do "'"$ROOT"'/run-watch.sh"; sleep 5; done' >/dev/null 2>&1 &
  W=$!
  sleep 3
  nohup zsh -c 'while true; do "'"$ROOT"'/run-cycle.sh"; sleep '"$CYCLE_INTERVAL"'; done' >/dev/null 2>&1 &
  C=$!

  echo "$W $C" > "$PIDS"
  echo "watch pid $W   cycle pid $C   (cycle every ${CYCLE_INTERVAL}s)"
  echo "tail -F .cycle.log .watch.log"
}

stop() {
  [[ -f "$PIDS" ]] || { echo "not running"; exit 0; }
  for p in $(cat "$PIDS"); do
    pkill -P "$p" 2>/dev/null
    kill "$p" 2>/dev/null
  done
  pkill -f "run-watch.sh" 2>/dev/null
  pkill -f "bun run --silent watch" 2>/dev/null
  rm -f "$PIDS" "$ROOT/.cycle.lock"
  echo "stopped"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status)
    if [[ -f "$PIDS" ]] && kill -0 $(cat "$PIDS") 2>/dev/null; then
      echo "running: $(cat "$PIDS")"
    else
      echo "not running"
    fi
    ;;
  *) echo "usage: ./run-all.sh [start|stop|status]"; exit 1 ;;
esac
