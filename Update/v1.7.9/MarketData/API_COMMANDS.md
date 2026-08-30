# IA-TB v1.7.9 — Catalogue des commandes Market Data

Ce fichier est la référence du patch v1.7.9 pour les capacités des APIs de marché connues par IA-TB.

Trois états sont utilisés :

- `IMPLEMENTED` : commande réellement utilisable par le registre Market Data v1.7.9.
- `LEGACY_IMPLEMENTED` : capacité déjà présente dans un connecteur IA-TB antérieur/parallèle, mais pas encore migrée vers ce registre.
- `UPSTREAM_AVAILABLE` : fonction documentée par l'API source mais pas encore branchée dans IA-TB.

Le catalogue runtime est exposé par :

- `GET /capabilities`
- `GET /capabilities?provider=DEFILLAMA`

Les commandes analytiques génériques sont exécutées par :

- `POST /command`
- Corps : `{ "provider":"DEFILLAMA", "command":"defillama.protocols.list", "arguments":{} }`

> Périmètre : données de marché et analytics. Les commandes privées de compte, dépôt, retrait et exécution d'ordres restent dans les connecteurs de trading et ne sont volontairement pas mélangées à ce catalogue Market Data.

## GMX

- `market.candles` — LEGACY_IMPLEMENTED
- `market.tickers` — LEGACY_IMPLEMENTED
- `market.tokens` — LEGACY_IMPLEMENTED
- `market.markets` — UPSTREAM_AVAILABLE
- `market.markets.info` — UPSTREAM_AVAILABLE
- `market.markets.state` — UPSTREAM_AVAILABLE
- `market.markets.tickers` — UPSTREAM_AVAILABLE
- `market.signed_prices.latest` — UPSTREAM_AVAILABLE
- `market.rates` — UPSTREAM_AVAILABLE

## Binance

- `market.exchange_info` — UPSTREAM_AVAILABLE
- `market.orderbook.depth` — UPSTREAM_AVAILABLE
- `market.trades.recent` — UPSTREAM_AVAILABLE
- `market.trades.historical` — UPSTREAM_AVAILABLE
- `market.trades.aggregate` — UPSTREAM_AVAILABLE
- `market.candles` — LEGACY_IMPLEMENTED
- `market.ui_klines` — UPSTREAM_AVAILABLE
- `market.avg_price` — UPSTREAM_AVAILABLE
- `market.ticker.price` — UPSTREAM_AVAILABLE
- `market.ticker.book` — UPSTREAM_AVAILABLE
- `market.ticker.24h` — UPSTREAM_AVAILABLE
- `market.ticker.trading_day` — UPSTREAM_AVAILABLE
- `market.ticker.rolling_window` — UPSTREAM_AVAILABLE

## Coinbase

- `market.products.list` — UPSTREAM_AVAILABLE
- `market.product.get` — UPSTREAM_AVAILABLE
- `market.candles` — LEGACY_IMPLEMENTED
- `market.trades` — UPSTREAM_AVAILABLE
- `market.orderbook` — UPSTREAM_AVAILABLE
- `market.ticker` — UPSTREAM_AVAILABLE
- `market.level2` — UPSTREAM_AVAILABLE
- `market.market_trades` — UPSTREAM_AVAILABLE

## OKX

- `market.tickers` — UPSTREAM_AVAILABLE
- `market.orderbook` — UPSTREAM_AVAILABLE
- `market.candles` — LEGACY_IMPLEMENTED
- `market.history_candles` — UPSTREAM_AVAILABLE
- `market.index_ticker` — UPSTREAM_AVAILABLE
- `market.index_candles` — UPSTREAM_AVAILABLE
- `market.price_limit` — UPSTREAM_AVAILABLE
- `market.funding_rate` — UPSTREAM_AVAILABLE
- `market.funding_rate_history` — UPSTREAM_AVAILABLE
- `market.mark_price` — UPSTREAM_AVAILABLE
- `market.open_interest` — UPSTREAM_AVAILABLE
- `market.trades` — UPSTREAM_AVAILABLE

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

- `defillama.batch_historical` — endpoint gratuit, câblage POST différé
- `defillama.pro.yields.borrow` — Pro
- `defillama.pro.yields.perps` — Pro
- `defillama.pro.unlocks` — Pro
- `defillama.pro.hacks` — Pro
- `defillama.pro.raises` — Pro

## Règle d'architecture

Un provider ne doit jamais prétendre fournir une capacité qu'il ne possède pas réellement. DefiLlama est donc déclaré `candleCapable:false` : ses métriques DeFi restent complémentaires et ne remplacent pas silencieusement les OHLCV natifs des CEX/DEX.

Le catalogue n'expose que les opérations de **Market Data / analytics**. Les APIs complètes des exchanges peuvent proposer des centaines d'opérations privées supplémentaires ; elles sont gérées séparément par Trading Engine / connecteurs et devront être cataloguées dans leur propre registre de commandes de trading.
