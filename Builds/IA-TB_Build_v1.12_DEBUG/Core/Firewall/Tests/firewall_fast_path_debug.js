'use strict';
var http=require('http'),DataFirewall=require('../Protection/market_data_firewall');
var fail=0;
function ok(v,m){console.log((v?'[OK] ':'[FAIL] ')+m);if(!v)fail++;}
var fw=new DataFirewall({enabled:true,mode:'PROTECTION',providerWhitelist:['KRAKEN_PUBLIC_REFERENCE'],typeWhitelist:['OHLCV'],duplicateWindowMs:5000});
var now=Date.now(),msg={provider:'KRAKEN_PUBLIC_REFERENCE',source:'KRAKEN_PUBLIC_REFERENCE',provenance:'KRAKEN_PUBLIC_REFERENCE',type:'OHLCV',symbol:'BTC/USD',timeframe:'1m',timestamp:now,data:[[now-60000,100,102,99,101,12],[now,101,103,100,102,10]]};
var a=fw.inspect(msg,{payloadBytes:512});ok(a.decision==='PASS','valid MarketData passes');
var stale=Object.assign({},msg,{timestamp:now-120000});var b=fw.inspect(stale,{payloadBytes:512});ok(b.decision==='REJECT','stale MarketData rejected');
var bad=Object.assign({},msg,{provider:'UNTRUSTED'});var c=fw.inspect(bad,{payloadBytes:512});ok(c.decision==='REJECT','unknown provider rejected');
function runtime(){
 var q=http.get({host:'127.0.0.1',port:+(process.env.ROUTER_PORT||8021),path:'/firewall-events?audience=user&limit=5',timeout:1500},function(r){var x=[];r.on('data',function(d){x.push(d)});r.on('end',function(){var o={};try{o=JSON.parse(Buffer.concat(x).toString('utf8'))}catch(e){}ok(r.statusCode===200,'Router exposes Firewall read-only feed');ok(o.readOnly===true,'Firewall user feed is read-only');done();});});q.on('timeout',function(){q.destroy()});q.on('error',function(){console.log('[INFO] Runtime unavailable: event route skipped');done();});
}
function done(){console.log('\nFirewall Fast Path DEBUG: '+(fail?'FAIL':'PASS')+' ('+fail+' error(s))');process.exitCode=fail?1:0;}
runtime();
