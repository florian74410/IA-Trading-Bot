'use strict';
var assert=require('assert'),Contract=require('../Normalizer/market_data_contract'),Projection=require('../Normalizer/data_projection');
var a=Contract.normalize({exchange:'kraken',symbol:'btcusd',interval:'5m',data:['volume']});
assert.strictEqual(a.provider,'KRAKEN');assert.strictEqual(a.symbol,'BTCUSD');assert.strictEqual(a.timeframe,'5m');assert.deepStrictEqual(a.types,['volume']);
var all=Contract.normalize({symbol:'BTCUSD',data:['all']});['price','volume','orderbook','liquidity_zones'].forEach(function(x){assert(all.types.indexOf(x)>=0);});
var candles=[{time:1,open:10,high:12,low:9,close:11,volume:3},{time:2,open:11,high:13,low:10,close:12,volume:4}];
var p=Projection.project(['price','volume','orderbook'],{provider:'KRAKEN',timeframe:'5m',candles:candles});
assert.strictEqual(p.data.price.status,'AVAILABLE');assert.strictEqual(p.data.price.value.price,12);assert.strictEqual(p.data.volume.value.total,7);assert.strictEqual(p.data.orderbook.status,'UNAVAILABLE');
console.log('MARKET_DATA_SELECTIVE_REQUESTS_OK');
