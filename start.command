#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="$SCRIPT_DIR/.venv/bin/python"

echo "============================================================"
echo "              IA-TB_Dev_Updater"
echo "============================================================"
echo ""

if [[ ! -x "$PYTHON" ]]; then
    echo "ERREUR : environnement Python introuvable."
    echo ""
    echo "Vérifie que le dossier .venv existe dans :"
    echo "$SCRIPT_DIR"
    echo ""
    read -r
    exit 1
fi

echo "Python :"
"$PYTHON" --version

echo ""
echo "Test PySide2 / Qt..."

"$PYTHON" -c '
import PySide2
from PySide2.QtCore import qVersion

print("PySide2 :", PySide2.__version__)
print("Qt      :", qVersion())
' || {
    echo ""
    echo "ERREUR : PySide2 / Qt ne fonctionne pas."
    echo ""
    read -r
    exit 1
}

mkdir -p "$HOME/.ia_tb_dev_updater/workspace"
mkdir -p "$HOME/.ia_tb_dev_updater/logs"

cd "$SCRIPT_DIR" || exit 1

echo ""
echo "Démarrage de IA-TB_Dev_Updater..."
echo ""

exec "$PYTHON" "$SCRIPT_DIR/main.py"
