# CHANGELOG — IA-Trading-Bot v1.8.0 DEV

## Base
- Dérivée de `builds/v1.7.9` stable de `main` sans modifier la v1.7.9.
- Restauration dans le nouveau build des composants v1.7.9 restés dans l'ancien staging Git `Update/v1.7.9`.

## Fonctionnalités restaurées
- CoinGecko provider et configuration API.
- DefiLlama provider.
- Blockchain.com provider historique (compatibilité; spécialisation Bitcoin on-chain à poursuivre en v1.8).
- GMX Market Data provider.
- Catalogue de capacités Market Data.
- Consensus prix et OHLCV ƒx.
- Data Collector Firewall, configuration et tests.
- Intégration Settings > Protection > Firewall issue du staging v1.7.9.
- Tests CoinGecko, DefiLlama, Blockchain, consensus et Data Collector Firewall.
- Trading Firewall v1 restauré côté service afin de ne pas perdre le travail préparé; live trading reste désactivé par défaut.

## Nouveau v1.8 — Risk Engine
- Nouveau moteur analytique sur `127.0.0.1:8019`.
- CP/1 exclusivement via Router pour Market Data, Indicator et Portfolio.
- Aucun accès direct CEX/DEX et aucune autorisation/rejet/modification d'ordre.
- Analyses position, portefeuille, stratégie et snapshot.
- Notionnel, marge, levier, perte au stop, capital à risque, exposition, concentration, PnL latent, drawdown, volatilité, VaR historique et Expected Shortfall.
- Score synthétique et avertissements analytiques destinés au Supervisor.
- Portfolio reste une dépendance optionnelle/provisoire tant que son module CP/1 n'est pas finalisé.

## Cycle de vie
- `start.command` v1.8 enveloppe le démarrage v1.7.9 pour ajouter Trading Firewall, Data Collector Firewall et Risk Engine sans réécrire le bootstrap stable.
- `stop.command` arrête aussi les services v1.8.
- Admin service registry enrichi avec les ports 8017, 8018 et 8019.

## Validation
- Syntaxe et calculs purs du Risk Engine validés localement.
- Validation end-to-end CP/1, démarrage complet et macOS High Sierra encore requise avant marquage STABLE.
