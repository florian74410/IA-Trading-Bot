#!/bin/bash
# IA-TB - Online Access Console
# Outil independant du runtime IA-TB.
# Compatible macOS High Sierra / Intel (Bash 3.2).
# Expose uniquement 127.0.0.1:8000 via un Quick Tunnel Cloudflare.

cd "$(dirname "$0")" || exit 1
PORT="${IATB_UI_PORT:-8000}"
LEGACY_VERSION="2022.10.3"
LEGACY_ARCHIVE="cloudflared-${LEGACY_VERSION}-darwin-amd64.tgz"
LEGACY_URL="https://github.com/cloudflare/cloudflared/releases/download/${LEGACY_VERSION}/cloudflared-darwin-amd64.tgz"
LEGACY_BIN="./cloudflared-highsierra"
RUNTIME_DIR="./.runtime"
TUNNEL_LOG="$RUNTIME_DIR/cloudflared.log"
TUNNEL_PID=""
PUBLIC_URL=""

pause_exit() {
  echo ""
  read -p "Appuie sur Entree pour fermer..."
  exit "${1:-1}"
}

banner() {
  clear
  echo "============================================================"
  echo "              IA-TB - ONLINE ACCESS CONSOLE"
  echo "============================================================"
  echo ""
}

local_health() {
  curl -fsS --max-time 3 "http://127.0.0.1:$PORT/ui-health" >/dev/null 2>&1
}

tunnel_alive() {
  [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" >/dev/null 2>&1
}

stop_tunnel() {
  if tunnel_alive; then
    kill "$TUNNEL_PID" >/dev/null 2>&1 || true
    wait "$TUNNEL_PID" >/dev/null 2>&1 || true
  fi
  TUNNEL_PID=""
}

cleanup() {
  stop_tunnel
}
trap cleanup EXIT INT TERM

show_status() {
  echo ""
  echo "----------------------- STATUS -----------------------------"
  if local_health; then
    echo " IA-TB local ......... ONLINE"
  else
    echo " IA-TB local ......... OFFLINE"
  fi
  echo " Adresse locale ...... http://127.0.0.1:$PORT"
  if tunnel_alive; then
    echo " Tunnel .............. ONLINE"
  else
    echo " Tunnel .............. OFFLINE"
  fi
  if [ -n "$PUBLIC_URL" ]; then
    echo " URL publique ........ $PUBLIC_URL"
  else
    echo " URL publique ........ indisponible"
  fi
  if [ -f "$TUNNEL_LOG" ]; then
    CONNECTIONS="$(grep -c 'registered connIndex=' "$TUNNEL_LOG" 2>/dev/null || echo 0)"
    echo " Connexions tunnel ... $CONNECTIONS enregistree(s)"
  fi
  echo "------------------------------------------------------------"
  echo ""
}

show_help() {
  echo ""
  echo "Commandes disponibles :"
  echo "  status       Etat IA-TB, tunnel, URL et connexions"
  echo "  url          Affiche uniquement l'URL publique"
  echo "  connections  Affiche les connexions Cloudflare enregistrees"
  echo "  logs         Affiche les 30 dernieres lignes du tunnel"
  echo "  health       Teste IA-TB local et le tunnel"
  echo "  clear        Nettoie l'ecran et reaffiche le statut"
  echo "  help         Affiche cette aide"
  echo "  stop         Coupe le tunnel et ferme cette console"
  echo ""
}

banner

# 1) IA-TB doit deja etre demarre.
if ! local_health; then
  echo "[ERREUR] IA-TB ne repond pas sur http://127.0.0.1:$PORT"
  echo "Demarre d'abord IA-TB avec son start.command."
  pause_exit 1
fi
echo "[OK] IA-TB repond sur 127.0.0.1:$PORT"

# 2) Chercher un cloudflared qui s'execute reellement.
CLOUDFLARED=""
for candidate in "$LEGACY_BIN" "./cloudflared" "$HOME/bin/cloudflared" "/usr/local/bin/cloudflared"; do
  if [ -x "$candidate" ]; then
    "$candidate" --version >/dev/null 2>&1
    RC=$?
    if [ "$RC" -eq 0 ]; then
      CLOUDFLARED="$candidate"
      break
    fi
  fi
done

# 3) High Sierra : installation locale du binaire compatible si necessaire.
if [ -z "$CLOUDFLARED" ]; then
  echo "[INFO] Installation locale de cloudflared $LEGACY_VERSION pour High Sierra..."
  rm -f "$LEGACY_ARCHIVE"
  if ! curl -fL --connect-timeout 15 -o "$LEGACY_ARCHIVE" "$LEGACY_URL"; then
    echo "[ERREUR] Telechargement impossible."
    pause_exit 1
  fi
  rm -rf .cloudflared_extract
  mkdir -p .cloudflared_extract
  if ! tar -xzf "$LEGACY_ARCHIVE" -C .cloudflared_extract; then
    rm -rf .cloudflared_extract
    echo "[ERREUR] Archive cloudflared invalide."
    pause_exit 1
  fi
  if [ ! -f .cloudflared_extract/cloudflared ]; then
    rm -rf .cloudflared_extract
    echo "[ERREUR] Binaire absent de l'archive."
    pause_exit 1
  fi
  mv .cloudflared_extract/cloudflared "$LEGACY_BIN"
  rm -rf .cloudflared_extract
  rm -f "$LEGACY_ARCHIVE"
  chmod +x "$LEGACY_BIN"
  if ! "$LEGACY_BIN" --version >/dev/null 2>&1; then
    echo "[ERREUR] cloudflared $LEGACY_VERSION ne peut pas s'executer sur ce Mac."
    pause_exit 1
  fi
  CLOUDFLARED="$LEGACY_BIN"
fi

echo "[OK] cloudflared : $CLOUDFLARED"
"$CLOUDFLARED" --version
mkdir -p "$RUNTIME_DIR"
: > "$TUNNEL_LOG"

echo ""
echo "[INFO] Creation du tunnel HTTPS temporaire..."
"$CLOUDFLARED" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Attendre jusqu'a 30 secondes l'URL Quick Tunnel.
I=0
while [ "$I" -lt 30 ]; do
  if ! tunnel_alive; then
    echo "[ERREUR] Le tunnel s'est arrete pendant son demarrage."
    tail -30 "$TUNNEL_LOG" 2>/dev/null
    pause_exit 1
  fi
  PUBLIC_URL="$(grep -Eo 'https://[A-Za-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)"
  [ -n "$PUBLIC_URL" ] && break
  sleep 1
  I=$((I + 1))
done

if [ -z "$PUBLIC_URL" ]; then
  echo "[ERREUR] Aucune URL publique recue apres 30 secondes."
  tail -30 "$TUNNEL_LOG" 2>/dev/null
  pause_exit 1
fi

banner
echo "[OK] Tunnel Internet actif."
echo ""
echo " URL PUBLIQUE :"
echo " $PUBLIC_URL"
echo ""
echo " Cette URL est temporaire et publique : partage-la uniquement"
echo " avec la personne autorisee. 'stop' coupe immediatement l'acces."
show_status
show_help

# Console interactive. cloudflared reste en arriere-plan et ecrit dans TUNNEL_LOG.
while tunnel_alive; do
  printf "ONLINE > "
  if ! read CMD; then
    break
  fi
  case "$CMD" in
    status)
      show_status
      ;;
    url)
      echo ""
      echo "$PUBLIC_URL"
      echo ""
      ;;
    connections)
      echo ""
      grep 'registered connIndex=' "$TUNNEL_LOG" 2>/dev/null | tail -10
      echo ""
      ;;
    logs)
      echo ""
      echo "------------------- CLOUDFARE LOGS -------------------------"
      tail -30 "$TUNNEL_LOG" 2>/dev/null
      echo "------------------------------------------------------------"
      echo ""
      ;;
    health)
      echo ""
      if local_health; then echo "[OK] IA-TB local ONLINE"; else echo "[ERREUR] IA-TB local OFFLINE"; fi
      if tunnel_alive; then echo "[OK] Tunnel ONLINE"; else echo "[ERREUR] Tunnel OFFLINE"; fi
      echo ""
      ;;
    clear)
      banner
      show_status
      ;;
    help|?)
      show_help
      ;;
    stop|quit|exit)
      echo ""
      echo "[INFO] Arret du tunnel..."
      stop_tunnel
      echo "[OK] Acces Internet coupe."
      break
      ;;
    "")
      ;;
    *)
      echo "Commande inconnue : $CMD"
      echo "Tape 'help' pour voir les commandes."
      ;;
  esac
done

if [ -n "$TUNNEL_PID" ]; then
  echo ""
  echo "[INFO] Le tunnel s'est arrete."
fi
cleanup
echo ""
echo "IA-TB reste actif localement. Seul l'acces Internet est coupe."
read -p "Appuie sur Entree pour fermer..."
exit 0
