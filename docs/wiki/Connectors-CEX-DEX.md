# Connecteurs CEX / DEX

Cette page recense les règles communes appliquées aux connecteurs de IA-TB.

## Contrat minimum d'un connecteur

Chaque nouveau CEX ou DEX doit être intégré comme un bloc cohérent comprenant, lorsque la plateforme le permet :

- marchés / paires ;
- prix ;
- OHLC / OHLCV ;
- volumes propres à la plateforme ;
- état du provider / health check ;
- intégration Market Data ;
- intégration Chart Viewer ;
- paramètres privés dans `Settings > API` ;
- test de connexion lorsque pertinent.

La provenance des données doit toujours rester identifiable. Un `BTC/USD Coinbase` ne doit pas être mélangé silencieusement avec un `BTC/USDT Binance`.

## Types de providers

Les connecteurs de données peuvent utiliser différents modes de transport. Depuis la v1.7.8, IA-TB reconnaît le type `SOCKET` pour les providers reposant sur un flux WebSocket persistant. Une API HTTP peut être utilisée en parallèle pour l'historique ou les métadonnées sans changer la catégorie du provider temps réel.

## Connecteurs actuellement prévus / intégrés

### Binance

- Type : CEX
- Market Data : oui
- OHLCV : oui
- Volume : oui
- Chart Viewer : oui
- Paramètres privés : `Settings > API`

### GMX

- Type : DEX
- Market Data : oui
- Données propres au protocole utilisées lorsque disponibles
- Chart Viewer : oui
- Paramètres privés : `Settings > API` lorsque nécessaires

### Kraken

- Type : CEX
- Market Data : oui
- Provider de référence par défaut du registre Market Data
- Add-on Kraken conservé dans le build

### Coinbase

- Type : CEX
- Market Data : oui
- OHLCV : oui
- Volume : oui
- Chart Viewer : oui
- Paramètres privés : `Settings > API`

### OKX

- Type : CEX
- Market Data : oui
- OHLCV : oui
- Volume : oui
- Chart Viewer : oui
- Paramètres privés : `Settings > API`

### Hyperliquid

- Type : DEX / plateforme de trading on-chain
- Provider Market Data : `SOCKET`
- Première intégration `SOCKET` : v1.7.8
- Historique OHLCV : `candleSnapshot`
- Temps réel : WebSocket `candle`
- Abonnements provider disponibles : `trades`, `l2Book`
- Volumes natifs conservés avec provenance Hyperliquid
- État de connexion et fraîcheur exposés par `/providers` et `/health`

## Ajout d'un futur connecteur

L'ajout d'un nouveau CEX/DEX n'est pas considéré comme terminé tant que son Market Data, ses données OHLC/OHLCV, ses volumes et sa documentation Wiki n'ont pas été traités selon le protocole de release.

Pour un futur provider `SOCKET`, la documentation doit aussi préciser au minimum : URL/transport, types d'abonnements, stratégie de reconnexion, fraîcheur du dernier événement et comportement de repli historique.
