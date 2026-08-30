'use strict';
const assert=require('assert');
const Firewall=require('../Core/DataCollectorFirewall/data_collector_firewall');

const fw=new Firewall({maxMessageAgeMs:60000,duplicateWindowMs:1000,maxPriceJumpPct:20});
const t=Date.now();
function msg(data,extra){ return Object.assign({provider:'KRAKEN',type:'OHLCV',symbol:'BTC/EUR',timeframe:'1m',timestamp:t,provenance:'KRAKEN_NATIVE',data:data},extra||{}); }

let r=fw.inspect(msg([[t,100,110,90,105,12.5]]));
assert.strictEqual(r.decision,'PASS');

r=fw.inspect(msg([[t,100,90,95,105,12.5]],{timestamp:t+1}));
assert.strictEqual(r.decision,'REJECT');
assert.ok(r.issues.some(x=>x.code==='OHLC_INVARIANT'));

r=fw.inspect(msg([[t,100,110,90,105,-1]],{timestamp:t+2}));
assert.strictEqual(r.decision,'REJECT');
assert.ok(r.issues.some(x=>x.code==='INVALID_VOLUME'));

r=fw.inspect(msg([[t,100,110,90,105,12]],{provider:'UNKNOWN',timestamp:t+3}));
assert.strictEqual(r.decision,'REJECT');
assert.ok(r.issues.some(x=>x.code==='PROVIDER_NOT_ALLOWED'));

const obs=new Firewall({mode:'OBSERVATION',maxMessageAgeMs:60000});
r=obs.inspect(msg([[t,0,0,0,0,0]],{timestamp:t+4}));
assert.strictEqual(r.decision,'WARN');
assert.strictEqual(r.reason,'WOULD_REJECT');

console.log('PASS Data Collector Firewall v1.7.9');
