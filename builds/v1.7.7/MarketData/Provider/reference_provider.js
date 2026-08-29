'use strict';
/* IA-TB v1.7.2 · Market Data reference provider
   Keeps the v1.7 reference behavior: Kraken Public is the OHLCV reference used by
   Indicator Engine. This preserves real volume when Kraken supplies it and avoids
   fabricating/proxying volume from another market. Refresh policy lives in the
   existing Market Data service (periodic + force on demand).
*/
var http=require('http'),S=require('../Normalizer/symbols'),T=require('../Normalizer/timeframes'),C=require('../Normalizer/candles');
function get(port,pathname,cb){var done=false,q=http.get({host:'127.0.0.1',port:port,path:pathname,timeout:10000,headers:{Accept:'application/json'}},function(r){var a=[];r.on('data',function(c){a.push(c)});r.on('end',function(){if(done)return;done=true;var o;try{o=JSON.parse(Buffer.concat(a).toString('utf8')||'{}');}catch(e){return cb(new Error('JSON provider invalide'));}if((r.statusCode||500)>=400||o.ok===false)return cb(new Error(o.error||('HTTP '+r.statusCode)));cb(null,o);});});q.on('timeout',function(){q.destroy(new Error('Provider timeout'));});q.on('error',function(e){if(done)return;done=true;cb(e);});}
function rows(o){var k=Object.keys(o||{});for(var i=0;i<k.length;i++)if(k[i]!=='last'&&Array.isArray(o[k[i]]))return o[k[i]];return[];}
function P(o){o=o||{};this.krakenPort=+o.krakenPort||8011;this.name='KRAKEN_PUBLIC_REFERENCE';}
P.prototype.getCandles=function(symbol,tf,cb){var pair=S.krakenPair(symbol),canonical=S.canonical(symbol),nt=T.normalize(tf),mins=T.minutes(nt);get(this.krakenPort,'/ohlc?pair='+encodeURIComponent(pair)+'&interval='+mins,function(e,o){if(e)return cb(e);var n=C.fromKraken(rows(o));if(!n.candles.length)return cb(new Error('Pas de OHLCV référence pour '+canonical));cb(null,{ok:true,provider:'KRAKEN_PUBLIC_REFERENCE',exchange:'KRAKEN',canonicalSymbol:canonical,providerPair:pair,timeframe:nt,candles:n.candles,volumeAvailable:n.volumeAvailable===true,positiveVolumeRows:n.positiveVolumeRows||0,volumeSource:n.volumeAvailable===true?'KRAKEN_NATIVE':'NONE',priceSource:'KRAKEN_PUBLIC_REFERENCE',timestampUnit:'ms'});});};
module.exports=P;
