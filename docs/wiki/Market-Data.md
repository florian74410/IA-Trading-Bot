# Market Data

Le Market Data Engine fournit aux autres modules les données de marché normalisées tout en conservant leur provenance.

## Données minimales par connecteur

Pour tout nouveau CEX/DEX, l'intégration doit traiter lorsque la plateforme le permet :

- liste des marchés / paires ;
- prix ;
- OHLC ou OHLCV ;
- volumes propres à la plateforme ;
- timeframes disponibles ;
- timestamps et fraîcheur ;
- état du provider.

## Règle de provenance

Les données ne sont pas interchangeables silencieusement.

Exemples :

- `BTC/USDT @ Binance` ;
- `BTC/USD @ Coinbase` ;
- `BTC-USDT @ OKX` ;
- marché équivalent @ GMX.

La normalisation peut fournir un symbole canonique pour l'interface, mais la source originale reste attachée au dataset.

## Déduplication

La déduplication sert à présenter les mêmes actifs de façon cohérente, pas à fusionner leurs volumes ou leurs chandeliers.

## Cache et historique

Le cache doit être borné et adapté aux contraintes de la machine cible. Les historiques importants sont chargés à la demande.

## Erreurs

Un provider indisponible doit être signalé explicitement. Le moteur ne doit pas remplacer silencieusement ses données par celles d'un autre exchange sans que l'appelant en soit informé.
