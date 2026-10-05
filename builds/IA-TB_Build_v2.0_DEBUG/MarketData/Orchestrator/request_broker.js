'use strict';

function Broker(o){o=o||{};this.mode=String(o.mode||'SHADOW').toUpperCase();this.inflight=Object.create(null);this.lastSuccess=Object.create(null);this.stats={observed:0,dedupOpportunities:0,cacheOpportunities:0};}
Broker.prototype.key=function(req){return[String(req.provider||'').toUpperCase(),String(req.dataset||'').toUpperCase(),String(req.signature||'')].join('|');};
Broker.prototype.before=function(req,policy){
 var now=Date.now(),k=this.key(req),last=this.lastSuccess[k]||0,ttl=Math.max(0,+policy.cacheTtlMs||0),inflight=!!this.inflight[k],cacheFresh=ttl>0&&last>0&&now-last<ttl;
 this.stats.observed++;
 if(inflight)this.stats.dedupOpportunities++;
 if(cacheFresh)this.stats.cacheOpportunities++;
 if(!inflight)this.inflight[k]={startedAt:now,active:1,observedRequests:1};else{this.inflight[k].active++;this.inflight[k].observedRequests++;}
 return{key:k,inflightDuplicate:inflight,wouldCacheHit:cacheFresh,cacheAgeMs:last?now-last:null,cacheTtlMs:ttl};
};
Broker.prototype.after=function(key,ok){
 if(ok)this.lastSuccess[key]=Date.now();
 var x=this.inflight[key];if(!x)return;x.active=Math.max(0,(+x.active||1)-1);if(x.active===0)delete this.inflight[key];
};
Broker.prototype.status=function(){return{mode:this.mode,stats:Object.assign({},this.stats),inflight:Object.keys(this.inflight).length,cacheKeys:Object.keys(this.lastSuccess).length};};

module.exports=Broker;
