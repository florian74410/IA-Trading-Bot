#!/bin/bash
# IA-TB v1.5.1 — ULTRA Mode v2.0 STOP
# Arrêt idempotent du mode intégré + compatibilité pack autonome précédent.
set +e
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$DIR/log.txt"
touch "$LOG"
log(){ printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }
stop_state(){
  ROOT="$1"; STATEFILE="$2"; LABEL="$3"
  ACTIVE="$ROOT/active"; PIDFILE="$ROOT/caffeinate.pid"; UNLOADED="$ROOT/unloaded_agents.txt"; STATE="$ROOT/$STATEFILE"
  live=false
  if [ -f "$PIDFILE" ]; then pid="$(cat "$PIDFILE" 2>/dev/null)"; [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1 && live=true; fi
  [ -f "$ACTIVE" ] || [ "$live" = true ] || return 0
  log "Arrêt état ULTRA: $LABEL"
  if [ "$live" = true ]; then kill "$pid" >/dev/null 2>&1 || true; log "caffeinate arrêté ($LABEL)."; fi
  rm -f "$PIDFILE"
  value(){ grep "^$1=" "$STATE" 2>/dev/null | tail -1 | cut -d= -f2-; }
  WIFIDEV="$(value WIFIDEV)"; WAS="$(value WIFI_WAS_ON)"; DIS="$(value WIFI_DISABLED)"
  if [ "$WAS" = true ] && [ "$DIS" = true ] && [ -n "$WIFIDEV" ]; then networksetup -setairportpower "$WIFIDEV" on >/dev/null 2>&1 || true; log "Wi-Fi restauré ($LABEL)."; fi
  if [ -f "$UNLOADED" ]; then
    awk '{a[NR]=$0} END{for(i=NR;i>=1;i--)print a[i]}' "$UNLOADED" | while IFS= read -r PLIST; do
      [ -f "$PLIST" ] || continue
      if launchctl load "$PLIST" >/dev/null 2>&1; then log "Agent restauré: $(basename "$PLIST")"; else log "INFO agent non restauré: $(basename "$PLIST")"; fi
    done
  fi
  rm -f "$ACTIVE" "$STATE" "$UNLOADED"
}
log '=== ULTRA MODE v2.0 : ARRÊT ==='
stop_state "$DIR/.runtime" "state.dat" "intégré IA-TB"
stop_state "$HOME/.macro_ultra_v2" "state" "pack autonome"
if ! pgrep -x Finder >/dev/null 2>&1; then open -a Finder >/dev/null 2>&1 || true; log 'Finder relancé.'; fi
log 'ULTRA INACTIVE.'
echo INACTIVE
exit 0
