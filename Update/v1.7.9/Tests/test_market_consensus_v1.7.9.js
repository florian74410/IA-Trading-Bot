'use strict';
var assert=require('assert'),Consensus=require('../MarketData/Aggregator/price_consensus');
function registry(map){return{get:function(id){return map[id]||null;}};}
var r=registry({KRAKEN:{getPrice:function(s,cb){cb(null,{exchange:'KRAKEN',price:100,updatedAt:1,priceSource:'KRAKEN_TEST'});}},GMX:{getPrice:function(s,cb){cb(null,{exchange:'GMX',price:102,updatedAt:1,priceSource:'GMX_TEST'});}}});
Consensus.collect(r,'BTCUSD',['KRAKEN','GMX'],function(e,o){if(e)throw e;assert.strictEqual(o.price,101);assert.strictEqual(o.sourceCount,2);assert.strictEqual(o.sources.length,2);assert(o.spreadPct>1.9&&o.spreadPct<2.1);assert.deepStrictEqual(o.usedProviders,['KRAKEN','GMX']);console.log('Market consensus v1.7.9 tests: OK');});
