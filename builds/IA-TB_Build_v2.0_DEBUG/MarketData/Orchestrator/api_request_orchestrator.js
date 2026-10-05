'use strict';

var Policy=require('./data_source_policy');
var Broker=require('./request_broker');
var Budget=require('./request_budget');

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
 req=req||{};var policy=this.policy.resolve(req.provider,req.dataset),broker=this.broker.before(req,policy),budget=this.budget.observe({provider:req.provider,dataset:req.dataset,priority:policy.priority,cost:req.cost||1});
 var event={at:Date.now(),mode:this.mode,phase:'START',provider:String(req.provider||'').toUpperCase(),dataset:String(req.dataset||'').toUpperCase(),signature:String(req.signature||''),policy:policy,broker:broker,budget:budget};
 this.events.push(event);if(this.events.length>this.maxEvents)this.events.shift();
 return event;
};
Orchestrator.prototype.observeEnd=function(event,err){
 if(!event||!event.broker)return;
 this.broker.after(event.broker.key,!err);
 var e={at:Date.now(),mode:this.mode,phase:'END',provider:event.provider,dataset:event.dataset,key:event.broker.key,ok:!err,error:err&&err.message||null};
 this.events.push(e);if(this.events.length>this.maxEvents)this.events.shift();
};
Orchestrator.prototype.status=function(){return{ok:true,version:'1.0',mode:this.mode,shadow:this.mode==='SHADOW',policy:this.policy.snapshot(),broker:this.broker.status(),budget:this.budget.status(),recentEvents:this.events.slice(-25)};};

module.exports=Orchestrator;
