#!/bin/bash
# IA-TB - Acces en ligne temporaire
# Outil independant du runtime IA-TB.
# Expose uniquement l'interface HTTP locale 127.0.0.1:8000 via un Quick Tunnel Cloudflare.

cd "$(dirname "$0")"
PORT="${IATB_UI_PORT:-8000}"

echo "============================================================"
echo " IA-TB - ACCES EN LIGNE TEMPORAIRE"
echo "============================================================"
echo ""

# 1) Verifier que IA-TB est deja demarre.
if ! curl -fsS --max-time 3 "http://127.0.0.1:$PORT/ui-health" >/dev/null 2>&1; then
  echo "[ERREUR] IA-TB ne repond pas sur http://127.0.0.1:$PORT"
  echo "Demarre d'abord IA-TB avec son start.command, puis relance ce fichier."
  echo ""
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi
echo "[OK] IA-TB repond sur 127.0.0.1:$PORT"

# 2) Trouver cloudflared sans modifier IA-TB.
CLOUDFLARED=""
if command -v cloudflared >/dev/null 2>&1; then
  CLOUDFLARED="$(command -v cloudflared)"
elif [ -x "./cloudflared" ]; then
  CLOUDFLARED="./cloudflared"
elif [ -x "$HOME/bin/cloudflared" ]; then
  CLOUDFLARED="$HOME/bin/cloudflared"
elif [ -x "/usr/local/bin/cloudflared" ]; then
  CLOUDFLARED="/usr/local/bin/cloudflared"
fi

if [ -z "$CLOUDFLARED" ]; then
  echo ""
  echo "[ERREUR] cloudflared n'est pas installe."
  echo "Installe le binaire macOS Intel cloudflared, puis relance ce fichier."
  echo "Documentation officielle : Cloudflare Tunnel / Downloads"
  echo ""
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

echo "[OK] cloudflared : $CLOUDFLARED"
"$CLOUDFLARED" --version || {
  echo "[ERREUR] cloudflared ne peut pas s'executer sur ce Mac."
  read -p "Appuie sur Entree pour fermer..."
  exit 1
}

echo ""
echo "Creation du lien HTTPS temporaire..."
echo "Le lien public en trycloudflare.com va apparaitre ci-dessous."
echo "Envoie uniquement ce lien a la personne autorisee."
echo ""
echo "IMPORTANT :"
echo " - IA-TB reste lie a 127.0.0.1 ; aucun port de la box n'est ouvert."
echo " - Le lien est public tant que ce terminal reste ouvert."
echo " - Ctrl+C coupe immediatement l'acces."
echo "============================================================"
echo ""

exec "$CLOUDFLARED" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT"
