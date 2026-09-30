'use strict';
/* IA-TB Market Data provider registry.
   Manifest-driven: Router/Core never hard-code exchange implementations.
*/
var path=require('path'),T=require('../Normalizer/timeframes'),Catalog=require('./provider_catalog');

function spacingMeta(candles,tf){var ds=[];for(var i=1;i<(candles||[]).length;i++){var a=+candles[i-1][0],b=+candles[i][0];if(a>0&&b>a)ds.push(b-a);}ds.sort(function(a,b){return a-b});var observed=ds.length?ds[Math.floor(ds.length/2)]:0,expected=T.minutes(tf)*60000,ok=!observed||Math.abs(observed-expected)<=Math.max(1000,expected*.20);return{requestedTimeframe:T.normalize(tf),expectedSpacingMs:expected,observedSpacingMs:observed,timeframeValidated:ok};}
function attachMeta(o,tf){var m=spacingMeta(o.candles||[],tf);Object.keys(m).forEach(function(k){o[k]=m[k];});return o;}
function safeModule(desc){var p=path.resolve(__dirname,desc.module);if(p.indexOf(path.resolve(__dirname)+path.sep)!==0)throw new Error('MARKET_PROVIDER_MODULE_FORBIDDEN: '+desc.id);return require(p);}
function providerOptions(id,o){var k=String(id||'').toLowerCase(),x=Object.assign({},o[k]||{});if(id==='KRAKEN')x.port=+o.krakenPort||8011;return x;}
function P(o){
 o=o||{};this.settings=o.settings||{};this.providers={};this.descriptors={};this.errors={};this.name='MARKET_PROVIDER_REGISTRY';
 var self=this;Catalog.load().forEach(function(d){self.descriptors[d.id]=d;try{var C=safeModule(d);self.providers[d.id]=new C(providerOptions(d.id,o));}catch(e){self.errors[d.id]=e.message;}});
}
P.prototype.enabled=function(id){id=String(id||'').toUpperCase();var d=this.descriptors[id],p=this.settings.providers&&this.settings.providers[id];if(!d)return false;if(p&&p.enabled===false)return false;return d.defaultEnabled!==false;};
P.prototype.descriptor=function(id){return this.descriptors[String(id||'').toUpperCase()]||null;};
P.prototype.normalize=function(id,capability){id=String(id||this.settings.defaultSource||'KRAKEN').toUpperCase();var d=this.descriptor(id);if(!d)throw new Error('MARKET_PROVIDER_UNKNOWN: '+id);if(capability&&d.capabilities.indexOf(String(capability).toLowerCase())<0)throw new Error('MARKET_PROVIDER_CAPABILITY_MISSING: '+id+' '+capability);return id;};
P.prototype.getCandles=function(symbol,tf,source,cb){if(typeof source==='function'){cb=source;source=this.settings.defaultSource||'KRAKEN';}var id;try{id=this.normalize(source,'candles');}catch(e){return cb(e);}var p=this.providers[id];if(!p)return cb(new Error('MARKET_PROVIDER_LOAD_FAILED: '+id+' '+(this.errors[id]||'')));if(!this.enabled(id))return cb(new Error('MARKET_PROVIDER_DISABLED: '+id));p.getCandles(symbol,tf,function(e,o){if(e)return cb(e);o=o||{};attachMeta(o,tf);if(o.timeframeValidated===false)return cb(new Error(id+'_TIMEFRAME_MISMATCH requested='+T.normalize(tf)+' observedSpacingMs='+o.observedSpacingMs));o.exchange=o.exchange||id;o.providerId=id;cb(null,o);});};
P.prototype.getTicker=function(symbol,source,cb){var id;try{id=this.normalize(source,'ticker');}catch(e){return cb(e);}var p=this.providers[id];if(!p)return cb(new Error('MARKET_PROVIDER_LOAD_FAILED: '+id+' '+(this.errors[id]||'')));if(!this.enabled(id))return cb(new Error('MARKET_PROVIDER_DISABLED: '+id));
 if(typeof p.getTicker==='function')return p.getTicker(symbol,function(e,o){if(e)return cb(e);o=o||{};o.exchange=o.exchange||id;o.providerId=id;cb(null,o);});
 if(typeof p.getCandles==='function')return p.getCandles(symbol,'1m',function(e,o){if(e)return cb(e);var a=o&&o.candles||[],x=a[a.length-1],px=x&&+x[4];if(!isFinite(px)||px<=0)return cb(new Error(id+'_TICKER_EMPTY'));cb(null,{ok:true,exchange:id,providerId:id,symbol:o.canonicalSymbol||symbol,price:px,observedAt:x[0]||Date.now(),priceSource:o.priceSource||o.provider||id});});
 if(typeof p.pairLiquidity==='function')return p.pairLiquidity(symbol,function(e,o){if(e)return cb(e);var px=+(o&&o.weightedPriceUsd||o&&o.bestPool&&o.bestPool.priceUsd);if(!isFinite(px)||px<=0)return cb(new Error(id+'_TICKER_EMPTY'));cb(null,{ok:true,exchange:id,providerId:id,symbol:o.canonicalSymbol||symbol,price:px,observedAt:o.observedAt||Date.now(),priceSource:id+'_WEIGHTED_POOL',liquidityUsd:o.liquidityUsd||null});});
 cb(new Error('MARKET_PROVIDER_TICKER_UNIMPLEMENTED: '+id));
};
P.prototype.list=function(){var self=this;return Object.keys(this.descriptors).sort().map(function(id){var d=self.descriptors[id];return{id:id,label:d.label,type:d.type,transport:d.transport,capabilities:d.capabilities.slice(),custom:!!d.custom,enabled:self.enabled(id),loaded:!!self.providers[id],error:self.errors[id]||null};});};
module.exports=P;
