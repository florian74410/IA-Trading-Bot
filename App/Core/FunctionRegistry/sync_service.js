'use strict';
/* IA-TB 2.6.0-dev.2 — Core-owned fail-closed registry reconciler.
 * Authenticated CP/1 Router handshake before importing validated, locally
 * installed manifests. No permissions granted, no trading actions invoked.
 * This phase is reconciliation, not yet live Engine event push.
 */
const fs=require('fs'),path=require('path');
const {FunctionRegistryManager}=require('./manager');
const CLIENTS=[
 ['core','Core'],['router','Core/Router'],['supervisor','Supervisor'],
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
   for(const [id,dir] of CLIENTS){
    const file=path.join(root,dir,'FunctionRegistry','Functions.json');
    try{
     const raw=fs.readFileSync(file,'utf8');
     if(Buffer.byteLength(raw)>1024*1024)throw Error('MANIFEST_TOO_LARGE');
     const manifest=JSON.parse(raw);
     if(manifest.engine_id!==id||!Array.isArray(manifest.functions)||manifest.functions.some(f=>f.default_privilege!=='DENY'))throw Error('MANIFEST_CONTRACT_INVALID');
     imported.push(manager.sync(manifest,id));
    }catch(e){errors.push({engine:id,error:e.message});}
   }
   busy=false;
   last={ok:errors.length===0,imported,errors,timestamp:new Date().toISOString(),generation:manager.generation};
   cb(errors.length?Error('REGISTRY_PARTIAL_SYNC'):null,last);
  });
 }
 const interval=setInterval(()=>reconcile(),Math.max(15000,+options.intervalMs||60000));
 if(interval.unref)interval.unref();
 const startup=setImmediate(()=>reconcile());
 return {manager,reconcile,status:()=>last,stop(){stopped=true;clearInterval(interval);clearImmediate(startup);manager.close();}};
}
module.exports={start,CLIENTS};
