'use strict';
/* IA-TB Market Data capability catalogue v1.7.9.
   IMPLEMENTED = usable by the current IA-TB provider.
   UPSTREAM_AVAILABLE = documented by upstream API but not yet wired into IA-TB.
   Scope is Market Data / analytics only; private account/trading operations are intentionally excluded.
*/
function c(command,status,transport,auth,notes){return{command:command,status:status,transport:transport,auth:auth||'NONE',notes:notes||''};}
var CATALOG={
 REFERENCE:{provider:'KRAKEN_PUBLIC_REFERENCE',commands:[
  c('market.candles','IMPLEMENTED','REST','NONE','OHLC via Kraken reference adapter'),
  c('market.ticker','UPSTREAM_AVAILABLE','REST/WS','NONE'),
  c('market.trades','UPSTREAM_AVAILABLE','REST/WS','NONE'),
  c('market.orderbook.l2','UPSTREAM_AVAILABLE','REST/WS','NONE'),
  c('market.spread','UPSTREAM_AVAILABLE','REST','NONE'),
  c('market.assets','UPSTREAM_AVAILABLE','REST','NONE'),
  c('market.asset_pairs','UPSTREAM_AVAILABLE','REST','NONE'),
  c('market.instrument','UPSTREAM_AVAILABLE','WS','NONE')
 ]},
 HYPERLIQUID:{provider:'HYPERLIQUID',commands:[
  c('market.candles','IMPLEMENTED','REST+WS','NONE','candleSnapshot + candle subscription'),
  c('market.stream.candles','IMPLEMENTED','WS','NONE'),
  c('market.stream.trades','IMPLEMENTED','WS','NONE'),
  c('market.stream.orderbook.l2','IMPLEMENTED','WS','NONE'),
  c('market.all_mids','UPSTREAM_AVAILABLE','REST/INFO','NONE'),
  c('market.asset_contexts','UPSTREAM_AVAILABLE','REST/INFO','NONE'),
  c('market.bbo','UPSTREAM_AVAILABLE','WS','NONE')
 ]},
 COINGECKO:{provider:'COINGECKO',commands:[
  c('market.ohlc','IMPLEMENTED','REST','OPTIONAL_DEMO_KEY','Mapped to IA-TB candles with volume unavailable'),
  c('market.simple_price','UPSTREAM_AVAILABLE','REST','OPTIONAL_KEY'),
  c('market.coins_markets','UPSTREAM_AVAILABLE','REST','OPTIONAL_KEY'),
  c('market.market_chart','UPSTREAM_AVAILABLE','REST','OPTIONAL_KEY'),
  c('market.market_chart_range','UPSTREAM_AVAILABLE','REST','OPTIONAL_KEY')
 ]},
 BLOCKCHAIN:{provider:'BLOCKCHAIN.COM',commands:[
  c('market.candles','IMPLEMENTED','WS','NONE','prices channel'),
  c('market.heartbeat','UPSTREAM_AVAILABLE','WS','NONE'),
  c('market.orderbook.l2','UPSTREAM_AVAILABLE','WS','NONE'),
  c('market.orderbook.l3','UPSTREAM_AVAILABLE','WS','NONE'),
  c('market.symbols','UPSTREAM_AVAILABLE','WS','NONE'),
  c('market.ticker','UPSTREAM_AVAILABLE','WS','NONE'),
  c('market.trades','UPSTREAM_AVAILABLE','WS','NONE')
 ]},
 DEFILLAMA:{provider:'DEFILLAMA',commands:[
  c('defillama.protocols.list','IMPLEMENTED','REST','NONE'),
  c('defillama.protocol.get','IMPLEMENTED','REST','NONE'),
  c('defillama.protocol.tvl','IMPLEMENTED','REST','NONE'),
  c('defillama.chains.list','IMPLEMENTED','REST','NONE'),
  c('defillama.chain.history','IMPLEMENTED','REST','NONE'),
  c('defillama.prices.current','IMPLEMENTED','REST','NONE'),
  c('defillama.prices.historical','IMPLEMENTED','REST','NONE'),
  c('defillama.prices.chart','IMPLEMENTED','REST','NONE'),
  c('defillama.prices.percentage','IMPLEMENTED','REST','NONE'),
  c('defillama.prices.first','IMPLEMENTED','REST','NONE'),
  c('defillama.block.by_timestamp','IMPLEMENTED','REST','NONE'),
  c('defillama.stablecoins.list','IMPLEMENTED','REST','NONE'),
  c('defillama.stablecoins.history_all','IMPLEMENTED','REST','NONE'),
  c('defillama.stablecoins.history_chain','IMPLEMENTED','REST','NONE'),
  c('defillama.stablecoin.get','IMPLEMENTED','REST','NONE'),
  c('defillama.stablecoins.chains','IMPLEMENTED','REST','NONE'),
  c('defillama.stablecoins.prices','IMPLEMENTED','REST','NONE'),
  c('defillama.yields.pools','IMPLEMENTED','REST','NONE'),
  c('defillama.yields.chart','IMPLEMENTED','REST','NONE'),
  c('defillama.dex.overview','IMPLEMENTED','REST','NONE'),
  c('defillama.dex.overview_chain','IMPLEMENTED','REST','NONE'),
  c('defillama.dex.summary','IMPLEMENTED','REST','NONE'),
  c('defillama.options.overview','IMPLEMENTED','REST','NONE'),
  c('defillama.options.overview_chain','IMPLEMENTED','REST','NONE'),
  c('defillama.options.summary','IMPLEMENTED','REST','NONE'),
  c('defillama.open_interest.overview','IMPLEMENTED','REST','NONE'),
  c('defillama.fees.overview','IMPLEMENTED','REST','NONE'),
  c('defillama.fees.overview_chain','IMPLEMENTED','REST','NONE'),
  c('defillama.fees.summary','IMPLEMENTED','REST','NONE'),
  c('defillama.batch_historical','UPSTREAM_AVAILABLE','REST','NONE','Free endpoint; POST wiring deferred'),
  c('defillama.pro.yields.borrow','UPSTREAM_AVAILABLE','REST','PRO_API_KEY','Paid Pro API'),
  c('defillama.pro.yields.perps','UPSTREAM_AVAILABLE','REST','PRO_API_KEY','Paid Pro API'),
  c('defillama.pro.unlocks','UPSTREAM_AVAILABLE','REST','PRO_API_KEY','Paid Pro API'),
  c('defillama.pro.hacks','UPSTREAM_AVAILABLE','REST','PRO_API_KEY','Paid Pro API'),
  c('defillama.pro.raises','UPSTREAM_AVAILABLE','REST','PRO_API_KEY','Paid Pro API')
 ]}
};
function all(){return JSON.parse(JSON.stringify(CATALOG));}
function forProvider(name){var k=String(name||'').toUpperCase();if(k==='KRAKEN'||k==='KRAKEN_PUBLIC_REFERENCE')k='REFERENCE';if(k==='BLOCKCHAIN_COM')k='BLOCKCHAIN';return CATALOG[k]?JSON.parse(JSON.stringify(CATALOG[k])):null;}
module.exports={all:all,forProvider:forProvider};
