'use strict';
var assert=require('assert');
var Blockchain=require('../MarketData/Provider/blockchain_provider');
var t=Blockchain._test;

assert.strictEqual(t.pair('BTCUSD'),'BTC-USD');
assert.strictEqual(t.pair('ETH/EUR'),'ETH-EUR');
assert.strictEqual(t.pair('XBTUSD'),'BTC-USD');
assert.strictEqual(t.granularity('1m'),60);
assert.strictEqual(t.granularity('5m'),300);
assert.strictEqual(t.granularity('15m'),900);
assert.strictEqual(t.granularity('1h'),3600);
assert.strictEqual(t.granularity('6h'),21600);
assert.strictEqual(t.granularity('1d'),86400);
assert.strictEqual(t.granularity('4h'),0);

var c=t.candle([1559039640,8697.24,8700.98,8697.27,8700.98,0.431]);
assert.ok(c);
assert.strictEqual(c.time,1559039640000);
assert.strictEqual(c.open,8697.24);
assert.strictEqual(c.high,8700.98);
assert.strictEqual(c.low,8697.27);
assert.strictEqual(c.close,8700.98);
assert.strictEqual(c.volume,0.431);
assert.strictEqual(t.candle([1,2,3]),null);

var p=new Blockchain({url:'wss://127.0.0.1:1/disabled-test'});
var st=p.status();
assert.strictEqual(st.provider,'BLOCKCHAIN');
assert.strictEqual(st.type,'SOCKET');
assert.strictEqual(st.authentication,'PUBLIC_ANONYMOUS');
assert.deepStrictEqual(st.supportedGranularitySeconds,[60,300,900,3600,21600,86400]);
p.close();

console.log('Blockchain.com v1.7.9 provider tests: OK');
