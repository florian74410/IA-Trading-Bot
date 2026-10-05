'use strict';

function signature(args){
 return(args||[]).filter(function(x){return typeof x!=='function';}).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x);}catch(e){return'[object]';}}).join('|').slice(0,1000);
}
module.exports=function wrap(provider,opt){
 opt=opt||{};if(!provider||!opt.orchestrator)return provider;
 var id=String(opt.provider||provider.id||'UNKNOWN').toUpperCase(),map=opt.methods||{};
 return new Proxy(provider,{
  get:function(target,prop){
   var value=target[prop];if(typeof value!=='function'||!map[prop])return value;
   return function(){
    var args=Array.prototype.slice.call(arguments),cbIndex=-1;
    for(var i=args.length-1;i>=0;i--){if(typeof args[i]==='function'){cbIndex=i;break;}}
    var spec=typeof map[prop]==='function'?map[prop](args):map[prop],dataset=String(spec&&spec.dataset||prop).toUpperCase(),cost=spec&&spec.cost||1;
    var ev=opt.orchestrator.observeStart({provider:id,dataset:dataset,signature:signature(args),cost:cost});
    if(cbIndex>=0){
     var cb=args[cbIndex];args[cbIndex]=function(err){opt.orchestrator.observeEnd(ev,err);return cb.apply(this,arguments);};
    }
    try{
     var out=value.apply(target,args);
     if(cbIndex<0)opt.orchestrator.observeEnd(ev,null);
     return out;
    }catch(e){opt.orchestrator.observeEnd(ev,e);throw e;}
   };
  }
 });
};
