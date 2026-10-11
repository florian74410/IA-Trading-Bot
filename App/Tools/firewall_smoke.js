'use strict';
// Offline smoke for the REAL Firewall service with both protection workers enabled.
// Run in disposable Docker: --network none, --read-only, --tmpfs /tmp.
const assert=require('node:assert/strict');
const http=require('node:http');
const cp=require('node:child_process');
const path=require('node:path');
const root='/tmp/iatb-firewall-smoke',port=18017;
const env={...process.env,
 IATB_RUNTIME_ROOT:root+'/runtime',IATB_DATA_ROOT:root+'/data',
 IATB_STATE_ROOT:root+'/state',IATB_ANNEX_ROOT:root+'/annexes',
 IATB_UPDATES_ROOT:root+'/updates',
 IATB_FIREWALL_PORT:String(port),
 IATB_FIREWALL_ENABLED:'1',
 IATB_TRADING_LIVE:'0',IATB_DEBUG_BOOTSTRAP:'0',IATB_DEBUG_MODE:'0'
};
let logs='';
const child=cp.spawn(process.execPath,['Core/Firewall/firewall_service.js'],{
 cwd:path.resolve(__dirname,'..'),env,stdio:['ignore','pipe','pipe']
});
child.stdout.on('data',x=>logs+=x.toString());
child.stderr.on('data',x=>logs+=x.toString());
function fetchHealth(){return new Promise((resolve,reject)=>{
 const req=http.get('http://127.0.0.1:'+port+'/health',{timeout:850},res=>{
  let text='';res.on('data',x=>text+=x.toString());res.on('end',()=>{
   try{resolve({code:res.statusCode,data:JSON.parse(text)});}catch(e){reject(e);}
  });
 });req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('HTTP_TIMEOUT')));
});}
(async()=>{
 try{
  let health;
  for(let i=0;i<50;i++){
   if(child.exitCode!==null||child.signalCode!==null)throw Error('Firewall exited early');
   try{const h=await fetchHealth();if(h.code===200&&h.data.threads&&h.data.threads.filter(x=>x.online).length===3){health=h;break;}}
   catch(e){}
   await new Promise(r=>setTimeout(r,160));
  }
  assert(health,'Firewall workers failed to initialize');
  assert.equal(health.data.ok,true);
  assert.equal(health.data.firewallEnabled,true);
  assert.equal(health.data.bypassMode,false);
  assert.equal(health.data.workerCount,2);
  assert.equal(health.data.healthLevel,'HEALTHY');
  assert.equal(health.data.metrics.received,0);
  console.log('FIREWALL HEALTH TELEMETRY: OK');
  assert(health.data.threads.some(x=>x.id==='trading'&&x.online));
  assert(health.data.threads.some(x=>x.id==='data'&&x.online));
  console.log('FIREWALL COORDINATOR: OK');
  console.log('TRADING PROTECTION WORKER: OK (no Trading Engine started)');
  console.log('MARKET DATA PROTECTION WORKER: OK');
  console.log('FIREWALL BYPASS: OFF');
  console.log('FIREWALL SMOKE: SUCCESS');
 }catch(e){process.exitCode=1;console.error('FIREWALL SMOKE FAILED: '+e.message);console.error('FIREWALL LOGS:\n'+logs.slice(-8000));}
 finally{
  if(child.exitCode===null&&child.signalCode===null){
   child.kill('SIGTERM');
   await new Promise(resolve=>{
    const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},1500);
    child.once('exit',()=>{clearTimeout(timer);resolve();});
   });
  }
 }
})();
