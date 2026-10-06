'use strict';
var get=require('./http_json'),S=require('../Normalizer/symbols'),T=require('../Normalizer/timeframes');
var MAP={'1m':'1m','5m':'5','15m':'15m','30m':'30m','1h':'1H','4h':'4H','1d':'1D','1w':'1W'};
function P(o){o=o||{};this.base=String(o.base||'https://www.okx.com').replace(/\/$/,'');this.id='OKX';}
P.prototype.getCandles=function(symbol,tf,cb){
 var nt=T.normalize(tf),parts=S.split(symbol),baseAsset=String(parts&&parts.base||''),quoteAsset=String(parts&&parts.quote||''),bar=MAP[nt]||'1H',self=this;
 if(!baseAsset||!quoteAsset)return cb(new Error('OKX_SYMBOL_INVALID'));
 function urlFor(inst){return self.base+'/api/v5/market/candles?instId='+encodeURIComponent(inst)+'&bar='+encodeURIComponent(bar)+'&limit=300';}
 function parse(data,pair){
  var a=data&&Array.isArray(data.data)?data.data:[],out=[];
  for(var i=0;i<a.length;i++){var x=a[i];if(!Array.isArray(x)||x.length<6)continue;var row=[+x[0],+x[1],+x[2],+x[3],+x[4],+x[5]];if(row.every(isFinite))out.push(row);}
  out.sort(function(a,b){return a[0]-b[0];});
  if(!out.length)return cb(new Error('OKX_OHLCV_EMPTY'));
  cb(null,{ok:true,provider:'OKX_PUBLIC',exchange:'OKX',canonicalSymbol:S.canonical(symbol),providerPair:pair,timeframe:nt,candles:out,volumeAvailable:true,volumeSource:'OKX_NATIVE',priceSource:'OKX_PUBLIC',timestampUnit:'ms'});
 }
 var primary=baseAsset+'-'+quoteAsset;
 get(urlFor(primary),{timeout:10000},function(e,o){
  if(e)return cb(e);
  var rows=o&&Array.isArray(o.data)?o.data:[];
  if(rows.length||quoteAsset!=='USD')return parse(o,primary);
  var fallback=baseAsset+'-USDT';
  get(urlFor(fallback),{timeout:10000},function(e2,o2){if(e2)return cb(e2);parse(o2,fallback);});
 });
};
module.exports=P;
