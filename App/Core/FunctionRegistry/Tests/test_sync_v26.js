'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {start,CLIENTS}=require('../sync_service');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-v26-'));
function clean(){fs.rmSync(root,{recursive:true,force:true});}
let nextError=null;
const sync=start({
 appRoot:path.join(root,'App'),
 dbPath:path.join(root,'data','functions.sqlite'),
 intervalMs:3600000,
 routerGet(requestPath,cb){if(requestPath==='/communication/v1/registry')return setImmediate(()=>cb(nextError,{ok:!nextError}));const id=requestPath.slice('/communication/v1/functions/'.length);return setImmediate(()=>{if(nextError)return cb(nextError);if(id!=='risk')return cb(Error('ENGINE_OFFLINE'));cb(null,{ok:true,manifest:JSON.parse(fs.readFileSync(manifestPath,'utf8'))});});}
});
const manifestPath=path.join(root,'App','Risk','FunctionRegistry','Functions.json');
fs.mkdirSync(path.dirname(manifestPath),{recursive:true});
function write(label){fs.writeFileSync(manifestPath,JSON.stringify({
 engine_id:'risk',functions:[{engine:'risk',id:'risk.test',description:label,
 risk_level:'LOW',verified_handler:false,default_privilege:'DENY',
 input:{type:'object'},output:{type:'unknown'}}]}));}
write('initial');
function run(){return new Promise(resolve=>sync.reconcile((_err,result)=>resolve(result)));}
(async()=>{
 try{
  let a=await run();assert(a.imported.some(x=>x.engine==='risk'));assert(!sync.manager.allowed('IATB-AGT-0002','risk','risk.test'));
  const first=sync.manager.generation;let b=await run();assert.strictEqual(sync.manager.generation,first);
  write('modified');await run();assert(sync.manager.generation>first);
  nextError=Error('offline');let c=await run();assert.strictEqual(c,undefined);assert.strictEqual(sync.status().reason,'CP1_ROUTER_UNAVAILABLE');
  nextError=null;let d=await run();assert(d.imported.some(x=>x.engine==='risk'));assert.strictEqual(sync.manager.list('IATB-AGT-0002').functions.find(x=>x.id==='risk.test').decision,'DENY');
  console.log('PASS: CP1 handshake/reconcile, cache invalidation, offline-recovery, default DENY');
 }catch(e){console.error(e);process.exitCode=1;}finally{sync.stop();clean();}
})();
