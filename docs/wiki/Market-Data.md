# Market Data

Le Market Data Engine fournit aux autres modules les données de marché normalisées tout en conservant leur provenance.

## Types de providers

IA-TB distingue désormais plusieurs modes de fournisseurs de données. Depuis la v1.7.8, le type `SOCKET` désigne les providers utilisant un flux WebSocket persistant pour les mises à jour temps réel. L'historique peut toujours être récupéré par une API HTTP lorsque la plateforme l'impose.

Hyperliquid est le premier provider `SOCKET` intégré.

## Données minimales par connecteur

Pour tout nouveau CEX/DEX, l'intégration doit traiter lorsque la plateforme le permet :

- liste des marchés / paires ;
- prix ;
- OHLC ou OHLCV ;
- volumes propres à la plateforme ;
- timeframes disponibles ;
- timestamps et fraîcheur ;
- état du provider.

## Hyperliquid / SOCKET

La v1.7.8 ajoute un provider Market Data Hyperliquid de type `SOCKET` :

- historique OHLCV chargé via `candleSnapshot` ;
- abonnement WebSocket `candle` pour maintenir les chandeliers à jour ;
- abonnements disponibles dans le provider pour `trades` et `l2Book` ;
- volumes natifs Hyperliquid conservés avec `volumeSource: HYPERLIQUID_NATIVE` lorsqu'ils sont présents ;
- provenance explicite `provider: HYPERLIQUID`, `providerType: SOCKET`, `exchange: HYPERLIQUID` ;
- cache local borné à 1000 chandeliers par série côté provider.

Les timeframes reconnues par le provider Hyperliquid vont de `1m` à `1M`, selon les intervalles pris en charge par la plateforme.

## Registre multi-provider

Le Market Data Engine utilise un registre commun de providers. Kraken reste le provider de référence par défaut, tandis qu'un appel peut sélectionner explicitement un autre provider.

Les contextes actifs sont rafraîchis automatiquement pendant une durée limitée afin de maintenir des données récentes sans charger inutilement la mémoire.

## Endpoints de diagnostic

Depuis la v1.7.8 :

- `GET /providers` liste les providers et leur état ;
- `GET /health` retourne notamment le provider par défaut, l'état des providers, les statistiques de cache et le nombre de contextes actifs ;
- `GET /active` expose les contextes de marché actuellement suivis ;
- `POST /refresh` force le rafraîchissement d'une série ;
- `POST /cache/clear` vide le cache Market Data.

Pour un provider `SOCKET`, l'état peut inclure la connexion, le dernier événement reçu, la dernière erreur, le nombre d'abonnements et le nombre de séries mises en cache.

## Règle de provenance

Les données ne sont pas interchangeables silencieusement.

Exemples :

- `BTC/USDT @ Binance` ;
- `BTC/USD @ Coinbase` ;
- `BTC-USDT @ OKX` ;
- marché équivalent @ GMX ;
- `BTC @ Hyperliquid` avec provider `SOCKET`.

La normalisation peut fournir un symbole canonique pour l'interface, mais la source originale reste attachée au dataset.

## Déduplication

La déduplication sert à présenter les mêmes actifs de façon cohérente, pas à fusionner leurs volumes ou leurs chandeliers.

## Cache et historique

Le cache doit être borné et adapté aux contraintes de la machine cible. Les historiques importants sont chargés à la demande. En v1.7.8, le cache du service Market Data est séparé par provider, symbole et timeframe afin de préserver la provenance.

## Erreurs

Un provider indisponible doit être signalé explicitement. Le moteur ne doit pas remplacer silencieusement ses données par celles d'un autre exchange sans que l'appelant en soit informé.
