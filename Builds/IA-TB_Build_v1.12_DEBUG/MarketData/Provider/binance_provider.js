'use strict';
var get=require('./http_json'),S=require('../Normalizer/symbols'),T=require('../Normalizer/timeframes');
var MAP={'1m':'1m','5m':'5m','15m':'15m','30m':'30m','1h':'1h','4h':'4h','1d':'1d','1w':'1w'};
function P(o){o=o||{};this.base=String(o.base||'https://api.binance.com').replace(/\/$/,'');this.id='BINANCE';}
P.prototype.getCandles=function(symbol,tf,cb){var nt=T.normalize(tf),pair=S.clean(symbol),url=this.base+'/api/v3/klines?symbol='+encodeURIComponent(pair)+'&interval='+encodeURIComponent(MAP[nt]||'1h')+'&limit=500';get(url,{timeout:10000},function(e,rows){if(e)return cb(e);if(!Array.isArray(rows)||!rows.length)return cb(new Error('BINANCE_OHLCV_EMPTY'));var out=[];for(var i=0;i<rows.length;i++){var x=rows[i];if(!Array.isArray(x)||x.length<6)continue;var r=[+x[0],+x[1],+x[2],+x[3],+x[4],+x[5]];if(r.every(isFinite))out.push(r);}if(!out.length)return cb(new Error('BINANCE_OHLCV_INVALID'));cb(null,{ok:true,provider:'BINANCE_PUBLIC',exchange:'BINANCE',canonicalSymbol:S.canonical(symbol),providerPair:pair,timeframe:nt,candles:out,volumeAvailable:true,volumeSource:'BINANCE_NATIVE',priceSource:'BINANCE_PUBLIC',timestampUnit:'ms'});});};
module.exports=P;
