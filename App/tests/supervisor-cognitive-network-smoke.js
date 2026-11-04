'use strict';
// DEBUG ONLY. Real Router and Supervisor child processes, fake HTTPS Core session
// revalidator and MOCK LLM. No real OpenAI calls, no LIVE trading or production DB.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const http=require('node:http'),https=require('node:https'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const appRoot=path.resolve(__dirname,'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const server=net.createServer();await new Promise((ok,no)=>server.listen(0,'127.0.0.1',ok).on('error',no));const p=server.address().port;await new Promise(ok=>server.close(ok));return p;}
async function get(port,pathName){return new Promise((ok,no)=>{http.get({hostname:'127.0.0.1',port,path:pathName,timeout:1200},r=>{r.resume();r.on('end',()=>ok(r.statusCode));}).on('error',no);});}
async function waitFor(fn,timeoutMs=15000){const start=Date.now();while(Date.now()-start<timeoutMs){try{const x=await fn();if(x)return x;}catch(e){}await delay(150);}throw Error('DEBUG_SERVICE_NOT_READY');}
async function stop(child){if(!child||child.exitCode!==null)return;child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(2000)]);if(child.exitCode===null){child.kill('SIGKILL');await new Promise(resolve=>child.once('exit',resolve));}}
test('actual Router -> Supervisor -> verified owner receiver -> persistent cognitive memory (MOCK)',{timeout:60000},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-supervisor-network-'));
 const routerPort=await port(),supervisorPort=await port(),corePort=await port();
 const key=path.join(temp,'tls.key'),cert=path.join(temp,'tls.crt');
 const openssl=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-keyout',key,'-out',cert],{stdio:'ignore'});
 assert.equal(openssl.status,0,'OpenSSL test fixture required');
 const env={...process.env,IATB_RUNTIME_ROOT:path.join(temp,'runtime'),IATB_DATA_ROOT:path.join(temp,'data'),IATB_USER_DB:path.join(temp,'user.sqlite'),IATB_AUTH_MODE:'authenticated',IATB_DEBUG_MODE:'1',IATB_AUTH_TLS_CERT:cert,ROUTER_PORT:String(routerPort),CORE_PUBLIC_PORT:String(corePort),IATB_SUPERVISOR_PORT:String(supervisorPort)};
 const oldRoot=process.env.IATB_RUNTIME_ROOT;process.env.IATB_RUNTIME_ROOT=env.IATB_RUNTIME_ROOT;
 const CP=require('../Core/Communication/communication_protocol_v1'),{proofCodec}=require('../Core/Clients/auth21_ipc_proof'),Client=require('../Core/Communication/cp1_client');
 let router=null,supervisor=null,core=null;
 const outputs=[];
 const launch=(file)=>{const child=spawn(process.execPath,[file],{cwd:appRoot,env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>outputs.push(b.toString().slice(-1000)));child.stderr.on('data',b=>outputs.push(b.toString().slice(-1000)));return child;};
 try{
  core=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
   if(req.method==='POST'&&req.url==='/auth21/internal/authorize-owner'){req.resume();res.writeHead(200);res.end('AUTHORIZED_DEBUG_MOCK');return;}
   res.writeHead(404);res.end();
  });await new Promise((ok,no)=>core.listen(corePort,'127.0.0.1',ok).on('error',no));
  router=launch(path.join(appRoot,'Core','Router','router.js'));
  await waitFor(async()=>await get(routerPort,'/router-health-internal')===200);
  supervisor=launch(path.join(appRoot,'Supervisor','supervisor_service.js'));
  await waitFor(async()=>await get(supervisorPort,'/health')===200);
  const client=new Client({root:appRoot,routerPort,timeout:5000});
  const rpc=(action,args)=>new Promise((ok,no)=>client.request('supervisor',action,args,'analysis',(e,d)=>e?no(e):ok(d)));
  await waitFor(async()=>{const x=await rpc('supervisor.health',{});return x?.execution==='INTENTION_ONLY';});
  const codec=proofCodec({secret:Buffer.from(CP.ensureSecret(appRoot),'hex')});
  const owner=async(clientId,sessionId,prompt)=>{
   const principal={clientId,role:'USER'},payload={clientId,sessionHash:'test-session-hash',action:'supervisor.cognitive.reason',args:{sessionId,prompt},configuration:{provider:'MOCK',model:'gpt-5.6'},delegation:{mock:true}};
   const proof=codec.issue({principal,audience:'supervisor',operation:'self.write',method:'POST',ownerClientId:clientId,action:'supervisor.user.request',bodyDigest:CP.hashData(payload)});
   return rpc('supervisor.user.request',{payload,proof});
  };
  await assert.rejects(rpc('supervisor.cognitive.reason',{prompt:'bypass'}),/FORBIDDEN|MISSING|ROUTE/i);
  const a=await owner('CLalice','same','First greeting');
  assert.equal(a.execution,'NONE');assert.equal(a.memory.historyUsed,0);
  const b=await owner('CLbob','same','Other owner');
  assert.equal(b.memory.historyUsed,0,'another owner must not inherit history');
  await stop(supervisor);supervisor=null;
  supervisor=launch(path.join(appRoot,'Supervisor','supervisor_service.js'));
  await waitFor(async()=>await get(supervisorPort,'/health')===200);
  await waitFor(async()=>{const x=await rpc('supervisor.health',{});return x?.execution==='INTENTION_ONLY';});
  const continued=await owner('CLalice','same','Continue conversation');
  assert.equal(continued.memory.historyUsed,2,'owner history should survive Supervisor restart');
  const status=await rpc('supervisor.cognitive.status',{});
  assert.equal(status.health.checks.shortTerm,'OK');assert.equal(status.health.checks.longTerm,'OK');
 }catch(e){e.message+='\nSERVICE_LOG_TAIL: '+outputs.join('').slice(-3500);throw e;}
 finally{
  await stop(supervisor);await stop(router);
  if(core)await new Promise(ok=>core.close(ok));
  if(oldRoot===undefined)delete process.env.IATB_RUNTIME_ROOT;else process.env.IATB_RUNTIME_ROOT=oldRoot;
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
