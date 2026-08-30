'use strict';
var assert=require('assert'),C=require('../MarketData/Aggregator/candle_consensus');
var t=Date.UTC(2026,7,30,0,0,0);
function build(rows,details){return C.build('BTCEUR','1h',rows,details!==false);}
var r=build([
 {source:'KRAKEN',data:{exchange:'KRAKEN',canonicalSymbol:'BTC/EUR',volumeAvailable:true,candles:[[t,100,110,90,105,120]]}},
 {source:'BINANCE',data:{exchange:'BINANCE',canonicalSymbol:'BTC/EUR',volumeAvailable:true,candles:[[t,102,112,92,107,850]]}},
 {source:'OKX',data:{exchange:'OKX',canonicalSymbol:'BTC/EUR',volumeAvailable:true,candles:[[t,101,111,91,106,410]]}},
 {source:'GMX',data:{exchange:'GMX',canonicalSymbol:'BTC/USD',volumeAvailable:false,candles:[{time:t,open:999,high:999,low:999,close:999,volume:0}]}}
]);
assert.strictEqual(r.provider,'FX');
assert.strictEqual(r.synthetic,true);
assert.strictEqual(r.canonicalSymbol,'BTC/EUR');
assert.strictEqual(r.candles.length,1);
assert.strictEqual(r.candles[0][1],101);
assert.strictEqual(r.candles[0][2],111);
assert.strictEqual(r.candles[0][3],91);
assert.strictEqual(r.candles[0][4],106);
assert.strictEqual(r.candles[0][5],1380);
assert.strictEqual(r.volumeUnit,'BTC');
assert.strictEqual(r.priceMethod,'ARITHMETIC_MEAN');
assert.strictEqual(r.volumeMethod,'SUM');
assert.strictEqual(r.details[0].volumeBySource.KRAKEN,120);
assert.strictEqual(r.details[0].volumeBySource.BINANCE,850);
assert.strictEqual(r.details[0].volumeBySource.OKX,410);
assert.ok(r.sourcesExcluded.some(function(x){return x.source==='GMX'&&x.reason==='PAIR_MISMATCH';}));
var noFake=build([{source:'GMX',data:{exchange:'GMX',canonicalSymbol:'BTC/EUR',volumeAvailable:false,candles:[{time:t,open:100,high:110,low:90,close:105,volume:9999}]}}]);
assert.strictEqual(noFake.candles[0][5],0);
assert.strictEqual(noFake.volumeAvailable,false);
console.log('FX consensus v1.7.9: PASS');
