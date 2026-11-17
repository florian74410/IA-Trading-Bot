'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),http=require('node:http'),https=require('node:https'),net=require('node:net'),{spawn,execFileSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-okx-cp1-')),ROOT=path.resolve(__dirname,'../..');
process.env.IATB_RUNTIME_ROOT=path.join(temp,'runtime');process.env.IATB_DATA_ROOT=path.join(temp,'data');
const {profileFixture,apiFixture}=require('./okx_fixture'),CP=require('../../Core/Communication/communication_protocol_v1'),{createBridge}=require('../../Core/Clients/UserManagement/cp_bridge'),{createHandler}=require('../../Core/Clients/UserManagement/http'),{TradingVault}=require('../../Core/Clients/UserManagement/trading_vault'),{createVaultClient}=require('../../services/trading-engine/vault-client'),{TradingEngine}=require('../../services/trading-engine/trading-engine'),{OkxExecutor}=require('../../services/trading-engine/exchange-adapters/okx/executor');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function post(p,url,data){return new Promise((resolve,reject)=>{const raw=JSON.stringify(data),q=http.request({host:'127.0.0.1',port:p,path:url,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),'X-IATB-CP-Token':CP.ensureSecret(ROOT)}},res=>{let data='';res.on('data',x=>data+=x);res.on('end',()=>{try{resolve({code:res.statusCode,body:JSON.parse(data)});}catch(e){reject(e);}});});q.on('error',reject);q.end(raw);});}
test('profile key -> signed vault TLS -> Trading Firewall CP/1 -> Portfolio -> owner Risk', {timeout:40000},async()=>{
 const ports={router:await port(),firewall:await port(),trading:await port(),portfolio:await port(),risk:await port(),core:await port(),market:await port()},children=[],logs=[];
 const f=profileFixture(),vault=new TradingVault({sessions:f.sessions}),api=apiFixture();
 await vault.save(f.tokens.alice,{id:'okx-main',exchange:'OKX',markets:['SPOT'],actions:['read'],enabled:true,default:true,apiRegion:'EEA',credentials:{apiKey:'PROFILE_FIXTURE',apiSecret:'PROFILE_SECRET_FIXTURE',passphrase:'PROFILE_PASS_FIXTURE'}});
 const key=path.join(temp,'tls.key'),cert=path.join(temp,'tls.crt');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-keyout',key,'-out',cert],{stdio:'ignore'});
 const ipc=path.join(temp,'vault-ipc.key');fs.writeFileSync(ipc,crypto.randomBytes(32),{mode:0o600});
 process.env.IATB_AUTH21_TRADING_IPC_KEY_FILE=ipc;process.env.IATB_AUTH21_TRADING_IPC_KEY_ROOT=temp;
 const env={...process.env,IATB_AUTH_MODE:'authenticated',CORE_PUBLIC_PORT:String(ports.core),IATB_AUTH_TLS_CERT:cert,ROUTER_PORT:String(ports.router),IATB_FIREWALL_PORT:String(ports.firewall),IATB_TRADING_ENGINE_PORT:String(ports.trading),IATB_PORTFOLIO_PORT:String(ports.portfolio),IATB_RISK_ENGINE_PORT:String(ports.risk),IATB_PORTFOLIO_DB:path.join(temp,'portfolio.db'),IATB_USER_DB:path.join(temp,'settings.db')};
 const bridge=createBridge({root:ROOT,sessions:f.sessions,tradingVault:vault,routerPort:ports.router});
 const core=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},createHandler({sessions:f.sessions,tradingVault:vault,bridge,origin:'https://localhost',secret:crypto.randomBytes(32)}));await new Promise(r=>core.listen(ports.core,'127.0.0.1',r));
 const engine=new TradingEngine({accountRouting:createVaultClient({root:ROOT,env}),transport:api.transport,lifecycle:{canExecute:()=>false}});engine.registerExecutor('OKX',new OkxExecutor());
 const trading=http.createServer((req,res)=>{let raw='';req.on('data',x=>raw+=x);req.on('end',async()=>{try{
  assert.equal(req.headers['x-iatb-fw-forwarded'],'1');assert.equal(req.headers['x-iatb-cp-token'],CP.ensureSecret(ROOT));
  const m=JSON.parse(raw);assert.equal(m.action,'trading.account.snapshot');const result=await engine.accountSnapshot(m.arguments);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(CP.makeResponse(m,'OK',result,{schema:'trading.response/2.0'})));
 }catch(e){logs.push('TRADING_FIXTURE_ERROR:'+(/^[A-Z0-9_]+$/.test(e.message)?e.message:e.name));res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'TRADING_ACCOUNT_READ_FAILED'}));}});});await new Promise(r=>trading.listen(ports.trading,'127.0.0.1',r));
 const market=http.createServer((req,res)=>{let raw='';req.on('data',x=>raw+=x);req.on('end',()=>{const m=JSON.parse(raw),now=Date.now(),data=m.action==='marketdata.candles'?{symbol:'BTCUSDT',timeframe:'1m',candles:Array.from({length:101},(_,j)=>[now-(101-j)*60000,100,100,100,100+Math.sin(j)*.005])}:{symbol:'BTCUSDT',source:'OKX',market_type:'SPOT',observedAt:now,firewall:{decision:'PASS'},orderBook:{bids:[{price:99.99,size:10000}],asks:[{price:100.01,size:10000}]}};res.end(JSON.stringify(CP.makeResponse(m,'OK',data,{schema:'fixture.data/1.0'})));});});await new Promise(r=>market.listen(ports.market,'127.0.0.1',r));
 const start=file=>{const c=spawn(process.execPath,[path.join(ROOT,file)],{env});children.push(c);c.stdout.on('data',x=>logs.push(String(x)));c.stderr.on('data',x=>logs.push(String(x)));};
 try{
  start('Core/Router/router.js');start('Core/Firewall/firewall_service.js');start('Portfolio/Engine/portfolio_service.js');start('Risk/Engine/risk_service.js');
  let ready=false;for(let i=0;i<150;i++){try{await bridge.rpc('risk','risk.status',{});const h=await bridge.rpc('portfolio','portfolio.health',{});if(h.ok){ready=true;break;}}catch(e){}await pause(40);}assert.ok(ready,'Services not ready: '+logs.join('').slice(-1500));
  const registered=await post(ports.router,'/communication/v1/register',{id:'marketdata',host:'127.0.0.1',port:ports.market,capabilities:['marketdata.candles','marketdata.microstructure.snapshot']});assert.equal(registered.code,200);
  assert.equal((await post(ports.router,'/communication/v1/register',{id:'trading',host:'127.0.0.1',port:ports.firewall,capabilities:['trading.account.snapshot']})).code,400);
  await assert.rejects(bridge.rpc('portfolio','portfolio.account.snapshot',{account:'okx-main',symbol:'BTC-USDT'}),/CP_ACTION_FORBIDDEN|CP_ACTION_SCHEMA_MISSING/);
  const args={account:'okx-main',exchange:'OKX',symbol:'BTC-USDT'},snapshot=await bridge.bridge(f.tokens.alice,{target:'portfolio',action:'portfolio.account.snapshot',arguments:args});
  assert.equal(snapshot.snapshot.equityUSD,2000);assert.equal(snapshot.snapshot.equity,1000);assert.equal(snapshot.snapshot.availableQuote,900);assert.equal(snapshot.snapshot.analysis_mode,'OKX_ACCOUNT');assert.ok(!JSON.stringify(snapshot).includes('PROFILE_SECRET_FIXTURE'));
  await assert.rejects(bridge.bridge(f.tokens.bob,{target:'portfolio',action:'portfolio.account.snapshot',arguments:args}),/NOT_ASSIGNED/);
  await assert.rejects(bridge.bridge(f.tokens.guest,{target:'portfolio',action:'portfolio.account.snapshot',arguments:args}),/FORBIDDEN/);
  await assert.rejects(bridge.bridge(f.tokens.alice,{target:'portfolio',action:'portfolio.account.snapshot',arguments:{...args,owner:'CLbob'}}),/INVALID_REQUEST/);
  await assert.rejects(bridge.rpc('risk','risk.snapshot.create',{portfolio_id:'okx-main',symbol:'BTCUSDT',correlation_id:'raw'}),/OWNER_PROOF_REQUIRED/);
  await pause(1050);const risk=await bridge.bridge(f.tokens.alice,{target:'risk',action:'risk.snapshot.create',arguments:{portfolio_id:'okx-main',symbol:'BTCUSDT',timeframe:'1m',correlation_id:'profile-risk-1',context:'native_scalping',intent:{exchange:'OKX',action:'BUY',size:.1,stopLoss:99,leverage:1}}});
  assert.equal(risk.metrics.portfolio.available,true);assert.equal(risk.metrics.portfolio.equity,1000);assert.equal(risk.metrics.execution.fee_rate,.001);assert.equal(risk.decision,'UNAVAILABLE');assert.ok(risk.missing_metrics.includes('portfolio.daily_loss'));
  const saved=await bridge.bridge(f.tokens.alice,{target:'risk',action:'risk.snapshot.get',arguments:{portfolio_id:'okx-main',snapshot_id:risk.snapshot_id}});assert.equal(saved.snapshot_id,risk.snapshot_id);
  await assert.rejects(bridge.bridge(f.tokens.bob,{target:'risk',action:'risk.snapshot.get',arguments:{portfolio_id:'okx-main',snapshot_id:risk.snapshot_id}}),/OWNER_OPERATION_DENIED/);
  assert.equal(api.requests.filter(r=>r.method!=='GET').length,0);assert.ok(api.requests.every(r=>new URL(r.url).pathname!=='/api/v5/trade/order'));
 }catch(e){throw Error(e.message+'; fixture diagnostics: '+logs.join('').slice(-1800));}finally{
  for(const c of children)c.kill('SIGTERM');await Promise.all(children.map(c=>new Promise(r=>{if(c.exitCode!==null)return r();c.once('exit',r);setTimeout(()=>{c.kill('SIGKILL');r();},2000).unref();})));
  await Promise.all([core,trading,market].map(s=>new Promise(r=>s.close(r))));fs.rmSync(temp,{recursive:true,force:true});
 }
});
