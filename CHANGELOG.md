# CHANGELOG

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
