#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/start.sh <task-board|calendar|memory>"
  exit 1
fi

APP="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$APP" in
  task-board|calendar|memory)
    cd "$ROOT/$APP"
    echo "Starting $APP with unified env + fixed deployment config..."
    npm run dev:stack
    ;;
  *)
    echo "Unknown app: $APP"
    echo "Allowed: task-board | calendar | memory"
    exit 1
    ;;
esac
