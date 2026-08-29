# Market Data

Le Market Data de IA-TB conserve la provenance exacte des données utilisées.

## Principe

Chaque connecteur CEX/DEX apporte, lorsque la plateforme le permet, ses propres :

- marchés / paires ;
- prix ;
- OHLC / OHLCV ;
- volumes ;
- informations de fraîcheur / état du provider.

Les données sont ensuite normalisées pour être consommées par les différents moteurs de l'application sans perdre l'identité de leur source.

## Règle de fiabilité

Les données d'un exchange ne doivent pas être substituées silencieusement par celles d'un autre exchange.

Exemple : une série `BTC/USD Coinbase` reste identifiée comme Coinbase ; une série `BTC/USDT Binance` reste identifiée comme Binance.

## Consommateurs

Le Market Data alimente notamment :

- Chart Viewer ;
- Indicator Engine ;
- Liquidity Engine ;
- moteurs d'analyse et de stratégie.

## Ajout d'un connecteur

Lorsqu'un nouveau CEX/DEX est ajouté, l'intégration des données OHLC/OHLCV et des volumes fait partie du même changement de version que le connecteur lui-même.
