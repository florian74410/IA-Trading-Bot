# CHANGELOG

## v1.7.8

### Market Data / Providers
- Nouveau type de Provider `SOCKET` pour les flux WebSocket persistants.
- Hyperliquid devient le premier Provider MarketData de type `SOCKET`.
- Historique OHLCV Hyperliquid via `candleSnapshot`, puis mise a jour temps reel par WebSocket.
- Volumes natifs Hyperliquid conserves et identifies par source.
- `/providers` et `/health` exposent le type, l'etat de connexion, le dernier evenement et les erreurs.
- Kraken reste le provider de reference par defaut.

### Runtime
- Ajout de `ws@8.18.0` limite au module MarketData, compatible Node.js 16.
- `install_runtime.command` installe automatiquement la dependance si necessaire.

### Compatibilite
- Base v1.7.7 conservee.
- macOS High Sierra / Intel et Node.js v16.20.2 conserves.

## v1.7.4

### Ajouts
- Coinbase : Market Data, OHLCV, volumes, Chart Viewer et configuration API.
- OKX : Market Data, OHLCV, volumes, Chart Viewer et configuration API.

### Modifications
- Market Data devient explicitement source-aware pour GMX, Kraken, Binance, Coinbase et OKX.
- Indicator Engine et Liquidity Engine utilisent l'exchange sélectionné.
- Les clés de cache incluent la provenance de l'exchange.

### Sécurité / Configuration
- Les paramètres privés Coinbase et OKX sont centralisés dans `Settings > API`.
- Les données publiques de marché peuvent fonctionner sans clés privées lorsque l'API concernée le permet.
- Le stockage des longues clés privées Coinbase reste compatible avec le coffre de secrets existant.

### Compatibilité
- Patch construit pour `1.7.3 -> 1.7.4`.
- Validation avec l'UpdateManager réel de la v1.7.3.
- Données utilisateur protégées non incluses dans le payload.

### Documentation
- Wiki impact : Connecteurs CEX/DEX, Market Data, Chart Viewer, Settings/API, Versionnage/Releases.
