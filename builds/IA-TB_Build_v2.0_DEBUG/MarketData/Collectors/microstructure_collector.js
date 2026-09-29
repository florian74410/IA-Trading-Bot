'use strict';
var Cache=require('../Cache/market_cache'),crypto=require('crypto');

function Collector(o){
 o=o||{};this.provider=o.provider;this.firewall=o.firewall;this.store=o.store;
 this.cache=new Cache({ttlMs:Math.max(5000,+o.cacheTtlMs||5000),maxEntries:Math.max(12,+o.maxEntries||64)});
 this.oiCache=new Cache({ttlMs:Math.max(5000,+o.oiCacheTtlMs||10000),maxEntries:Math.max(8,+o.maxEntries||64)});
 this.liquidationBuffer=[];this.maxLiquidations=Math.max(100,+o.maxLiquidations||5000);
 this.busy=Object.create(null);this.lastError='';this.lastFirewall=null;
}
function key(symbol,source,depth){return String(source||'AUTO').toUpperCase()+'|'+String(symbol||'').toUpperCase()+'|'+Math.max(5,Math.min(100,+depth||20));}
function envelope(raw){
 var b=raw&&raw.orderBook||{},bid=b.bids&&b.bids[0],ask=b.asks&&b.asks[0],mid=bid&&ask?(+bid.price+ +ask.price)/2:null;
 return{provider:raw.source,source:raw.source,provenance:raw.provenance||('MARKET_DATA_COLLECTOR:'+raw.source),type:'LIQUIDITY_SNAPSHOT',symbol:raw.canonicalSymbol||raw.symbol,timestamp:+raw.observedAt||Date.now(),bid:bid&&+bid.price||null,ask:ask&&+ask.price||null,price:mid,data:{orderBook:raw.orderBook,openInterest:raw.openInterest,liquidations:raw.liquidations||[]}};
}
Collector.prototype.snapshot=function(symbol,source,depth,force,cb){
 var self=this,k=key(symbol,source,depth),hit=!force&&self.cache.get(k);if(hit)return cb(null,Object.assign({},hit,{cache:'HIT'}));
 if(self.busy[k]){var waited=0,t=setInterval(function(){waited+=50;var h=self.cache.get(k);if(h){clearInterval(t);return cb(null,Object.assign({},h,{cache:'WAIT_HIT'}));}if(waited>=12000){clearInterval(t);cb(new Error('MICROSTRUCTURE_REFRESH_BUSY_TIMEOUT'));}},50);return;}
 self.busy[k]=1;
 self.provider.getSnapshot(symbol,source,depth,function(e,raw){
  if(e){delete self.busy[k];self.lastError=e.message;return cb(e);}
  self.firewall.inspect(envelope(raw),function(fe,fw){
   delete self.busy[k];if(fe){self.lastError=fe.message;self.lastFirewall=fe.firewall||null;return cb(fe);}
   raw.firewall={decision:fw.decision||'PASS',reason:fw.reason||null,checkedAt:fw.firewall&&fw.firewall.checkedAt||Date.now()};
   raw.cache='MISS';self.cache.set(k,raw);if(self.store)self.store.saveSnapshot(raw,fw);self.lastError='';self.lastFirewall=raw.firewall;cb(null,raw);
  });
 });
};
Collector.prototype.openInterestAggregate=function(symbol,sources,cb){
 var self=this,src=Array.isArray(sources)&&sources.length?sources.slice().sort():[],k=String(symbol||'').toUpperCase()+'|'+src.join(','),hit=self.oiCache.get(k);if(hit)return cb(null,Object.assign({},hit,{cache:'HIT'}));self.provider.aggregateOpenInterest(symbol,sources,function(e,o){
  if(e)return cb(e);var rows=o&&o.venues||[],valid=[],rejected=[],left=rows.length;
  if(!left)return cb(null,o);
  rows.forEach(function(x){
   var msg={provider:x.source,source:x.source,provenance:x.provenance||('MARKET_DATA_COLLECTOR:'+x.source),type:'OPEN_INTEREST',symbol:x.canonicalSymbol||symbol,timestamp:+x.observedAt||Date.now(),price:x.markPrice||null,data:{openInterest:x}};
   self.firewall.inspect(msg,function(fe,fw){
    if(fe)rejected.push({source:x.source,error:fe.message});else{ x.firewall={decision:fw.decision||'PASS',reason:fw.reason||null};valid.push(x); }
    if(--left)return;
    var total=0,cex=0,dex=0;valid.forEach(function(v){var n=isFinite(+v.openInterestNotionalUsd)?+v.openInterestNotionalUsd:0;total+=n;if(String(v.venueType||'').toUpperCase()==='DEX')dex+=n;else cex+=n;});
    var out={ok:true,schema:'marketdata.open_interest.aggregate/1.0',symbol:o.symbol||symbol,scope:'CONNECTED_PERPETUAL_VENUES',coveredOpenInterestUsd:total,cexOpenInterestUsd:cex,dexOpenInterestUsd:dex,venueCount:valid.length,venues:valid.sort(function(a,b){return(+b.openInterestNotionalUsd||0)-(+a.openInterestNotionalUsd||0)}),coverage:{requested:o.coverage&&o.coverage.requested||[],received:valid.map(function(v){return v.source;}),missing:(o.coverage&&o.coverage.missing||[]).concat(rejected.map(function(v){return v.source;})),complete:false,label:'COVERED_NOT_GLOBAL'},observedAt:Date.now()};
    out.cache='MISS';self.oiCache.set(k,out);if(self.store&&self.store.saveOpenInterest)self.store.saveOpenInterest(out);cb(null,out);
   });
  });
 });
};
Collector.prototype.acceptLiquidation=function(event,cb){
 var self=this,e=event||{},ts=+(e.timestamp||e.time||Date.now());if(ts>0&&ts<1e12)ts*=1000;
 var x={provider:String(e.provider||e.source||'').toUpperCase(),source:String(e.provider||e.source||'').toUpperCase(),provenance:String(e.provenance||('MARKET_DATA_COLLECTOR:'+String(e.provider||e.source||'').toUpperCase())),symbol:String(e.symbol||'').toUpperCase(),side:String(e.side||'').toUpperCase(),price:+e.price,quantity:+(e.quantity!=null?e.quantity:e.size),quantityUnit:String(e.quantityUnit||'BASE').toUpperCase(),notionalUsd:e.notionalUsd!=null&&e.notionalUsd!==''&&isFinite(+e.notionalUsd)?+e.notionalUsd:null,timestamp:Math.round(ts),providerEventId:e.providerEventId?String(e.providerEventId).slice(0,160):null,instrumentId:e.instrumentId?String(e.instrumentId).slice(0,80):null,instrumentFamily:e.instrumentFamily?String(e.instrumentFamily).slice(0,80):null};
 if(x.notionalUsd==null&&x.quantityUnit==='BASE'&&isFinite(x.price)&&isFinite(x.quantity))x.notionalUsd=x.price*x.quantity;
 x.eventKey=crypto.createHash('sha256').update([x.provider,x.providerEventId||'',x.symbol,x.timestamp,x.side,x.price,x.quantity].join('|')).digest('hex');
 var msg={provider:x.provider,source:x.source,provenance:x.provenance,type:'LIQUIDATION',symbol:x.symbol,timestamp:x.timestamp,price:x.price,data:x};
 self.firewall.inspect(msg,function(fe,fw){
  if(fe)return cb&&cb(fe);x.firewall={decision:fw.decision||'PASS',reason:fw.reason||null};
  self.liquidationBuffer.push(x);if(self.liquidationBuffer.length>self.maxLiquidations)self.liquidationBuffer.splice(0,self.liquidationBuffer.length-self.maxLiquidations);
  if(self.store)self.store.saveLiquidation(x);if(cb)cb(null,x);
 });
};
Collector.prototype.recentLiquidations=function(o){
 o=o||{};var now=Date.now(),since=Math.max(0,+o.since||now-Math.max(60000,+o.windowMs||900000)),symbol=String(o.symbol||'').toUpperCase(),provider=String(o.provider||o.source||'').toUpperCase(),limit=Math.max(1,Math.min(5000,+o.limit||500));
 var a=this.liquidationBuffer.filter(function(x){return x.timestamp>=since&&(!symbol||x.symbol===symbol)&&(!provider||provider==='AUTO'||x.provider===provider);});
 if(a.length<Math.min(50,limit)&&this.store){var db=this.store.liquidations({symbol:symbol,provider:provider,limit:limit,since:since});if(db.ok)a=db.items;}
 if(a.length>limit)a=a.slice(a.length-limit);return{ok:true,schema:'marketdata.liquidations/1.0',items:a,count:a.length,since:since,to:now};
};
Collector.prototype.openInterestHistory=function(o){return this.store&&this.store.openInterestHistory?this.store.openInterestHistory(o):{ok:false,error:'OPEN_INTEREST_HISTORY_DISABLED',items:[]};};
Collector.prototype.liquidationStats=function(o){
 var r=this.recentLiquidations(o),longUsd=0,shortUsd=0,longCount=0,shortCount=0;
 r.items.forEach(function(x){var v=+x.notionalUsd||0;if(String(x.side).toUpperCase()==='LONG'){longUsd+=v;longCount++;}else if(String(x.side).toUpperCase()==='SHORT'){shortUsd+=v;shortCount++;}});
 var total=longUsd+shortUsd;return{ok:true,schema:'marketdata.liquidations.stats/1.0',symbol:o&&o.symbol||'',windowMs:o&&o.windowMs||900000,count:r.count,totalNotionalUsd:total,long:{count:longCount,notionalUsd:longUsd},short:{count:shortCount,notionalUsd:shortUsd},imbalance:total?(longUsd-shortUsd)/total:0,coverage:'CONNECTED_STREAMS_ONLY'};
};
Collector.prototype.history=function(o){return this.store?this.store.history(o):{ok:false,error:'MICROSTRUCTURE_STORE_DISABLED',items:[]};};
Collector.prototype.storage=function(){return this.store?this.store.status():{ok:false,mode:'DISABLED'};};
Collector.prototype.clear=function(){this.cache.clear();this.oiCache.clear();this.liquidationBuffer=[];return this.status();};
Collector.prototype.status=function(){return{ok:!this.lastError,cache:this.cache.stats(),openInterestCache:this.oiCache.stats(),providers:this.provider&&this.provider.list?this.provider.list():[],storage:this.storage(),liquidationBuffer:this.liquidationBuffer.length,lastError:this.lastError||null,lastFirewall:this.lastFirewall};};
module.exports=Collector;
