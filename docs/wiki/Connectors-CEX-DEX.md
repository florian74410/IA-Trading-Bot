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

## Ajout d'un futur connecteur

L'ajout d'un nouveau CEX/DEX n'est pas considéré comme terminé tant que son Market Data, ses données OHLC/OHLCV, ses volumes et sa documentation Wiki n'ont pas été traités selon le protocole de release.
