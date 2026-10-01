#!/bin/bash
cd "$(dirname "$0")" || exit 1
printf '%s\n' "IA-TB: start_with_kraken.command est un alias de compatibilite."
printf '%s\n' "Kraken est maintenant initialise par le demarrage canonique v2."
exec /bin/bash ./start.command
