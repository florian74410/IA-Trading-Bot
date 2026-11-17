'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),net=require('node:net'),{spawn}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-risk-test-'));
process.env.IATB_RUNTIME_ROOT=path.join(temp,'runtime');process.env.IATB_DATA_ROOT=path.join(temp,'data');
const ROOT=path.resolve(__dirname,'../..'),CP=require('../../Core/Communication/communication_protocol_v1'),Client=require('../../Supervisor/Core/cp1_client'),Core=require('../../Supervisor/Core/supervisor_core'),{fixture}=require('./snapshot_fixture');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function post(port,url,body,token){return new Promise((resolve,reject)=>{const data=JSON.stringify(body),q=http.request({host:'127.0.0.1',port,path:url,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'X-IATB-CP-Token':token||''}},r=>{let a='';r.on('data',x=>a+=x);r.on('end',()=>{try{resolve({code:r.statusCode,body:JSON.parse(a)});}catch(e){reject(e);}});});q.on('error',reject);q.end(data);});}
test('real Router + Risk processes, Supervisor facade, discovery, auth, compatibility and native recheck', {timeout:30000},async()=>{
 const routerPort=await port(),riskPort=await port(),fixturePort=await port(),children=[],logs=[];let failure=false;
 const token=CP.ensureSecret(ROOT);const f=fixture();
 const server=http.createServer((req,res)=>{if(req.headers['x-iatb-cp-token']!==token){res.writeHead(403);return res.end('{}');}let raw='';req.on('data',x=>raw+=x);req.on('end',()=>{
  const m=JSON.parse(raw),cur=fixture(),data=m.action==='marketdata.candles'?cur.sources.market:m.action==='marketdata.microstructure.snapshot'?cur.sources.book:m.action==='portfolio.snapshot'?cur.sources.portfolio:m.action==='portfolio.trades'?cur.sources.trades:{summary:{}};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(CP.makeResponse(m,failure?'ERROR':'OK',failure?{error:'FIXTURE_UNAVAILABLE'}:data,{schema:'fixture.data/1.0'})));
 });});await new Promise(r=>server.listen(fixturePort,'127.0.0.1',r));
 const start=file=>{const c=spawn(process.execPath,[path.join(ROOT,file)],{env:{...process.env,ROUTER_PORT:String(routerPort),IATB_RISK_ENGINE_PORT:String(riskPort),IATB_USER_DB:path.join(temp,'settings.db')}});children.push(c);c.stdout.on('data',x=>logs.push(String(x)));c.stderr.on('data',x=>logs.push(String(x)));return c;};
 try{
  start('Core/Router/router.js');start('Risk/Engine/risk_service.js');
  const client=new Client(ROOT,routerPort);let ready=false;
  for(let j=0;j<100;j++){try{await client.request('risk','risk.status',{});ready=true;break;}catch(e){await delay(50);}}
  assert.ok(ready,'services did not become ready: '+logs.join('').slice(-1000));
  for(const [id,caps] of [['marketdata',['marketdata.candles','marketdata.microstructure.snapshot']],['portfolio',['portfolio.snapshot','portfolio.trades']],['indicator',['indicator.analyze']]]){
   const r=await post(routerPort,'/communication/v1/register',{id,host:'127.0.0.1',port:fixturePort,capabilities:caps},token);assert.equal(r.code,200);
  }
  const supervisor={cp:client},snap=await Core.prototype.createRiskSnapshot.call(supervisor,f.args);
  assert.equal(snap.schema,'risk.snapshot/2.0');assert.equal(snap.status,'COMPLETE');assert.equal(snap.decision,'ALLOW_WITH_LIMITS');
  assert.equal((await Core.prototype.getRiskSnapshot.call(supervisor,snap.snapshot_id,'account-1')).snapshot_id,snap.snapshot_id);
  const caps=await client.request('risk','risk.list_capabilities',{});assert.ok(caps.capabilities.includes('risk.snapshot.create'));assert.ok(caps.capabilities.includes('risk.snapshot'));
  const legacy=await client.request('risk','risk.snapshot',{symbol:'BTCUSDT',timeframe:'1m'});assert.equal(legacy.schema,'risk.analysis/0.1');
  await assert.rejects(client.request('risk','risk.snapshot.create',{...f.args,scores:{overall:0}}),/CP_ARGUMENT_UNEXPECTED/);
  await assert.rejects(client.request('risk','risk.snapshot.create',{...f.args,timeframe:'nonsense'}),/RISK_ARGUMENT_INVALID/);
  await assert.rejects(client.request('risk','risk.snapshot.get',{snapshot_id:snap.snapshot_id,portfolio_id:'another'}),/RISK_SNAPSHOT_NOT_FOUND/);
  const denied=await post(riskPort,'/cp/v1',CP.makeRequest('risk','risk.status',{}),'bad');assert.equal(denied.code,403);
  const unknown=await post(riskPort,'/cp/v1',CP.makeRequest('risk','risk.status',{injected:true}),token);assert.equal(unknown.code,400);
  const intent={...f.args.intent,schema:'cp1.trade-intent/1.0',source:'supervisor.autonomous-trading',mode:'PAPER',exchange:'BINANCE',symbol:'BTCUSDT',metadata:{context:'native_scalping',portfolio_id:'account-1',timeframe:'1m'}};
  const approval=await Core.prototype.requestRiskApproval.call(supervisor,intent);assert.equal(approval.approved,true);
  failure=true;
  const verify=await client.request('risk','risk.gate.verify',{risk_approval_id:approval.risk_approval_id,intent,consume:true});assert.equal(verify.ok,false);assert.equal(verify.error,'NATIVE_RISK_RECHECK_FAILED');
  const blocked=await client.request('risk','risk.gate.evaluate',{intent});assert.equal(blocked.approved,false);assert.equal(blocked.risk_approval_id,null);
  failure=false;
  const firewallClient=new (require('../../Core/Firewall/risk_approval_client'))(ROOT,routerPort);
  const consumed=await new Promise((resolve,reject)=>firewallClient.verify(approval.risk_approval_id,intent,true,(e,x)=>e?reject(e):resolve(x)));assert.equal(consumed.ok,true);
  const replay=await client.request('risk','risk.gate.verify',{risk_approval_id:approval.risk_approval_id,intent,consume:true});assert.equal(replay.ok,false);
  const manifest=require('../FunctionRegistry/Functions.json');for(const x of manifest.functions.filter(x=>/risk.snapshot\.|risk.constraints.get|risk.status/.test(x.id)))assert.equal(x.default_privilege,'DENY');
 }finally{for(const c of children)c.kill('SIGTERM');await Promise.all(children.map(c=>new Promise(r=>{if(c.exitCode!==null)return r();c.once('exit',r);setTimeout(()=>{c.kill('SIGKILL');r();},2000).unref();})));await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});}
});
test('new audited manifests remain DENY without an explicit administrator grant',()=>{const {FunctionRegistryManager}=require('../../Core/FunctionRegistry/manager'),manager=new FunctionRegistryManager(':memory:');try{const manifest=require('../FunctionRegistry/Functions.json');manager.sync(manifest,'risk');for(const id of ['risk.snapshot.create','risk.snapshot.get','risk.constraints.get','risk.status']){assert.equal(manager.allowed('supervisor','risk',id),false);const actual=manifest.functions.find(f=>f.id===id),generated=require('../../Tools/FunctionRegistry/generate').enrich({name:id},'risk');assert.deepEqual(actual,generated);assert.equal(actual.verified_handler,true);assert.ok(actual.input&&actual.output&&actual.examples.length);}}finally{manager.close();}});
