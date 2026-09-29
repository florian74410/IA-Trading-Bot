'use strict';
var get=require('./http_json'),S=require('../Normalizer/symbols'),T=require('../Normalizer/timeframes');
var MAP={'1m':'1','5m':'5','15m':'15','30m':'30','1h':'60','4h':'240','1d':'D','1w':'W'};
function pair(symbol){var p=S.split(symbol),q=(p.quote==='USDC'?'USDC':'USDT');return p.base+q;}
function P(o){o=o||{};this.base=String(o.base||process.env.IATB_BYBIT_PUBLIC_BASE||'https://api.bybit.com').replace(/\/$/,'');this.id='BYBIT';}
P.prototype.getCandles=function(symbol,tf,cb){
 var nt=T.normalize(tf),ps=pair(symbol),iv=MAP[nt]||'60',url=this.base+'/v5/market/kline?category=linear&symbol='+encodeURIComponent(ps)+'&interval='+encodeURIComponent(iv)+'&limit=500';
 get(url,{timeout:10000},function(e,o){if(e)return cb(e);if(!o||+o.retCode!==0)return cb(new Error('BYBIT_API_'+String(o&&o.retCode||'INVALID')+':'+String(o&&o.retMsg||'')));
  var rows=o.result&&Array.isArray(o.result.list)?o.result.list:[],out=[];
  for(var i=0;i<rows.length;i++){var x=rows[i];if(!Array.isArray(x)||x.length<6)continue;var r=[+x[0],+x[1],+x[2],+x[3],+x[4],+x[5]];if(r.every(isFinite))out.push(r);}
  out.sort(function(a,b){return a[0]-b[0]});if(!out.length)return cb(new Error('BYBIT_OHLCV_EMPTY'));
  cb(null,{ok:true,provider:'BYBIT_PUBLIC',exchange:'BYBIT',marketType:'PERPETUAL',canonicalSymbol:S.canonical(symbol),providerPair:ps,timeframe:nt,candles:out,volumeAvailable:true,volumeSource:'BYBIT_LINEAR_NATIVE',priceSource:'BYBIT_PUBLIC',timestampUnit:'ms'});
 });
};
module.exports=P;
