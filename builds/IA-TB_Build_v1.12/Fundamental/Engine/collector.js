'use strict';
var RSS=require('../Providers/rss_provider'),WEB=require('../Providers/web_provider'),X=require('../Providers/x_provider');
function providerFor(feed){var p=String(feed&&feed.provider_type||'').toUpperCase(),platform=String(feed&&feed.platform||'').toUpperCase();if(p==='RSS'||p==='ATOM')return{tag:'RSS',impl:RSS};if(p==='WEB')return{tag:'WEB',impl:WEB};if(p==='SOCIAL'&&platform==='X')return{tag:'X',impl:X};return null;}
function Collector(storage,logger){this.storage=storage;this.log=logger||function(){};this.running=false;this.lastRun=null;this.timer=null;}
Collector.prototype._runFeed=function(feed,persist,cb){
 var self=this,pv=providerFor(feed),started=Date.now();
 if(!pv){
  var pe=new Error('PROVIDER_NOT_IMPLEMENTED:'+String(feed&&feed.provider_type||'UNKNOWN')+(feed&&feed.platform?'_'+String(feed.platform).toUpperCase():''));
  self.storage.markFeed(feed.id,'PROVIDER_PENDING',false,pe.message,{durationMs:0,receivedCount:0,transport:'none'});
  return cb(pe,{ok:false,code:feed.code,provider:feed.provider_type,state:'PENDING',received:0,durationMs:0,error:pe.message});
 }
 self.storage.markFeed(feed.id,'FETCHING',false,null,{durationMs:null,receivedCount:null,transport:null});
 pv.impl.collect(feed,function(e,r){
  var transport=r&&r.transport||pv.tag.toLowerCase();
  if(e){var duration=Date.now()-started,pending=/^(WEB_ADAPTER_REQUIRED|PROVIDER_NOT_IMPLEMENTED|PROVIDER_REQUIRED|X_BEARER_TOKEN_MISSING|X_VAULT_LOCKED_LOGIN_REQUIRED)/.test(String(e.message||'')),status=pending?'PROVIDER_PENDING':'ERROR';self.storage.markFeed(feed.id,status,false,e.message,{durationMs:duration,receivedCount:0,transport:transport});self.log(pv.tag,feed.code+' '+status+' '+e.message+' duration='+duration+'ms');return cb(e,{ok:false,code:feed.code,provider:feed.provider_type,state:pending?'PENDING':'ERROR',received:0,durationMs:duration,transport:transport,error:e.message});}
  function finish(result){r=result||r||{};var duration=Date.now()-started,received=Array.isArray(r.items)?r.items.length:0,bodyOK=0,bodyEmpty=0,ir={inserted:0,updated:0,skipped:0};(r.items||[]).forEach(function(x){if(String(x&&x.summary||'').trim())bodyOK++;else bodyEmpty++;});try{if(persist)ir=self.storage.insertItems(feed,r.items||[]);}catch(x){self.storage.markFeed(feed.id,'ERROR',false,x.message,{durationMs:duration,receivedCount:received,transport:transport});return cb(x,{ok:false,code:feed.code,provider:feed.provider_type,state:'ERROR',received:received,durationMs:duration,transport:transport,error:x.message});}self.storage.markFeed(feed.id,'OK',true,null,{durationMs:duration,receivedCount:received,transport:transport});self.log(pv.tag,feed.code+' items='+received+' body_ok='+bodyOK+' body_empty='+bodyEmpty+' new='+(ir.inserted||0)+' enriched='+(ir.updated||0)+' detail_fetched='+(r.detailFetched||0)+' detail_errors='+(r.detailErrors||0)+' transport='+transport+' duration='+duration+'ms'+(persist?'':' test=1'));return cb(null,{ok:true,code:feed.code,provider:feed.provider_type,state:'ONLINE',received:received,bodyOK:bodyOK,bodyEmpty:bodyEmpty,inserted:ir.inserted||0,updated:ir.updated||0,skipped:ir.skipped||0,bytes:r&&r.bytes||0,transport:transport,durationMs:duration,testOnly:!persist,detailFetched:r.detailFetched||0,detailErrors:r.detailErrors||0});}
  var enricher=pv.tag==='X'?null:(typeof WEB.enrich==='function'?WEB:null);
  if(enricher)return enricher.enrich(feed,r.items||[],function(x){return persist?self.storage.itemNeedsSummary(feed,x):!String(x&&x.summary||'').trim();},function(ee,er){if(ee)self.log('BODY',feed.code+' enrich warning '+ee.message);if(er){r.items=er.items||r.items;r.detailFetched=er.detailFetched||0;r.detailErrors=er.detailErrors||0;}finish(r);});
  finish(r);
 });
};
Collector.prototype.testFeed=function(id,cb){
 var feed=this.storage.getFeedById(id);
 if(!feed)return cb(new Error('FEED_NOT_FOUND'));
 this._runFeed(feed,false,cb);
};
Collector.prototype.testDraft=function(input,cb){var d,feed,pv,started=Date.now();try{d=this.storage.prepareFeedDraft(input);feed=d.feed;feed.source_code=d.source.code;feed.source_name=d.source.name;pv=providerFor(feed);if(!pv)throw new Error('PROVIDER_NOT_IMPLEMENTED:'+String(feed.provider_type||'UNKNOWN')+(feed.platform?'_'+String(feed.platform).toUpperCase():''));}catch(e){return cb(e);}pv.impl.collect(feed,function(e,r){if(e)return cb(e,{ok:false,provider:feed.provider_type,platform:feed.platform||null,state:/^(PROVIDER_NOT_IMPLEMENTED|X_BEARER_TOKEN_MISSING|X_VAULT_LOCKED_LOGIN_REQUIRED)/.test(String(e.message||''))?'PENDING':'ERROR',durationMs:Date.now()-started,error:e.message});function done(out){out=out||r||{};var items=out.items||[],bodyOK=0;items.forEach(function(x){if(String(x&&x.summary||'').trim())bodyOK++;});cb(null,{ok:true,provider:feed.provider_type,platform:feed.platform||null,state:'ONLINE',received:items.length,bodyOK:bodyOK,bodyEmpty:items.length-bodyOK,durationMs:Date.now()-started,transport:out.transport||pv.tag.toLowerCase(),sample:items.slice(0,3).map(function(x){return{title:x.title,url:x.url,publishedAt:x.publishedAt};})});}var enricher=pv.tag==='X'?null:(typeof WEB.enrich==='function'?WEB:null);if(enricher)return enricher.enrich(feed,r.items||[],function(x){return!String(x&&x.summary||'').trim();},function(ee,er){if(er){r.items=er.items||r.items;r.detailFetched=er.detailFetched||0;}done(r);});done(r);});};
Collector.prototype.collect=function(opts,cb){
 opts=opts||{};var self=this;if(this.running)return cb&&cb(null,{ok:true,skipped:true,reason:'COLLECTION_ALREADY_RUNNING'});this.running=true;
 var feeds=this.storage.dueFeeds(!!opts.all),out={ok:true,forced:!!opts.all,startedAt:new Date().toISOString(),feeds:[],inserted:0,updated:0,skipped:0,errors:0};
 function done(){self.running=false;out.finishedAt=new Date().toISOString();self.lastRun=out;self.log('COLLECT','fin feeds='+out.feeds.length+' inserted='+out.inserted+' enriched='+out.updated+' errors='+out.errors+(out.forced?' force=1':''));if(cb)cb(null,out);}
 function next(i){if(i>=feeds.length)return done();var f=feeds[i];self._runFeed(f,true,function(e,r){if(e)out.errors++;if(r){out.inserted+=r.inserted||0;out.updated+=r.updated||0;out.skipped+=r.skipped||0;out.feeds.push(r);}setTimeout(function(){next(i+1);},30);});}
 this.log('COLLECT','debut feeds='+feeds.length+(opts.all?' force=1':''));next(0);
};
Collector.prototype.start=function(){var self=this;if(this.timer)return;setTimeout(function(){self.collect({},function(){});},2500);this.timer=setInterval(function(){self.collect({},function(){});},60000);if(this.timer.unref)this.timer.unref();};
Collector.prototype.stop=function(){if(this.timer)clearInterval(this.timer);this.timer=null;};
module.exports=Collector;
