'use strict';
/* IA-TB 2.6.0-dev.2 — Core-owned fail-closed registry reconciler.
 * Authenticated CP/1 Router handshake before importing validated, locally
 * installed manifests. No permissions granted, no trading actions invoked.
 * This phase is reconciliation, not yet live Engine event push.
 */
const fs=require('fs'),path=require('path');
const {FunctionRegistryManager}=require('./manager');
const CLIENTS=[
 ['supervisor','Supervisor'],
 ['marketdata','MarketData'],['fundamental','Fundamental'],
 ['indicator','Indicators'],['liquidity','Liquidity'],['portfolio','Portfolio'],
 ['risk','Risk'],['strategy','Strategy'],['trading','services/trading-engine'],
 ['firewall','Core/Firewall']
];
function start(options){
 options=options||{};
 const root=options.appRoot||path.resolve(__dirname,'../..');
 const db=options.dbPath||process.env.IATB_FUNCTION_REGISTRY_DB;
 if(!db||!path.isAbsolute(db))throw Error('IATB_FUNCTION_REGISTRY_DB_PRIVATE_ABSOLUTE_REQUIRED');
 const manager=new FunctionRegistryManager(db);
 const routerGet=options.routerGet;
 if(typeof routerGet!=='function')throw Error('AUTHENTICATED_CP1_ROUTER_CLIENT_REQUIRED');
 let stopped=false,busy=false,last={ok:false,reason:'AWAITING_ROUTER',timestamp:null};
 function reconcile(cb){
  cb=cb||function(){};
  if(stopped)return cb(Error('SYNC_STOPPED'));
  if(busy)return cb(null,{ok:false,reason:'BUSY'});
  busy=true;
  routerGet('/communication/v1/registry',function(err,reg){
   if(err||!reg||reg.ok===false){
    busy=false;last={ok:false,reason:'CP1_ROUTER_UNAVAILABLE',timestamp:new Date().toISOString()};
    return cb(err||Error(last.reason));
   }
   const imported=[],errors=[];
   let outstanding=CLIENTS.length;
   function finish(){
    if(--outstanding!==0)return;
    busy=false;
    last={ok:errors.length===0,imported,errors,timestamp:new Date().toISOString(),generation:manager.generation};
    cb(errors.length?Error('REGISTRY_PARTIAL_SYNC'):null,last);
   }
   for(const [id] of CLIENTS){
    routerGet('/communication/v1/functions/'+id,function(e,result){
     try{
      if(e||!result||result.ok===false||!result.manifest)throw e||Error('ENGINE_CATALOG_UNAVAILABLE');
      const manifest=result.manifest;
      if(manifest.engine_id!==id||!Array.isArray(manifest.functions)||manifest.functions.some(f=>f.default_privilege!=='DENY'))throw Error('MANIFEST_CONTRACT_INVALID');
      imported.push(manager.sync(manifest,id));
     }catch(error){errors.push({engine:id,error:String(error.message||error)});}
     finish();
    });
   }
  });
 }
 let changeSequence=0;
 const changeTimer=setInterval(function(){
  if(stopped||busy)return;
  routerGet('/communication/v1/functions/changes?since='+changeSequence,function(e,result){
   if(e||!result||result.ok!==true)return; // periodic retry stays active
   if(Array.isArray(result.changes)&&result.changes.length){
    // Do not trust the notification payload: pull all manifests via Router.
    reconcile(function(err){if(!err)changeSequence=result.sequence;});
   }else if(Number.isSafeInteger(result.sequence))changeSequence=result.sequence;
  });
 },Math.max(3000,+options.changePollMs||5000));
 if(changeTimer.unref)changeTimer.unref();
 const interval=setInterval(()=>reconcile(),Math.max(15000,+options.intervalMs||60000));
 if(interval.unref)interval.unref();
 const startup=setImmediate(()=>reconcile());
 return {manager,reconcile,status:()=>last,stop(){stopped=true;clearInterval(interval);clearInterval(changeTimer);clearImmediate(startup);manager.close();}};
}
module.exports={start,CLIENTS};
