'use strict';

var Policy=require('./data_source_policy');
var Broker=require('./request_broker');
var Budget=require('./request_budget');
var Telemetry=require('./api_telemetry');

function Orchestrator(o){
 o=o||{};
 this.mode=String(o.mode||'SHADOW').toUpperCase();
 this.policy=o.policy||new Policy();
 this.broker=o.broker||new Broker({mode:this.mode});
 this.budget=o.budget||new Budget({mode:this.mode});
 this.events=[];this.maxEvents=Math.max(50,+o.maxEvents||500);
}
Orchestrator.prototype.configureProvider=function(provider,cfg){return this.budget.configure(provider,cfg||{});};
Orchestrator.prototype.observeStart=function(req){
 req=req||{};var policy=this.policy.resolve(req.provider,req.dataset),broker=this.broker.before(req,policy),budget={accounting:'TRANSPORT_ONLY',short:{known:false,wouldAllow:null},long:{known:false,wouldAllow:null},weighted:null,scopes:[]};
 var event={at:Date.now(),mode:this.mode,phase:'START',provider:String(req.provider||'').toUpperCase(),dataset:String(req.dataset||'').toUpperCase(),signature:String(req.signature||''),policy:policy,broker:broker,budget:budget};
 this.events.push(event);if(this.events.length>this.maxEvents)this.events.shift();
 Telemetry.emit({requestId:event.broker.key+'|'+event.at,timestamp:event.at,provider:event.provider,dataset:event.dataset,phase:'ORCHESTRATOR_START',cost:req.cost||1,priority:policy.priority,freshness:policy.freshness,criticality:policy.criticality,cacheOpportunity:broker.wouldCacheHit,dedupOpportunity:broker.inflightDuplicate,budgetShortAllow:budget.short&&budget.short.wouldAllow,budgetLongAllow:budget.long&&budget.long.wouldAllow,meta:{mode:this.mode,signature:event.signature,cacheTtlMs:policy.cacheTtlMs,requestMode:policy.mode,retention:policy.retention,distribution:policy.distribution}});
 return event;
};
Orchestrator.prototype.observeEnd=function(event,err){
 if(!event||!event.broker)return;
 this.broker.after(event.broker.key,!err);
 var e={at:Date.now(),mode:this.mode,phase:'END',provider:event.provider,dataset:event.dataset,key:event.broker.key,ok:!err,error:err&&err.message||null};
 this.events.push(e);if(this.events.length>this.maxEvents)this.events.shift();
 Telemetry.emit({requestId:event.broker.key+'|'+event.at,timestamp:event.at,completedAt:e.at,provider:event.provider,dataset:event.dataset,phase:'ORCHESTRATOR_END',ok:!err,latencyMs:e.at-event.at,errorCode:e.error||'',priority:event.policy&&event.policy.priority||'',freshness:event.policy&&event.policy.freshness||'',criticality:event.policy&&event.policy.criticality||'',cacheOpportunity:event.broker&&event.broker.wouldCacheHit,dedupOpportunity:event.broker&&event.broker.inflightDuplicate,budgetShortAllow:event.budget&&event.budget.short&&event.budget.short.wouldAllow,budgetLongAllow:event.budget&&event.budget.long&&event.budget.long.wouldAllow,meta:{mode:this.mode}});
};
Orchestrator.prototype.observeTransport=function(req){
 req=req||{};
 var policy=this.policy.resolve(req.provider,req.dataset);
 var budget=this.budget.observe({provider:req.provider,dataset:req.dataset,priority:policy.priority,cost:req.cost||1,scope:req.scope||null,scopes:req.scopes||null});
 var event={at:Date.now(),mode:this.mode,phase:'TRANSPORT',provider:String(req.provider||'').toUpperCase(),dataset:String(req.dataset||'').toUpperCase(),scopes:req.scopes||null,cost:req.cost||1,policy:policy,budget:budget};
 this.events.push(event);if(this.events.length>this.maxEvents)this.events.shift();
 return event;
};
Orchestrator.prototype.feedbackTransport=function(provider,feedback){
 var e=this.budget.feedback(provider,feedback||{});
 this.events.push(e);if(this.events.length>this.maxEvents)this.events.shift();
 return e;
};
Orchestrator.prototype.status=function(){return{ok:true,version:'1.2',mode:this.mode,shadow:this.mode==='SHADOW',policy:this.policy.snapshot(),broker:this.broker.status(),budget:this.budget.status(),recentEvents:this.events.slice(-25)};};

module.exports=Orchestrator;
