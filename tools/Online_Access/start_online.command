#!/bin/bash
# IA-TB - Acces en ligne temporaire
# Outil independant du runtime IA-TB.
# Compatible avec l'ancien Mac IA-TB (macOS High Sierra / Intel).
# Expose uniquement 127.0.0.1:8000 via un Quick Tunnel Cloudflare.

cd "$(dirname "$0")" || exit 1
PORT="${IATB_UI_PORT:-8000}"
LEGACY_VERSION="2022.10.3"
LEGACY_ARCHIVE="cloudflared-${LEGACY_VERSION}-darwin-amd64.tgz"
LEGACY_URL="https://github.com/cloudflare/cloudflared/releases/download/${LEGACY_VERSION}/cloudflared-darwin-amd64.tgz"
LEGACY_BIN="./cloudflared-highsierra"

pause_exit() {
  echo ""
  read -p "Appuie sur Entree pour fermer..."
  exit "${1:-1}"
}

echo "============================================================"
echo " IA-TB - ACCES EN LIGNE TEMPORAIRE"
echo "============================================================"
echo ""

# 1) IA-TB doit deja etre demarre.
if ! curl -fsS --max-time 3 "http://127.0.0.1:$PORT/ui-health" >/dev/null 2>&1; then
  echo "[ERREUR] IA-TB ne repond pas sur http://127.0.0.1:$PORT"
  echo "Demarre d'abord IA-TB avec son start.command, puis relance ce fichier."
  pause_exit 1
fi
echo "[OK] IA-TB repond sur 127.0.0.1:$PORT"

# 2) Tester d'abord un binaire compatible deja installe.
CLOUDFLARED=""
for candidate in "$LEGACY_BIN" "./cloudflared" "$HOME/bin/cloudflared" "/usr/local/bin/cloudflared"; do
  if [ -x "$candidate" ]; then
    if "$candidate" --version >/dev/null 2>&1; then
      CLOUDFLARED="$candidate"
      break
    fi
  fi
done

# 3) High Sierra : si le cloudflared actuel ne demarre pas, installer localement
# la release 2022.10.3. Elle prend en charge les Quick Tunnels et son archive
# Darwin AMD64 officielle est disponible. Rien n'est installe dans macOS.
if [ -z "$CLOUDFLARED" ]; then
  echo "[INFO] Le cloudflared actuel n'est pas compatible avec ce macOS."
  echo "[INFO] Installation locale de cloudflared $LEGACY_VERSION pour High Sierra..."
  rm -f "$LEGACY_ARCHIVE" cloudflared.extract

  if ! curl -fL --connect-timeout 15 -o "$LEGACY_ARCHIVE" "$LEGACY_URL"; then
    echo "[ERREUR] Telechargement de cloudflared $LEGACY_VERSION impossible."
    pause_exit 1
  fi

  mkdir -p .cloudflared_extract
  rm -f .cloudflared_extract/cloudflared
  if ! tar -xzf "$LEGACY_ARCHIVE" -C .cloudflared_extract; then
    echo "[ERREUR] Archive cloudflared invalide."
    rm -rf .cloudflared_extract
    pause_exit 1
  fi

  if [ ! -f .cloudflared_extract/cloudflared ]; then
    echo "[ERREUR] Binaire cloudflared absent de l'archive."
    rm -rf .cloudflared_extract
    pause_exit 1
  fi

  mv .cloudflared_extract/cloudflared "$LEGACY_BIN"
  rm -rf .cloudflared_extract
  chmod +x "$LEGACY_BIN"
  rm -f "$LEGACY_ARCHIVE"

  if ! "$LEGACY_BIN" --version; then
    echo "[ERREUR] Cette release cloudflared ne peut pas s'executer sur ce Mac."
    echo "Aucune modification n'a ete faite dans IA-TB."
    pause_exit 1
  fi
  CLOUDFLARED="$LEGACY_BIN"
fi

echo "[OK] cloudflared : $CLOUDFLARED"
"$CLOUDFLARED" --version

echo ""
echo "Creation du lien HTTPS temporaire..."
echo "Le lien public en trycloudflare.com va apparaitre ci-dessous."
echo "Envoie uniquement ce lien a la personne autorisee."
echo ""
echo "IMPORTANT :"
echo " - IA-TB reste lie a 127.0.0.1 ; aucun port de la box n'est ouvert."
echo " - Le lien est public tant que ce terminal reste ouvert."
echo " - Cette compatibilite High Sierra utilise une ancienne release cloudflared."
echo " - Utilise cet acces uniquement pour des tests temporaires."
echo " - Ctrl+C coupe immediatement l'acces."
echo "============================================================"
echo ""

exec "$CLOUDFLARED" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT"
