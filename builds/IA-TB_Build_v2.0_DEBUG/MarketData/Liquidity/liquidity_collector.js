'use strict';
var Cache=require('../Cache/market_cache');

function Collector(o){
 o=o||{};this.provider=o.provider;this.firewall=o.firewall;this.store=o.store;
 this.cache=new Cache({ttlMs:Math.max(5000,+o.cacheTtlMs||5000),maxEntries:Math.max(12,+o.maxEntries||64)});
 this.busy=Object.create(null);this.lastError='';this.lastFirewall=null;
}
function key(symbol,source,depth){return String(source||'AUTO').toUpperCase()+'|'+String(symbol||'').toUpperCase()+'|'+Math.max(5,Math.min(100,+depth||20));}
function envelope(raw){
 var b=raw&&raw.orderBook||{},bid=b.bids&&b.bids[0],ask=b.asks&&b.asks[0],mid=bid&&ask?(+bid.price+ +ask.price)/2:null;
 return{provider:raw.source,source:raw.source,provenance:raw.provenance||('MARKET_DATA_COLLECTOR:'+raw.source),type:'LIQUIDITY_SNAPSHOT',symbol:raw.canonicalSymbol||raw.symbol,timestamp:+raw.observedAt||Date.now(),bid:bid&&+bid.price||null,ask:ask&&+ask.price||null,price:mid,data:{orderBook:raw.orderBook,openInterest:raw.openInterest,liquidations:raw.liquidations||[]}};
}
Collector.prototype.snapshot=function(symbol,source,depth,force,cb){
 var self=this,k=key(symbol,source,depth),hit=!force&&self.cache.get(k);if(hit)return cb(null,Object.assign({},hit,{cache:'HIT'}));
 if(self.busy[k]){var waited=0,t=setInterval(function(){waited+=50;var h=self.cache.get(k);if(h){clearInterval(t);return cb(null,Object.assign({},h,{cache:'WAIT_HIT'}));}if(waited>=12000){clearInterval(t);cb(new Error('LIQUIDITY_REFRESH_BUSY_TIMEOUT'));}},50);return;}
 self.busy[k]=1;
 self.provider.getSnapshot(symbol,source,depth,function(e,raw){
  if(e){delete self.busy[k];self.lastError=e.message;return cb(e);}
  self.firewall.inspect(envelope(raw),function(fe,fw){
   delete self.busy[k];if(fe){self.lastError=fe.message;self.lastFirewall=fe.firewall||null;return cb(fe);}
   raw.firewall={decision:fw.decision||'PASS',reason:fw.reason||null,checkedAt:fw.firewall&&fw.firewall.checkedAt||Date.now()};
   raw.cache='MISS';self.cache.set(k,raw);if(self.store)self.store.save(raw,fw);self.lastError='';self.lastFirewall=raw.firewall;cb(null,raw);
  });
 });
};
Collector.prototype.history=function(o){return this.store?this.store.history(o):{ok:false,error:'LIQUIDITY_STORE_DISABLED',items:[]};};
Collector.prototype.storage=function(){return this.store?this.store.status():{ok:false,mode:'DISABLED'};};
Collector.prototype.clear=function(){this.cache.clear();return this.status();};
Collector.prototype.status=function(){return{ok:!this.lastError,cache:this.cache.stats(),providers:this.provider&&this.provider.list?this.provider.list():[],storage:this.storage(),lastError:this.lastError||null,lastFirewall:this.lastFirewall};};
module.exports=Collector;
