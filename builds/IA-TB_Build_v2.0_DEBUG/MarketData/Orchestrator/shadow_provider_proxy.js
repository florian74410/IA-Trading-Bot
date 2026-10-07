'use strict';

function signature(args){
 return(args||[]).filter(function(x){return typeof x!=='function';}).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x);}catch(e){return'[object]';}}).join('|').slice(0,1000);
}
module.exports=function wrap(provider,opt){
 opt=opt||{};if(!provider||!opt.orchestrator)return provider;
 var id=String(opt.provider||provider.id||'UNKNOWN').toUpperCase(),map=opt.methods||{},orchestrator=opt.orchestrator;
 return new Proxy(provider,{
  get:function(target,prop){
   var value=target[prop];if(typeof value!=='function'||!map[prop])return value;
   return function(){
    var self=this,args=Array.prototype.slice.call(arguments),cbIndex=-1;
    for(var i=args.length-1;i>=0;i--){if(typeof args[i]==='function'){cbIndex=i;break;}}
    var spec=typeof map[prop]==='function'?map[prop](args):map[prop],dataset=String(spec&&spec.dataset||prop).toUpperCase(),cost=spec&&spec.cost||1;
    var ev=orchestrator.observeStart({provider:id,dataset:dataset,signature:signature(args),cost:cost}),exec=orchestrator.execution||{},broker=orchestrator.broker;
    if(cbIndex>=0&&exec.cacheFirst){
     var cached=broker.cacheGet(ev.broker.key,ev.policy.cacheTtlMs);
     if(cached){
      return process.nextTick(function(){orchestrator.observeEnd(ev,null);args[cbIndex].apply(self,cached);});
     }
    }
    if(cbIndex>=0&&exec.dedup&&ev.broker.inflightDuplicate){
     var original=args[cbIndex];
     broker.join(ev.broker.key,function(resultArgs){
      var err=resultArgs&&resultArgs[0]||null;orchestrator.observeEnd(ev,err);original.apply(self,resultArgs||[new Error('DEDUP_EMPTY_RESULT')]);
     });
     return;
    }
    if(cbIndex>=0){
     var cb=args[cbIndex];
     args[cbIndex]=function(err){
      var cbArgs=Array.prototype.slice.call(arguments);
      if(!err&&exec.cacheFirst)broker.cachePut(ev.broker.key,cbArgs,ev.policy.cacheTtlMs);
      orchestrator.observeEnd(ev,err);
      if(exec.dedup)broker.resolve(ev.broker.key,cbArgs);
      return cb.apply(this,cbArgs);
     };
    }
    try{
     var out=value.apply(target,args);
     if(cbIndex<0)orchestrator.observeEnd(ev,null);
     return out;
    }catch(e){
     if(cbIndex>=0&&exec.dedup)broker.resolve(ev.broker.key,[e]);
     orchestrator.observeEnd(ev,e);throw e;
    }
   };
  }
 });
};
