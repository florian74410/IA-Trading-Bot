'use strict';
/* Three actual service processes, signed Core IPC barrier, encrypted SQLite
 * WAL + JSONL capture, scratch restore. No production paths or wallets.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const http=require('node:http'),net=require('node:net'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),{once}=require('node:events');
const {setTimeout:delay}=require('node:timers/promises');
const Database=require('better-sqlite3');
const {createTrial}=require('../../Core/Backup/auth21_core_local_trial_wiring');
const {createSnapshotCoreClient}=require('../../Core/Backup/auth21_snapshot_core_client');
const {capture,restore}=require('../CI/auth21_engine_encrypted_bundle');
const APP=path.resolve(__dirname,'../..');
const SPEC=[
 ['portfolio','Portfolio/Engine/portfolio_service.js','IATB_PORTFOLIO_PORT'],
 ['marketdata','MarketData/market_data_service.js','IATB_MARKET_DATA_PORT'],
 ['fundamental','Fundamental/Engine/fundamental_service.js','IATB_FUNDAMENTAL_PORT'],
 ['trading','services/trading-engine/trading_service.js','IATB_TRADING_ENGINE_PORT']
];
async function unusedPort(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(ok=>s.close(ok));return p;}
async function probe(port){return new Promise(resolve=>{
 const req=http.get({hostname:'127.0.0.1',port,path:'/health',timeout:1000,agent:false},res=>{res.resume();res.on('end',()=>resolve(res.statusCode===403));});
 req.on('error',()=>resolve(false));req.on('timeout',()=>{req.destroy();resolve(false);});
});}
test('Core freezes three real Engines, captures encrypted WAL/JSONL, restores intact, rejects tampering',
 {timeout:65000},async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-auth21-core-runtime-'));fs.chmodSync(root,0o700);
 const app=path.join(root,'App');
 fs.cpSync(APP,app,{recursive:true,filter:src=>!path.relative(APP,src).split(path.sep).some(x=>['node_modules','.runtime','Data','Logs'].includes(x))});
 fs.symlinkSync(path.join(APP,'node_modules'),path.join(app,'node_modules'),'dir');
 fs.writeFileSync(path.join(root,'.iatb-auth21-core-local-trial'),'IATB_AUTH21_CORE_LOCAL_TRIAL_ONLY\n',{mode:0o600});
 const sec=path.join(root,'userdata','Security');fs.mkdirSync(sec,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(sec,'auth21_ipc.key'),crypto.randomBytes(32),{mode:0o600});
 const resources=[
  'userdata/User Data/snapshot-fixture/portfolio.db',
  'userdata/Shared Data/MarketData/market_registry.db',
  'userdata/Shared Data/Fundamental/fundamental.db',
  'userdata/Shared Data/MarketData/financial_snapshots.jsonl',
  'userdata/User Data/snapshot-fixture/trading_history.jsonl',
  'userdata/Database/clients.sqlite',
  'userdata/Security/client_master.key',
  'annexes/Strategies/fixture.json',
  'runtime/config/market_data_settings.json'
 ];
 const fpath=path.join(root,resources[3]);fs.mkdirSync(path.dirname(fpath),{recursive:true,mode:0o700});
 fs.writeFileSync(fpath,'{"fixture":"snapshotted","time":123}\n',{mode:0o600});
 fs.mkdirSync(path.dirname(path.join(root,resources[4])),{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(root,resources[4]),'{"fixture":"trading-history"}\n',{mode:0o600});
 const clientDb=path.join(root,resources[5]);fs.mkdirSync(path.dirname(clientDb),{recursive:true,mode:0o700});
 const db=new Database(clientDb);db.exec("CREATE TABLE fixture(id INTEGER PRIMARY KEY, value TEXT NOT NULL); INSERT INTO fixture(value) VALUES('original');");db.close();
 const syntheticKey=crypto.randomBytes(32);
 fs.writeFileSync(path.join(root,resources[6]),syntheticKey,{mode:0o600});
 for(const [rel,value] of [[resources[7],{strategy:'fixture'}],[resources[8],{refreshMs:15000}]]){
  const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
  fs.writeFileSync(target,JSON.stringify(value),{mode:0o600});
 }
 const ports={};for(const [engine] of SPEC)ports[engine]=await unusedPort();
 const env={...process.env,IATB_AUTH21_CORE_AUTH_TRIAL:'1',IATB_AUTH21_LOCAL_SNAPSHOT_TRIAL:'1',
  IATB_AUTH21_SNAPSHOT_IPC_TRIAL:'1',IATB_DEBUG_MODE:'1',IATB_DEBUG_BOOTSTRAP:'0',
  IATB_AUTH21_LOCAL_TRIAL_ROOT:root,IATB_TRADING_LIVE:'0',IATB_USERDATA_USER:'snapshot-fixture',
  IATB_PORTFOLIO_DB:path.join(root,resources[0]),
  IATB_MARKET_SETTINGS:path.join(root,resources[8]),
  IATB_MARKETDATA_OFFLINE_DIAGNOSTIC:'1',IATB_FUNDAMENTAL_STDOUT:'1',
  IATB_RUNTIME_ROOT:path.join(root,'runtime'),IATB_DATA_ROOT:path.join(root,'userdata'),
  IATB_ANNEX_ROOT:path.join(root,'annexes'),IATB_UPDATES_ROOT:path.join(root,'updates'),
  IATB_STATE_ROOT:path.join(root,'legacy'),ROUTER_PORT:String(await unusedPort()),
  IATB_PORTFOLIO_PORT:String(ports.portfolio),IATB_MARKET_DATA_PORT:String(ports.marketdata),
  IATB_FUNDAMENTAL_PORT:String(ports.fundamental),
  IATB_TRADING_ENGINE_PORT:String(ports.trading),IATB_TRADING_HISTORY:path.join(root,resources[4])};
 delete env.IATB_USER_DB;delete env.IATB_AUTH21_IPC_PROBE_TRIAL;
 const children=[],outputs={};
 t.after(async()=>{
  for(const child of children)if(child.exitCode===null&&child.signalCode===null){
   child.kill('SIGKILL');await once(child,'exit');
  }
  fs.rmSync(root,{recursive:true,force:true});
 });
 for(const [engine,entry] of SPEC){
  const child=spawn(process.execPath,[path.join(app,entry)],{cwd:app,env,stdio:['ignore','pipe','pipe']});
  outputs[engine]='';child.stdout.on('data',x=>outputs[engine]+=x);child.stderr.on('data',x=>outputs[engine]+=x);
  children.push(child);
 }
 for(const [engine] of SPEC){
  let ready=false;
  for(let i=0;i<100;i++){
   if(children[SPEC.findIndex(x=>x[0]===engine)].exitCode!==null)
    assert.fail(engine+' terminated: '+outputs[engine]);
   if(await probe(ports[engine])){ready=true;break;}
   await delay(60);
  }
  assert.ok(ready,engine+' did not bind: '+outputs[engine]);
 }
 for(const file of resources.filter(x=>x.endsWith('.db'))){
  let found=false;
  for(let i=0;i<60;i++){if(fs.existsSync(path.join(root,file))){found=true;break;}await delay(50);}
  assert.ok(found,'missing running Engine SQLite file '+file);
 }
 const core=createSnapshotCoreClient({env,root,timeoutMs:3000});
 const coordinator=createTrial(env).coordinator;
 assert.equal(coordinator.writerIds.length,8);
 assert.ok(coordinator.writerIds.includes('clients'));
 assert.ok(coordinator.writerIds.includes('trading'));
 const transportKey=crypto.randomBytes(32);
 const archive=await coordinator.execute(({epoch})=>capture({
  env,root,resources,transportKey,coordinator,epoch
 }));
 assert.equal(coordinator.state,'IDLE');
 const dest=path.join(os.tmpdir(),'iatb-auth21-restore-'+crypto.randomBytes(9).toString('hex'));
 t.after(()=>fs.rmSync(dest,{recursive:true,force:true}));
 const result=restore({archive,transportKey,outputDir:dest});
 assert.equal(result.files.length,resources.length);
 for(const rel of resources.filter(x=>x.endsWith('.db'))){
  const db=new Database(path.join(dest,rel),{readonly:true,fileMustExist:true});
  assert.equal(db.pragma('integrity_check',{simple:true}),'ok');db.close();
 }
 assert.equal(JSON.parse(fs.readFileSync(path.join(dest,resources[3]),'utf8')).fixture,'snapshotted');
 assert.equal(JSON.parse(fs.readFileSync(path.join(dest,resources[4]),'utf8')).fixture,'trading-history');
 assert.deepEqual(fs.readFileSync(path.join(dest,resources[6])),syntheticKey);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dest,resources[7]),'utf8')).strategy,'fixture');
 assert.equal(JSON.parse(fs.readFileSync(path.join(dest,resources[8]),'utf8')).refreshMs,15000);
 const restoredClient=new Database(path.join(dest,resources[5]),{readonly:true});
 assert.equal(restoredClient.prepare('SELECT value FROM fixture').get().value,'original');
 restoredClient.close();
 const rejected=path.join(os.tmpdir(),'iatb-auth21-restore-'+crypto.randomBytes(9).toString('hex'));
 assert.throws(()=>restore({archive,transportKey:crypto.randomBytes(32),outputDir:rejected}),/P22_ARCHIVE_AUTH_FAILED/);
 assert.equal(fs.existsSync(rejected),false);
 // Measure real HTTP barrier coordination latency, not synthetic callback latency.
 const timings=[];
 for(let i=0;i<16;i++){
  const started=process.hrtime.bigint();
  await coordinator.execute(()=>({ok:true}));
  timings.push(Number(process.hrtime.bigint()-started)/1e6);
 }
 timings.sort((a,b)=>a-b);
 const p95=timings[Math.ceil(.95*timings.length)-1];
 const p99=timings[Math.ceil(.99*timings.length)-1];
 console.log('# P22_LIVE_ENGINE_BARRIER_LATENCY_MS '+JSON.stringify({samples:timings.length,p95,p99,max:timings.at(-1)}));
 assert.ok(Number.isFinite(p95)&&Number.isFinite(p99)&&p99>=p95);
 // A genuine Engine crash after all PREPARE ACKs MUST NOT yield a successful
 // backup. Core keeps the entire coordinator BLOCKED for operator recovery.
 const trading=children[SPEC.findIndex(x=>x[0]==='trading')];
 await assert.rejects(coordinator.execute(async()=>{
  trading.kill('SIGKILL');
  await once(trading,'exit');
  return {archive:'UNUSABLE'};
 }),/SNAPSHOT_CLEANUP_FAILED/);
 assert.equal(coordinator.state,'BLOCKED');
 await assert.rejects(coordinator.execute(async()=>{}),/SNAPSHOT_COORDINATOR_BUSY/);
 // Start the genuine Trading service again with the SAME isolated journal.
 const restarted=spawn(process.execPath,[path.join(app,'services/trading-engine/trading_service.js')],
  {cwd:app,env,stdio:['ignore','pipe','pipe']});
 let restartLog='';restarted.stdout.on('data',x=>restartLog+=x);
 restarted.stderr.on('data',x=>restartLog+=x);children.push(restarted);
 let restartedReady=false;
 for(let i=0;i<100;i++){
  if(restarted.exitCode!==null)assert.fail('Trading restart: '+restartLog);
  if(await probe(ports.trading)){restartedReady=true;break;}
  await delay(60);
 }
 assert.ok(restartedReady,'Trading restart not ready: '+restartLog);
 // The reloaded persistent epoch remains held: PREPARE cannot silently
 // succeed with the stale generation, and Core must explicitly clean it.
 await assert.rejects(core.send({engine:'trading',port:ports.trading,command:'prepare',
  epoch:coordinator.epoch}),/SNAPSHOT_REMOTE_REJECTED/);
 await coordinator.recoverBlocked();
 assert.equal(coordinator.state,'IDLE');
 await core.send({engine:'trading',port:ports.trading,command:'prepare',
  epoch:coordinator.epoch+1});
 await core.send({engine:'trading',port:ports.trading,command:'release',
  epoch:coordinator.epoch+1});
});
