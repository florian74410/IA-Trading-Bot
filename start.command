#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="$SCRIPT_DIR/.venv/bin/python"
DATA_DIR="$HOME/.ia_tb_dev_updater"
LOG_DIR="$DATA_DIR/logs"
BOOTSTRAP_LOG="$LOG_DIR/bootstrap.log"

mkdir -p "$DATA_DIR/workspace"
mkdir -p "$LOG_DIR"

exec > >(tee -a "$BOOTSTRAP_LOG") 2>&1

echo "============================================================"
echo "              IA-TB_Dev_Updater"
echo "============================================================"
echo ""
echo "Démarrage : $(date '+%Y-%m-%d %H:%M:%S')"
echo "Dossier    : $SCRIPT_DIR"
echo ""

if [[ ! -x "$PYTHON" ]]; then
    echo "ERREUR : environnement Python introuvable."
    echo ""
    echo "Vérifie que le dossier .venv existe dans :"
    echo "$SCRIPT_DIR"
    echo ""
    echo "Journal : $BOOTSTRAP_LOG"
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
    echo "Journal : $BOOTSTRAP_LOG"
    echo ""
    read -r
    exit 1
}

cd "$SCRIPT_DIR" || {
    echo "ERREUR : impossible d'ouvrir le dossier du programme."
    exit 1
}

echo ""
echo "Démarrage de IA-TB_Dev_Updater..."
echo "Journal bootstrap : $BOOTSTRAP_LOG"
echo ""

"$PYTHON" "$SCRIPT_DIR/main.py"
EXIT_CODE=$?

echo ""
echo "IA-TB_Dev_Updater terminé avec le code : $EXIT_CODE"
echo "Fin : $(date '+%Y-%m-%d %H:%M:%S')"

if [[ $EXIT_CODE -ne 0 ]]; then
    echo "Consulte les journaux dans : $LOG_DIR"
    read -r
fi

exit $EXIT_CODE
