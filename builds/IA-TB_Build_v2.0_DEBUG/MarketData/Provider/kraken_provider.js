'use strict';
var get=require('./http_json'),S=require('../Normalizer/symbols'),T=require('../Normalizer/timeframes'),C=require('../Normalizer/candles');

function rows(o){
 var r=o&&o.result&&typeof o.result==='object'?o.result:{},k=Object.keys(r);
 for(var i=0;i<k.length;i++)if(k[i]!=='last'&&Array.isArray(r[k[i]]))return r[k[i]];
 return[];
}
function krakenError(o){
 var a=o&&Array.isArray(o.error)?o.error:[];
 return a.length?new Error(a.join(' · ')):null;
}
function P(o){
 o=o||{};
 this.base=String(o.base||'https://api.kraken.com').replace(/\/$/,'');
 this.id='KRAKEN';
}
P.prototype.getCandles=function(symbol,tf,cb){
 var pair=S.krakenPair(symbol),nt=T.normalize(tf),
     url=this.base+'/0/public/OHLC?pair='+encodeURIComponent(pair)+'&interval='+T.minutes(nt);
 get(url,{timeout:10000},function(e,o){
  if(e)return cb(e);
  var ke=krakenError(o);if(ke)return cb(ke);
  var n=C.fromKraken(rows(o));
  if(!n.candles.length)return cb(new Error('KRAKEN_OHLCV_EMPTY'));
  cb(null,{ok:true,provider:'KRAKEN_PUBLIC',exchange:'KRAKEN',canonicalSymbol:S.canonical(symbol),providerPair:pair,timeframe:nt,candles:n.candles,volumeAvailable:n.volumeAvailable===true,positiveVolumeRows:n.positiveVolumeRows||0,volumeSource:n.volumeAvailable?'KRAKEN_NATIVE':'NONE',priceSource:'KRAKEN_PUBLIC',timestampUnit:'ms'});
 });
};
module.exports=P;
