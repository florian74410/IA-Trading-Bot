# Changelog fonctionnel

Cette page donne une vue humaine des changements importants. Le détail technique reste dans les commits et les releases GitHub.

## v1.7.8

- ajout du type de provider `SOCKET` pour les flux WebSocket persistants ;
- intégration d'Hyperliquid comme premier provider Market Data `SOCKET` ;
- historique OHLCV Hyperliquid via `candleSnapshot`, complété ensuite par le flux WebSocket `candle` ;
- conservation des volumes natifs Hyperliquid avec provenance explicite ;
- ajout d'un registre Market Data multi-provider avec Kraken comme provider de référence par défaut ;
- cache Market Data séparé par provider / symbole / timeframe et borné pour limiter l'empreinte mémoire ;
- enrichissement des endpoints `/providers` et `/health` avec état de connexion, dernier événement et erreurs ;
- ajout des endpoints de diagnostic `/active`, `/refresh` et `/cache/clear` ;
- ajout de la dépendance `ws@8.18.0` limitée au module MarketData ;
- `install_runtime.command` installe la dépendance MarketData lorsque nécessaire ;
- maintien de la compatibilité macOS High Sierra / Intel et Node.js 16.20.2.

## v1.7.4

- extension de l'architecture multi-exchange ;
- prise en charge documentaire de Coinbase et OKX ;
- règle obligatoire : tout nouveau CEX/DEX apporte parallèlement ses données OHLC/OHLCV et volumes propres ;
- centralisation de tous les paramètres requis par les connecteurs dans `Settings > API` ;
- renforcement du protocole de release et de compatibilité des patchs ;
- mise en place de la documentation Wiki versionnée.

## Politique

Lorsqu'une nouvelle version modifie le comportement utilisateur, l'architecture, un connecteur, les Settings, l'Update Manager ou la sécurité, cette page et les pages concernées doivent être mises à jour dans la même release.
