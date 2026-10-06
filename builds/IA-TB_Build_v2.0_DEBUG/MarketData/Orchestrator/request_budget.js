'use strict';

function finitePositive(v){v=+v;return isFinite(v)&&v>0?v:null;}
function Budget(o){
 o=o||{};
 this.mode=String(o.mode||'SHADOW').toUpperCase();
 this.providers=Object.create(null);
 this.events=[];
 this.maxEvents=Math.max(50,+o.maxEvents||500);
}
function makeScope(id,cfg){
 cfg=cfg||{};return{
  id:String(id||'DEFAULT').toUpperCase(),
  windowMs:Math.max(1000,+cfg.windowMs||60000),
  limit:finitePositive(cfg.limit),
  reserve:Math.max(0,+cfg.reserve||0),
  unit:String(cfg.unit||'COST_UNIT').toUpperCase(),
  source:String(cfg.source||'CONFIG').toUpperCase(),
  events:[]
 };
}
Budget.prototype.configure=function(provider,cfg){
 provider=String(provider||'').toUpperCase();cfg=cfg||{};
 var shortLimit=finitePositive(cfg.shortLimit),longLimit=finitePositive(cfg.longLimit),scopes=Object.create(null);
 Object.keys(cfg.weightedScopes||{}).forEach(function(id){scopes[String(id).toUpperCase()]=makeScope(id,cfg.weightedScopes[id]);});
 this.providers[provider]={
  limitModel:String(cfg.limitModel||((Object.keys(scopes).length?'WEIGHTED':(shortLimit||longLimit)?'KNOWN':'UNKNOWN'))).toUpperCase(),
  shortWindowMs:Math.max(1000,+cfg.shortWindowMs||60000),
  shortLimit:shortLimit,
  longWindowMs:Math.max(60000,+cfg.longWindowMs||2592000000),
  longLimit:longLimit,
  reserve:longLimit?Math.max(0,Math.min(longLimit,+cfg.reserve||0)):0,
  costDefault:Math.max(0.0001,+cfg.costDefault||1),
  short:[],long:[],weightedScopes:scopes
 };
 return this.providers[provider];
};
Budget.prototype._state=function(provider){
 provider=String(provider||'').toUpperCase();
 return this.providers[provider]||this.configure(provider,{limitModel:'UNKNOWN'});
};
Budget.prototype.observe=function(req){
 req=req||{};var now=Date.now(),p=this._state(req.provider),cost=Math.max(0.0001,+req.cost||p.costDefault);
 p.short=p.short.filter(function(x){return now-x.at<p.shortWindowMs;});
 p.long=p.long.filter(function(x){return now-x.at<p.longWindowMs;});
 var shortUsed=p.short.reduce(function(z,x){return z+x.cost;},0),longUsed=p.long.reduce(function(z,x){return z+x.cost;},0);
 var shortKnown=p.shortLimit!=null,longKnown=p.longLimit!=null,usableLong=longKnown?Math.max(0,p.longLimit-p.reserve):null,weighted=null,scopeId=String(req.scope||'').toUpperCase();
 if(scopeId&&p.weightedScopes[scopeId]){
  var s=p.weightedScopes[scopeId];s.events=s.events.filter(function(x){return now-x.at<s.windowMs;});
  var used=s.events.reduce(function(z,x){return z+x.cost;},0),usable=s.limit==null?null:Math.max(0,s.limit-s.reserve);
  weighted={known:s.limit!=null,scope:s.id,unit:s.unit,source:s.source,used:used,limit:s.limit,reserve:s.reserve,usable:usable,wouldAllow:s.limit==null?null:used+cost<=usable};
  s.events.push({at:now,cost:cost});
 }
 var decision={
  mode:this.mode,provider:String(req.provider||'').toUpperCase(),dataset:req.dataset,
  priority:req.priority||'P2',cost:cost,limitModel:p.limitModel,scope:scopeId||null,
  short:{known:shortKnown,used:shortUsed,limit:p.shortLimit,wouldAllow:shortKnown?shortUsed+cost<=p.shortLimit:null},
  long:{known:longKnown,used:longUsed,limit:p.longLimit,reserve:p.reserve,usable:usableLong,wouldAllow:longKnown?longUsed+cost<=usableLong:null},
  weighted:weighted
 };
 decision.wouldAllow=(decision.short.wouldAllow!==false)&&(decision.long.wouldAllow!==false)&&(!weighted||weighted.wouldAllow!==false);
 decision.enforceable=shortKnown||longKnown||!!(weighted&&weighted.known);
 p.short.push({at:now,cost:cost});p.long.push({at:now,cost:cost});
 this.events.push(Object.assign({at:now},decision));if(this.events.length>this.maxEvents)this.events.shift();
 return decision;
};
Budget.prototype.status=function(){
 var now=Date.now(),out={mode:this.mode,providers:{},recentEvents:this.events.slice(-25)};
 Object.keys(this.providers).forEach(function(id){
  var p=this.providers[id];p.short=p.short.filter(function(x){return now-x.at<p.shortWindowMs;});p.long=p.long.filter(function(x){return now-x.at<p.longWindowMs;});
  var scopes={};Object.keys(p.weightedScopes).forEach(function(k){var s=p.weightedScopes[k];s.events=s.events.filter(function(x){return now-x.at<s.windowMs;});scopes[k]={windowMs:s.windowMs,used:s.events.reduce(function(z,x){return z+x.cost;},0),limit:s.limit,reserve:s.reserve,unit:s.unit,source:s.source};});
  out.providers[id]={limitModel:p.limitModel,shortUsed:p.short.reduce(function(z,x){return z+x.cost;},0),shortLimit:p.shortLimit,longUsed:p.long.reduce(function(z,x){return z+x.cost;},0),longLimit:p.longLimit,reserve:p.reserve,costDefault:p.costDefault,weightedScopes:scopes};
 },this);
 return out;
};

module.exports=Budget;
