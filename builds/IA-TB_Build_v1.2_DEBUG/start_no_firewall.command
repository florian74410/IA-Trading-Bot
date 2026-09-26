#!/bin/bash
cd "$(dirname "$0")" || exit 1
printf '%s\n' "============================================================"
printf '%s\n' " IA-TB — MODE TEST SANS PARE-FEU"
printf '%s\n' " Aucun Worker de protection Firewall ne sera initialisé."
printf '%s\n' " Le coordinateur 8017 reste en pass-through pour conserver"
printf '%s\n' " la même topologie Router / Trading / MarketData."
printf '%s\n' "============================================================"
IATB_FIREWALL_ENABLED=0 exec /bin/bash ./start.command
