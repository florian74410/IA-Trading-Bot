# IA-TB v1.7.9 — Catalogue des commandes Market Data

Ce fichier est la référence du patch v1.7.9 pour les capacités des providers Market Data.

Deux états sont utilisés :

- `IMPLEMENTED` : commande réellement utilisable par IA-TB.
- `UPSTREAM_AVAILABLE` : fonction documentée par l'API source mais pas encore branchée dans IA-TB.

Le catalogue exécutable est exposé par :

- `GET /capabilities`
- `GET /capabilities?provider=DEFILLAMA`

Les commandes analytiques génériques sont exécutées par :

- `POST /command`
- Corps : `{ "provider":"DEFILLAMA", "command":"defillama.protocols.list", "arguments":{} }`

> Périmètre : données de marché et analytics. Les commandes privées de compte, dépôt, retrait et exécution d'ordres ne sont volontairement pas mélangées à ce catalogue Market Data.

## Kraken / Reference

- `market.candles` — IMPLEMENTED
- `market.ticker` — UPSTREAM_AVAILABLE
- `market.trades` — UPSTREAM_AVAILABLE
- `market.orderbook.l2` — UPSTREAM_AVAILABLE
- `market.spread` — UPSTREAM_AVAILABLE
- `market.assets` — UPSTREAM_AVAILABLE
- `market.asset_pairs` — UPSTREAM_AVAILABLE
- `market.instrument` — UPSTREAM_AVAILABLE

## Hyperliquid

- `market.candles` — IMPLEMENTED
- `market.stream.candles` — IMPLEMENTED
- `market.stream.trades` — IMPLEMENTED
- `market.stream.orderbook.l2` — IMPLEMENTED
- `market.all_mids` — UPSTREAM_AVAILABLE
- `market.asset_contexts` — UPSTREAM_AVAILABLE
- `market.bbo` — UPSTREAM_AVAILABLE

## CoinGecko

- `market.ohlc` — IMPLEMENTED
- `market.simple_price` — UPSTREAM_AVAILABLE
- `market.coins_markets` — UPSTREAM_AVAILABLE
- `market.market_chart` — UPSTREAM_AVAILABLE
- `market.market_chart_range` — UPSTREAM_AVAILABLE

## Blockchain.com Exchange

- `market.candles` — IMPLEMENTED (`prices`)
- `market.heartbeat` — UPSTREAM_AVAILABLE
- `market.orderbook.l2` — UPSTREAM_AVAILABLE
- `market.orderbook.l3` — UPSTREAM_AVAILABLE
- `market.symbols` — UPSTREAM_AVAILABLE
- `market.ticker` — UPSTREAM_AVAILABLE
- `market.trades` — UPSTREAM_AVAILABLE

## DefiLlama — commandes gratuites implémentées

### TVL / Protocoles

- `defillama.protocols.list`
- `defillama.protocol.get`
- `defillama.protocol.tvl`
- `defillama.chains.list`
- `defillama.chain.history`

### Prix tokens

- `defillama.prices.current`
- `defillama.prices.historical`
- `defillama.prices.chart`
- `defillama.prices.percentage`
- `defillama.prices.first`
- `defillama.block.by_timestamp`

### Stablecoins

- `defillama.stablecoins.list`
- `defillama.stablecoins.history_all`
- `defillama.stablecoins.history_chain`
- `defillama.stablecoin.get`
- `defillama.stablecoins.chains`
- `defillama.stablecoins.prices`

### Yields

- `defillama.yields.pools`
- `defillama.yields.chart`

### DEX / Options / Open Interest

- `defillama.dex.overview`
- `defillama.dex.overview_chain`
- `defillama.dex.summary`
- `defillama.options.overview`
- `defillama.options.overview_chain`
- `defillama.options.summary`
- `defillama.open_interest.overview`

### Fees / Revenue

- `defillama.fees.overview`
- `defillama.fees.overview_chain`
- `defillama.fees.summary`

### DefiLlama disponible upstream mais pas encore branché

- `defillama.batch_historical` — free endpoint, POST wiring deferred
- `defillama.pro.yields.borrow` — Pro
- `defillama.pro.yields.perps` — Pro
- `defillama.pro.unlocks` — Pro
- `defillama.pro.hacks` — Pro
- `defillama.pro.raises` — Pro

## Règle d'architecture

Un provider ne doit jamais prétendre fournir une capacité qu'il ne possède pas réellement. DefiLlama est donc déclaré `candleCapable:false` : ses métriques DeFi restent complémentaires et ne remplacent pas silencieusement les OHLCV natifs des CEX/DEX.
