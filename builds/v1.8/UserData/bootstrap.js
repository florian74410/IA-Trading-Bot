'use strict';
var runtime=require('./runtime_bootstrap');
(async function(){
 try{
  var ctx=await runtime.bootstrapRuntime(),a=ctx.account||{};
  console.log('[UserData] MEMORY READY user='+ctx.username+' db='+String(ctx.dbLocation||'remote')+' login='+(a.configured?'SQLITE':'UNCONFIGURED')+' settings='+Object.keys(ctx.client.cache.settings||{}).length+' strategies='+Object.keys(ctx.client.cache.strategies||{}).length+' credentials='+Object.keys(ctx.client.cache.credentials||{}).length);
  process.exit(0);
 }catch(e){console.error('[UserData] MEMORY BOOTSTRAP ERROR:',e&&e.stack||e);process.exit(1);}
})();
