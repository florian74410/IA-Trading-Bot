'use strict';

function Budget(o){
 o=o||{};
 this.mode=String(o.mode||'SHADOW').toUpperCase();
 this.providers=Object.create(null);
 this.events=[];
 this.maxEvents=Math.max(50,+o.maxEvents||500);
}
Budget.prototype.configure=function(provider,cfg){
 provider=String(provider||'').toUpperCase();cfg=cfg||{};
 this.providers[provider]={
  shortWindowMs:Math.max(1000,+cfg.shortWindowMs||60000),
  shortLimit:Math.max(1,+cfg.shortLimit||60),
  longWindowMs:Math.max(60000,+cfg.longWindowMs||2592000000),
  longLimit:Math.max(1,+cfg.longLimit||10000),
  reserve:Math.max(0,+cfg.reserve||0),
  costDefault:Math.max(0.0001,+cfg.costDefault||1),
  short:[],long:[],usedLong:0
 };
 return this.providers[provider];
};
Budget.prototype._state=function(provider){
 provider=String(provider||'').toUpperCase();
 return this.providers[provider]||this.configure(provider,{});
};
Budget.prototype.observe=function(req){
 var now=Date.now(),p=this._state(req.provider),cost=Math.max(0.0001,+req.cost||p.costDefault);
 p.short=p.short.filter(function(x){return now-x.at<p.shortWindowMs;});
 p.long=p.long.filter(function(x){return now-x.at<p.longWindowMs;});
 var shortUsed=p.short.reduce(function(z,x){return z+x.cost;},0);
 var longUsed=p.long.reduce(function(z,x){return z+x.cost;},0);
 var usableLong=Math.max(0,p.longLimit-p.reserve);
 var decision={
  mode:this.mode,provider:String(req.provider||'').toUpperCase(),dataset:req.dataset,
  priority:req.priority||'P2',cost:cost,
  short:{used:shortUsed,limit:p.shortLimit,wouldAllow:shortUsed+cost<=p.shortLimit},
  long:{used:longUsed,limit:p.longLimit,reserve:p.reserve,usable:usableLong,wouldAllow:longUsed+cost<=usableLong}
 };
 decision.wouldAllow=decision.short.wouldAllow&&decision.long.wouldAllow;
 p.short.push({at:now,cost:cost});p.long.push({at:now,cost:cost});
 this.events.push(Object.assign({at:now},decision));if(this.events.length>this.maxEvents)this.events.shift();
 return decision;
};
Budget.prototype.status=function(){
 var now=Date.now(),out={mode:this.mode,providers:{},recentEvents:this.events.slice(-25)};
 Object.keys(this.providers).forEach(function(id){var p=this.providers[id];p.short=p.short.filter(function(x){return now-x.at<p.shortWindowMs;});p.long=p.long.filter(function(x){return now-x.at<p.longWindowMs;});out.providers[id]={shortUsed:p.short.reduce(function(z,x){return z+x.cost;},0),shortLimit:p.shortLimit,longUsed:p.long.reduce(function(z,x){return z+x.cost;},0),longLimit:p.longLimit,reserve:p.reserve};},this);
 return out;
};

module.exports=Budget;
