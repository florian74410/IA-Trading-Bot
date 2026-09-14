'use strict';
var assert=require('assert'),DF=require('../Protection/market_data_firewall');
function base(extra){return Object.assign({provider:'KRAKEN_PUBLIC_REFERENCE',source:'KRAKEN_PUBLIC_REFERENCE',provenance:'KRAKEN_PUBLIC_REFERENCE',type:'PRICE',symbol:'BTC/EUR',timestamp:Date.now(),price:100},extra||{});}
var fw=new DF({maxPriceJumpPct:20,maxSpreadPct:10,duplicateWindowMs:0});
assert.equal(fw.inspect(base()).decision,'PASS');
var jump=fw.inspect(base({price:150,timestamp:Date.now()+1}));assert.equal(jump.decision,'REJECT');assert(jump.issues.some(function(x){return x.code==='PRICE_JUMP_EXCEEDED';}));
var spreadFw=new DF({maxPriceJumpPct:1000,maxSpreadPct:2,duplicateWindowMs:0});
var spread=spreadFw.inspect(base({price:100,bid:95,ask:105}));assert.equal(spread.decision,'REJECT');assert(spread.issues.some(function(x){return x.code==='SPREAD_EXCEEDED';}));
var invFw=new DF({maxPriceJumpPct:1000,maxSpreadPct:100,duplicateWindowMs:0});
var inverted=invFw.inspect(base({bid:101,ask:99}));assert.equal(inverted.decision,'REJECT');assert(inverted.issues.some(function(x){return x.code==='BID_ASK_INVERTED';}));
var obs=new DF({mode:'OBSERVATION',maxPriceJumpPct:1,duplicateWindowMs:0});obs.inspect(base({price:100}));var warn=obs.inspect(base({price:120,timestamp:Date.now()+1}));assert.equal(warn.decision,'WARN');
console.log('PASS Market Data Firewall price jump + bid/ask + spread');
