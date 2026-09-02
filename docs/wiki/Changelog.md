# Changelog fonctionnel

Cette page donne une vue humaine des changements importants. Le détail technique reste dans les commits, builds et rapports QA.

## v1.8.12 — Router Protocol Normalization

- normalisation backend des communications IA-TB via **Communication Router + CP/1** ;
- aucun changement visuel associé à cette évolution ;
- composants CP/1 actifs : Indicator Engine, Trading Engine, Risk Engine, Portfolio Engine, Market Data, Liquidity Engine et Fundamental Engine ;
- nouveaux adapters CP/1 normalisés pour Market Data, Liquidity et Fundamental ;
- Fundamental Engine maintenu en mode `INFORMATION_ONLY` ;
- Trading Firewall documenté comme `SECURITY_BRIDGE`, et non comme cible métier Router directe ;
- Strategy Engine et Supervisor IA documentés `RESERVED` : contrat préparé, runtime autonome non encore présent ;
- contrat Request/Response CP/1 normalisé ;
- sécurité maintenue : localhost, token CP partagé, HMAC-SHA256, whitelist Registry et anti-replay Router ;
- interdiction du shell, des chemins de fichiers et des URL arbitraires ;
- nouvelles commandes CP/1 Market Data : `health`, `candles`, `refresh`, `active`, `cache.clear` ;
- nouvelles commandes CP/1 Liquidity : `health`, `zones`, `realtime`, `snapshot`, `liquidations`, `cache.clear` ;
- nouvelles commandes CP/1 Fundamental : `health`, `summary`, `context`, `sources`, `events`, `collect` ;
- source machine-readable : `Core/Communication/router_protocol_spec_v1.8.12.json` ;
- spec humaine : `Docs/Architecture/ROUTER_PROTOCOL_SPEC_v1.8.12.md` ;
- QA Router/CP1/Debug/Common Tools annoncée OK ; VERSION-GUARD OK 1.8.12 ; 30 fichiers visuels contrôlés sans modification.

## v1.8.11 — Unified Admin Console / Debug Control Framework v1

- une seule **Console Générale Admin** ;
- fusion des commandes Admin, logs, CP/1/Common Tools et Debug ;
- syntaxe officielle `debug <target> <action> [key=value]` ;
- cibles de base `server`, `client`, `router` et découverte dynamique des Engines/modules ;
- actions d'observation et de contrôle déclarées dans `Core/Admin/debug_commands_registry.json` ;
- actions sensibles `start`, `stop`, `restart`, `reset-safe` soumises à confirmation ;
- aucune interface shell libre ;
- audit des actions Debug dans `logs.dat` ;
- une fonction non implémentée doit retourner `UNSUPPORTED` / `NOT_ALLOWED` et ne jamais simuler une réussite.

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

Lorsqu'une nouvelle version modifie le comportement utilisateur, l'architecture, un connecteur, les Settings, l'Update Manager, la sécurité ou les contrats CP/1, cette page et les pages concernées doivent être mises à jour dans la même release.
