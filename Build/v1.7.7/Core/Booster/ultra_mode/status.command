#!/bin/bash
# IA-TB v1.5.1 — ULTRA Mode v2.0 STATUS
# Compatible avec le mode intégré et le pack ULTRA v2.0 autonome antérieur.
DIR="$(cd "$(dirname "$0")" && pwd)"
check_state(){
  ROOT="$1"
  [ -f "$ROOT/active" ] || return 1
  [ -f "$ROOT/caffeinate.pid" ] || { rm -f "$ROOT/active" 2>/dev/null || true; return 1; }
  pid="$(cat "$ROOT/caffeinate.pid" 2>/dev/null)"
  if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then return 0; fi
  rm -f "$ROOT/active" "$ROOT/caffeinate.pid" 2>/dev/null || true
  return 1
}
check_state "$DIR/.runtime" && { echo ACTIVE; exit 0; }
check_state "$HOME/.macro_ultra_v2" && { echo ACTIVE; exit 0; }
echo INACTIVE
exit 1
