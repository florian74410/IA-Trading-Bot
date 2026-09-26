'use strict';
/* IA-TB Market Data provider registry.
   All market references are owned by MarketData. No provider proxies through Core.
*/
var T=require('../Normalizer/timeframes'),Kraken=require('./kraken_provider'),GMX=require('./gmx_provider'),Binance=require('./binance_provider'),OKX=require('./okx_provider');
function spacingMeta(candles,tf){var ds=[];for(var i=1;i<(candles||[]).length;i++){var a=+candles[i-1][0],b=+candles[i][0];if(a>0&&b>a)ds.push(b-a);}ds.sort(function(a,b){return a-b});var observed=ds.length?ds[Math.floor(ds.length/2)]:0,expected=T.minutes(tf)*60000,ok=!observed||Math.abs(observed-expected)<=Math.max(1000,expected*.20);return{requestedTimeframe:T.normalize(tf),expectedSpacingMs:expected,observedSpacingMs:observed,timeframeValidated:ok};}
function attachMeta(o,tf){var m=spacingMeta(o.candles||[],tf);Object.keys(m).forEach(function(k){o[k]=m[k];});return o;}
function P(o){o=o||{};this.settings=o.settings||{};this.providers={KRAKEN:new Kraken({port:+o.krakenPort||8011}),GMX:new GMX(o.gmx||{}),BINANCE:new Binance(o.binance||{}),OKX:new OKX(o.okx||{})};this.name='MARKET_PROVIDER_REGISTRY';}
P.prototype.enabled=function(id){var p=this.settings.providers&&this.settings.providers[id];return !p||p.enabled!==false;};
P.prototype.getCandles=function(symbol,tf,source,cb){if(typeof source==='function'){cb=source;source='KRAKEN';}source=String(source||this.settings.defaultSource||'KRAKEN').toUpperCase();var p=this.providers[source];if(!p)return cb(new Error('MARKET_PROVIDER_UNKNOWN: '+source));if(!this.enabled(source))return cb(new Error('MARKET_PROVIDER_DISABLED: '+source));p.getCandles(symbol,tf,function(e,o){if(e)return cb(e);attachMeta(o,tf);if(o.timeframeValidated===false)return cb(new Error(source+'_TIMEFRAME_MISMATCH requested='+T.normalize(tf)+' observedSpacingMs='+o.observedSpacingMs));cb(null,o);});};
P.prototype.list=function(){var self=this;return Object.keys(this.providers).map(function(id){return{id:id,enabled:self.enabled(id)};});};
module.exports=P;
