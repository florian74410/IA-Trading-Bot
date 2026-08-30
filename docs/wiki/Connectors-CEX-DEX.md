# Connecteurs CEX / DEX et sources de données

Cette page recense les règles communes appliquées aux connecteurs et distingue les exchanges des sources analytiques complémentaires.

## Contrat minimum d'un CEX / DEX

Chaque nouveau CEX ou DEX doit traiter, lorsque la plateforme le permet : marchés/paires, prix, OHLC/OHLCV, volumes propres à la plateforme, health check, intégration Market Data, Chart Viewer, paramètres privés dans `Settings > API` et test de connexion lorsque pertinent.

La provenance doit toujours rester identifiable. Deux marchés proches ne sont pas fusionnés silencieusement.

## Types de providers

IA-TB utilise des providers API et `SOCKET`. `SOCKET` désigne un flux WebSocket persistant ; HTTP peut rester utilisé pour l'historique ou les métadonnées.

## Sources Exchange / trading

### Binance

CEX historique avec Market Data, OHLCV, volumes, Chart Viewer et paramètres privés centralisés.

### Coinbase

CEX historique avec Market Data, OHLCV, volumes, Chart Viewer et paramètres privés centralisés.

### OKX

CEX historique avec Market Data, OHLCV, volumes, Chart Viewer et paramètres privés centralisés.

### Kraken

CEX et source explicite du Market Data Collector v1.7.9. Kraken fournit OHLCV et prix live et reste le provider de référence du registre actuel.

### GMX

DEX et source explicite du Collector v1.7.9 pour OHLC et prix Oracle. Aucun volume GMX absent n'est fabriqué. Les paramètres privés restent dans `Settings > API` lorsqu'ils sont nécessaires.

### Hyperliquid

DEX / plateforme on-chain et premier provider Market Data `SOCKET` depuis la v1.7.8. Historique via `candleSnapshot`, temps réel via WebSocket `candle`, abonnements `trades` et `l2Book`, volumes natifs conservés et état de connexion exposé.

## Sources complémentaires v1.7.9

### CoinGecko

Provider API complémentaire `COINGECKO`. Sa provenance est séparée des CEX/DEX et aucun volume d'exchange n'est inventé. La clé éventuelle est configurée dans `Settings > API` et transmise au Market Data uniquement en mémoire.

### Blockchain.com

Provider `BLOCKCHAIN`. L'implémentation actuelle utilise le flux public Blockchain.com Exchange avec OHLCV/volumes natifs et refus explicite des granularités non supportées. Un travail v1.7.9 reste prévu pour recentrer la source sur le rôle Bitcoin / on-chain retenu.

### DefiLlama

Provider analytique `DEFILLAMA`, déclaré `candleCapable:false`. Il fournit notamment TVL, prix tokens, stablecoins, rendement, volumes DEX/options, open interest, fees et revenue, sans remplacer les chandeliers natifs des exchanges.

## Source virtuelle ƒx

`ƒx Consensus` n'est ni un CEX ni un DEX. C'est une source virtuelle calculée dans le Market Data Collector à partir de plusieurs sources compatibles. Elle conserve la provenance des contributions et n'invente aucune donnée manquante.

## Ajout d'un futur connecteur

Un nouveau CEX/DEX n'est considéré terminé que lorsque ses données, sa provenance, son intégration UI pertinente, ses diagnostics, ses tests et sa documentation ont été traités. Pour un provider `SOCKET`, documenter également le transport, les abonnements, la reconnexion, la fraîcheur et le repli historique.
