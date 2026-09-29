'use strict';
var Cache=require('../Cache/market_cache');
function C(o){o=o||{};this.provider=o.provider;this.firewall=o.firewall;this.store=o.store;this.cache=new Cache({ttlMs:Math.max(10000,+o.cacheTtlMs||30000),maxEntries:Math.max(8,+o.maxEntries||48)});this.lastError='';this.lastFirewall=null;}
function key(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9/_-]/g,'');}
C.prototype.get=function(symbol,force,cb){
 var self=this,k=key(symbol),hit=!force&&self.cache.get(k);if(hit)return cb(null,Object.assign({},hit,{cache:'HIT'}));
 self.provider.pairLiquidity(symbol,function(e,o){if(e){self.lastError=e.message;return cb(e);}var msg={provider:'DEXSCREENER',source:'DEXSCREENER',provenance:o.provenance,type:'MARKET_ANALYTICS',symbol:o.canonicalSymbol||o.symbol,timestamp:o.observedAt,price:o.weightedPriceUsd,data:{liquidityUsd:o.liquidityUsd,volume24hUsd:o.volume24hUsd,poolCount:o.poolCount,chains:o.chains,dexes:o.dexes}};
  self.firewall.inspect(msg,function(fe,fw){if(fe){self.lastError=fe.message;self.lastFirewall=fe.firewall||null;return cb(fe);}o.firewall={decision:fw.decision||'PASS',reason:fw.reason||null,checkedAt:fw.firewall&&fw.firewall.checkedAt||Date.now()};o.cache='MISS';self.cache.set(k,o);if(self.store&&self.store.saveDexLiquidity)self.store.saveDexLiquidity(o);self.lastError='';self.lastFirewall=o.firewall;cb(null,o);});
 });
};
C.prototype.history=function(o){return this.store&&this.store.dexLiquidityHistory?this.store.dexLiquidityHistory(o):{ok:false,error:'DEX_LIQUIDITY_HISTORY_DISABLED',items:[]};};
C.prototype.clear=function(){this.cache.clear();};
C.prototype.status=function(){return{ok:!this.lastError,provider:'DEXSCREENER',cache:this.cache.stats(),lastError:this.lastError||null,lastFirewall:this.lastFirewall};};
module.exports=C;
