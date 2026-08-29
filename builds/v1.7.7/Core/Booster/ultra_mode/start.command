#!/bin/bash
# IA-TB v1.5.1 — ULTRA Mode v2.0 START
# Session-only, idempotent, High Sierra / MacBookPro8,1.
set +e
DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="$DIR/.runtime"
STATE="$STATE_DIR/state.dat"
UNLOADED="$STATE_DIR/unloaded_agents.txt"
ACTIVE="$STATE_DIR/active"
CAFFEINATE_PID="$STATE_DIR/caffeinate.pid"
LOG="$DIR/log.txt"
mkdir -p "$STATE_DIR"
touch "$LOG"
log(){ printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }
rotate_log(){ if [ -f "$LOG" ]; then lines=$(wc -l < "$LOG" | tr -d ' '); if [ "${lines:-0}" -gt 1800 ]; then tail -n 1200 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"; fi; fi; }
is_active(){
  /bin/bash "$DIR/status.command" 2>/dev/null | grep -q '^ACTIVE$'
}
rotate_log
if is_active; then log 'START ignoré : ULTRA déjà ACTIF (intégré ou session ULTRA v2.0 existante).'; echo ACTIVE; exit 0; fi
rm -f "$ACTIVE" "$UNLOADED" "$CAFFEINATE_PID"
: > "$STATE"
: > "$UNLOADED"
OS="$(sw_vers -productVersion 2>/dev/null)"
MODEL="$(sysctl -n hw.model 2>/dev/null)"
case "$OS" in 10.13.*) ;; *) log "ERREUR: macOS $OS non supporté."; echo ERROR; exit 2;; esac
if [ "$MODEL" != "MacBookPro8,1" ]; then log "ERREUR: modèle $MODEL non supporté."; echo ERROR; exit 2; fi
log '=== ULTRA MODE v2.0 : ACTIVATION ==='
log "OS=$OS MODEL=$MODEL"
POWER="$(pmset -g batt 2>/dev/null | head -1)"
log "Alimentation: $POWER"
# Applications non essentielles. Firefox / Terminal / IA-TB ne sont jamais ciblés.
for APP in "Google Chrome" "Dropbox" "Messages" "Photos" "Contacts" "Calendar" "iTunes" "Mail" "Preview" "QuickTime Player" "System Preferences"; do
  if pgrep -x "$APP" >/dev/null 2>&1; then
    osascript -e "tell application \"$APP\" to quit" >/dev/null 2>&1
    log "Fermeture demandée: $APP"
  fi
done
# Arrêt d'un backup Time Machine éventuel sans désactiver Time Machine.
tmutil stopbackup >/dev/null 2>&1 || true
log 'Time Machine: arrêt du backup courant demandé si nécessaire.'
unload_temp(){
  plist="$1"; friendly="$2"
  [ -f "$plist" ] || { log "SKIP agent absent: $friendly"; return; }
  label="$(/usr/libexec/PlistBuddy -c 'Print :Label' "$plist" 2>/dev/null)"
  [ -n "$label" ] || { log "SKIP label introuvable: $friendly"; return; }
  if launchctl list 2>/dev/null | grep -Fq "$label"; then
    if launchctl unload "$plist" >/dev/null 2>&1; then
      echo "$plist" >> "$UNLOADED"
      log "Suspendu temporairement: $friendly"
    else
      log "INFO macOS refuse unload: $friendly"
    fi
  else
    log "Déjà inactif: $friendly"
  fi
}
unload_temp "/System/Library/LaunchAgents/com.apple.Finder.plist" "Finder"
unload_temp "/System/Library/LaunchAgents/com.apple.notificationcenterui.plist" "Notification Center"
unload_temp "/System/Library/LaunchAgents/com.apple.bird.plist" "iCloud Drive (bird)"
unload_temp "/System/Library/LaunchAgents/com.apple.cloudd.plist" "CloudKit (cloudd)"
unload_temp "/System/Library/LaunchAgents/com.apple.cloudphotosd.plist" "Photos iCloud"
unload_temp "/System/Library/LaunchAgents/com.apple.photolibraryd.plist" "Photo Library"
unload_temp "/System/Library/LaunchAgents/com.apple.SafariBookmarksSyncAgent.plist" "Safari Bookmarks Sync"
kill_pattern(){ pat="$1"; name="$2"; if pgrep -f "$pat" >/dev/null 2>&1; then pkill -TERM -f "$pat" >/dev/null 2>&1 || true; log "TERM résidu: $name"; fi; }
kill_pattern "/Applications/Dropbox.app/Contents/PlugIns/garcon.appex" "Dropbox Finder extension"
kill_pattern "SafariBookmarksSyncAgent" "Safari Bookmarks Sync"
kill_pattern "QuickLookSatellite" "QuickLook Satellite"
for PROC in quicklookd Spotlight NotificationCenter cloudphotosd photolibraryd bird cloudd; do
  if pgrep -x "$PROC" >/dev/null 2>&1; then killall "$PROC" >/dev/null 2>&1 || true; log "Fermeture processus: $PROC"; fi
done
# Si certains services Apple reviennent, leur priorité CPU est réduite seulement.
for PROC in bird cloudd cloudphotosd photolibraryd; do
  for PID in $(pgrep -x "$PROC" 2>/dev/null); do renice 15 -p "$PID" >/dev/null 2>&1 || true; done
done
# Ethernet prioritaire : Wi-Fi coupé seulement si Ethernet est actif.
ETHDEV="$(networksetup -listallhardwareports 2>/dev/null | awk '/Hardware Port: Ethernet/{getline; if($1=="Device:"){print $2;exit}}')"
WIFIDEV="$(networksetup -listallhardwareports 2>/dev/null | awk '/Hardware Port: Wi-Fi/{getline; if($1=="Device:"){print $2;exit}}')"
ETH_ACTIVE=false; WIFI_WAS_ON=false; WIFI_DISABLED=false
[ -n "$ETHDEV" ] && ifconfig "$ETHDEV" 2>/dev/null | grep -q 'status: active' && ETH_ACTIVE=true
[ -n "$WIFIDEV" ] && networksetup -getairportpower "$WIFIDEV" 2>/dev/null | grep -qi ': On' && WIFI_WAS_ON=true
if [ "$ETH_ACTIVE" = true ] && [ "$WIFI_WAS_ON" = true ]; then
  networksetup -setairportpower "$WIFIDEV" off >/dev/null 2>&1 && WIFI_DISABLED=true
fi
printf 'ETHDEV=%s\nWIFIDEV=%s\nWIFI_WAS_ON=%s\nWIFI_DISABLED=%s\n' "$ETHDEV" "$WIFIDEV" "$WIFI_WAS_ON" "$WIFI_DISABLED" >> "$STATE"
log "Réseau: ethernet=$ETH_ACTIVE wifi_avant=$WIFI_WAS_ON wifi_coupé=$WIFI_DISABLED"
# Veille suspendue uniquement pendant la session ULTRA.
caffeinate -dimsu >/dev/null 2>&1 &
echo $! > "$CAFFEINATE_PID"
sleep 1
pid="$(cat "$CAFFEINATE_PID" 2>/dev/null)"
if [ -z "$pid" ] || ! kill -0 "$pid" >/dev/null 2>&1; then
  log 'ERREUR: caffeinate non actif; activation ULTRA non confirmée.'
  rm -f "$CAFFEINATE_PID" "$ACTIVE"
  echo ERROR
  exit 3
fi
touch "$ACTIVE"
log "ULTRA ACTIVE (caffeinate PID $pid)."
echo ACTIVE
exit 0
