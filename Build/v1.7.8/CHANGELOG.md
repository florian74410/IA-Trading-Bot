# IA-Trading-Bot v1.7.8

## Market Data / Providers
- Nouveau type de Provider `SOCKET` pour les flux WebSocket persistants.
- Hyperliquid ajoute comme premier Provider `SOCKET`.
- Historique OHLCV Hyperliquid via `candleSnapshot`, puis mise a jour temps reel via WebSocket.
- Volumes natifs Hyperliquid conserves et identifies par source.
- Nouveau registre MarketData multi-provider; Kraken reste le provider de reference par defaut.
- Endpoints `/providers` et `/health` enrichi avec type, connexion, dernier evenement et erreurs.
- Cache separe par provider et borne pour limiter la memoire.

## Runtime
- Ajout de `ws@8.18.0`, compatible Node.js 16.
- `install_runtime.command` installe la dependance MarketData si necessaire.

## Tests
- Self-test statique Hyperliquid/SOCKET et test live optionnel.

Base: v1.7.7
