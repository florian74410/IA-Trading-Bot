'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const Database=require('better-sqlite3'),ClientCrypto=require('../../Core/Clients/client_crypto');
const {migrate}=require('../../Core/Clients/UserManagement/migration'),{UserStore}=require('../../Core/Clients/UserManagement/store');
const {run}=require('../../Core/Clients/UserManagement/cli'),{Auth21AdminStore}=require('../../Core/Clients/auth21_admin_store');
const {configuration}=require('../../Core/Clients/UserManagement/config');
const PASSWORD='Fictional test password 2026!';
async function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-um-test-'));fs.mkdirSync(path.join(root,'Security'));fs.mkdirSync(path.join(root,'Database'));const file=path.join(root,'Database','clients.sqlite'),key=path.join(root,'Security','client_master.key'),cipher=new ClientCrypto(key,{clientDbPath:file}),db=new Database(file);db.pragma('foreign_keys=ON');for(const name of ['001_clients_v1.sql','002_client_accounts_v1.sql'])db.exec(fs.readFileSync(path.resolve(__dirname,'../../Core/Clients/migrations',name),'utf8'));t.after(()=>{if(db.open)db.close();fs.rmSync(root,{recursive:true,force:true});});await migrate(db,{backupFile:file+'.backup',keyFile:key,confirm:'MIGRATE USER MANAGEMENT V1'});const prompts=['Admin','Test','admin@example.invalid','ADMIN',PASSWORD,PASSWORD,'CREATE FIRST ADMIN'];const admin=await run(['create-first-admin'],{env:{IATB_DATA_ROOT:root},check:()=>true,prompt:async()=>prompts.shift()});let now=1900000000;const sessions=new UserStore({db,clientCrypto:cipher,nowSeconds:()=>now});const login=await sessions.loginEmail('admin@example.invalid',PASSWORD);const manager=new Auth21AdminStore({sessionStore:sessions,authorizeLocalOperator:()=>true});return {root,file,key,cipher,db,sessions,login,manager,admin,advance:n=>now+=n};}
async function account(f,name,role='USER'){const x=await f.manager.createAccount(f.login.token,{firstName:name,lastName:'Test',email:name+'@example.invalid',username:name,password:PASSWORD,role});return {...x,...await f.sessions.loginEmail(name+'@example.invalid',PASSWORD)};}
test('every historical route enforces the ADMIN/USER/GUEST boundary with live TLS sessions',async t=>{
 const f=await fixture(t),a=await account(f,'alice'),b=await account(f,'bobby'),g=await account(f,'guest','GUEST');
 const {createHandler}=require('../../Core/Clients/UserManagement/http'),Context=require('../../Core/Clients/UserManagement/context'),{createBrowserSession}=require('../../Core/Clients/auth21_browser_cookie');
 const https=require('node:https'),{execFileSync}=require('node:child_process'),{once}=require('node:events');
 const key=path.join(f.root,'matrix.key'),cert=path.join(f.root,'matrix.crt');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-keyout',key,'-out',cert],{stdio:'ignore'});
 const origin='https://localhost:34443',secret=crypto.randomBytes(32),cookies=createBrowserSession({secret,origin}),calls=[];
 const handler=createHandler({sessions:f.sessions,origin,secret});
 const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>handler(req,res,()=>{calls.push({route:req.url,principal:Context.current()});res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({clientId:Context.current().clientId}));}));
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
 function call(row,user,body={}){return new Promise((resolve,reject)=>{const raw=row.method==='GET'?'':JSON.stringify(body),headers={'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),Origin:origin};if(user){headers.Cookie=cookies.cookie(user.token).split(';')[0];headers['X-IATB-CSRF']=cookies.csrf(user.token);}const q=https.request({host:'127.0.0.1',servername:'localhost',port:server.address().port,ca:fs.readFileSync(cert),path:row.path,method:row.method,headers},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(text)}));});q.on('error',reject);q.end(raw);});}
 const rows=require('../../../Documentation/UserManagement/legacy-route-decisions.json').routes;
 for(const row of rows){
  const label=row.method+' '+row.path;
  assert.equal((await call(row)).status,401,label+' anonymous');
  if(require('../../Bank/Core/feature_policy_v2_4_1').blockedPath(row.path)){
   for(const user of [f.login,a,b,g]){const result=await call(row,user);assert.equal(result.status,403,label);assert.equal(result.data.error,'BANK_FEATURE_SUSPENDED',label);}
  }else if(row.classification==='ADMIN-ONLY'){
   for(const user of [a,b,g])assert.equal((await call(row,user)).status,403,label+' non-admin');
   if(row.method==='POST'){
    assert.equal((await call(row,f.login)).status,428,label+' must require reauthentication');
    assert.equal((await call(row,f.login,{password:PASSWORD})).status,400,label+' must require confirmation');
    const before=calls.length;assert.equal((await call(row,f.login,{password:PASSWORD,confirmed:true})).status,200,label);assert.equal(calls.length,before+1);assert.equal(calls.at(-1).principal.role,'ADMIN');assert.equal(calls.at(-1).principal.operatorReauthenticated,true);
   }else assert.equal((await call(row,f.login)).status,200,label);
  }else if(['DENIED-SECURITY','RETIRED'].includes(row.classification)){
   for(const user of [f.login,a,b,g])assert.equal((await call(row,user)).status,403,label+' unavailable even to ADMIN');
  }else if(row.path==='/api/settings/test-zerox'){
   // Current runtime restricts this provider diagnostic to ADMIN. Keep the stronger guard.
   for(const user of [a,b,g])assert.equal((await call(row,user)).status,403,label+' non-admin');
   assert.equal((await call(row,f.login)).status,200,label+' ADMIN');
  }else if(row.path==='/api/session/test-email'){
   assert.equal((await call(row,a)).status,403,label+' old Apple Mail remains inaccessible');
  }else{
   // Positive delegation proves the owner context, not the business operation.
   const direct=['/api/settings/apis/clear','/api/session/change-password','/api/session/change-email'];
   if(!direct.includes(row.path))for(const user of [a,b]){
    const result=await call(row,user,row.path.startsWith('/api/security/wallets/')?{password:PASSWORD}:{});assert.equal(result.status,200,label);assert.equal(result.data.clientId,user.clientId,label+' effective owner');
   }
   if(!['/api/session/change-password','/api/session/change-email'].includes(row.path))assert.equal((await call(row,g)).status,403,label+' GUEST');
  }
 }
 const capability={method:'GET',path:'/auth21/capabilities'};
 assert.equal((await call(capability)).status,401);assert.equal((await call(capability,a)).data.privateWorkspace,true);assert.equal((await call(capability,g)).data.privateWorkspace,false);assert.equal((await call(capability,f.login)).data.infrastructureAdministration,true);assert.equal((await call(capability,a)).data.execution.enabled,false);
 f.manager.setEnabled(f.login.token,a.clientId,false);assert.equal((await call({method:'GET',path:'/api/settings'},a)).status,401,'revoked session');
});

test('CP1 administration uses real Auth21 roles, HTTPS Origin and CSRF',async t=>{
 const f=await fixture(t),user=await account(f,'cp1user'),guest=await account(f,'cp1guest','GUEST'),root=path.resolve(__dirname,'../..');
 const I=require('../../Core/FunctionRegistry/Control/identity'),{ControlRuntime}=require('../../Core/FunctionRegistry/Control/runtime'),{createHandler}=require('../../Core/Clients/UserManagement/http'),{createBrowserSession}=require('../../Core/Clients/auth21_browser_cookie'),https=require('node:https'),{execFileSync}=require('node:child_process');
 const control=path.join(f.root,'control');I.provision(control);const runtime=new ControlRuntime({root,sessions:f.sessions,env:{IATB_CP1_CONTROL_ROOT:control},discovery:false});t.after(()=>runtime.close());
 const key=path.join(f.root,'cp1.key'),cert=path.join(f.root,'cp1.crt');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-keyout',key,'-out',cert],{stdio:'ignore'});
 const origin='https://localhost',secret=crypto.randomBytes(32),cookies=createBrowserSession({origin,secret});let ready=true;const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},createHandler({sessions:f.sessions,functionRegistry:runtime,origin,secret,readiness:()=>ready}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 function call(who,operation,data={},options={}){return new Promise((resolve,reject)=>{const raw=options.method==='GET'?'':JSON.stringify(options.rawBody||{operation,data}),headers={'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),Origin:options.foreign?'https://foreign.invalid':origin};if(who){headers.Cookie=cookies.cookie(who.token).split(';')[0];headers['X-IATB-CSRF']=options.badCsrf?'bad':cookies.csrf(who.token);}const q=https.request({host:'127.0.0.1',servername:'localhost',port:server.address().port,ca:fs.readFileSync(cert),path:options.path||'/auth21/cp1/control',method:options.method||'POST',headers},res=>{let raw='';res.on('data',x=>raw+=x);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(raw)}));});q.on('error',reject);q.end(raw);});}
 const settingOptions={path:'/api/settings/chatbot',rawBody:{mode:'LOCAL',autoFallback:false}};assert.equal((await call(user,'',{},settingOptions)).status,200);assert.equal(JSON.parse(f.sessions.getPreference(user.token,'chatbot','settings')).mode,'LOCAL');assert.equal((await call(f.login,'',{}, {path:'/api/settings/chatbot',method:'GET'})).body.settings.mode,'HYBRID');assert.equal((await call(guest,'',{}, {path:'/api/settings/chatbot',method:'GET'})).status,403);assert.equal((await call(user,'',{}, {...settingOptions,badCsrf:true})).status,403);assert((await call(user,'',{}, {path:'/api/settings/chatbot',rawBody:{mode:'LOCAL',autoFallback:false,executeLive:true}})).status>=400);
 assert.equal((await call(null,'commands')).status,403);assert.equal((await call(guest,'agent.register',{agent_id:'agent'})).status,403);
 assert.equal((await call(user,'agent.register',{agent_id:'agent'})).status,200);assert.equal((await call(user,'commands',{role:'ADMIN',verified:true})).status,403);assert.equal((await call(user,'permission.grant',{agent_key:'x',decision:'ALLOW',isAdmin:true})).status,403);
 assert.equal((await call(f.login,'commands')).status,200);assert.equal((await call(f.login,'commands',{}, {foreign:true})).status,403);assert.equal((await call(f.login,'commands',{}, {badCsrf:true})).status,403);ready=false;assert.equal((await call(f.login,'commands')).status,503);
 const vault=new (require('../../Core/Clients/UserManagement/trading_vault').TradingVault)({sessions:f.sessions});await vault.save(user.token,{id:'session-okx',exchange:'OKX',markets:['SPOT'],actions:['read'],enabled:true,default:true,credentials:{apiKey:'TEST',apiSecret:'TEST',passphrase:'TEST'}});const hash=t=>crypto.createHash('sha256').update(Buffer.from(t,'base64url')).digest('hex'),intent={exchange:'OKX',account:'session-okx',market_type:'SPOT',symbol:'BTC-USDT'},ticket=await vault.issueReadForSession(hash(user.token),intent);const bind=await vault.access({ticket:ticket.ticket,intent,action:'read',operation:'bind'});assert.equal(bind.identity.owner,user.clientId);await assert.rejects(vault.issueReadForSession(hash(guest.token),intent));f.sessions.revokeSession(user.token);await assert.rejects(vault.access({ticket:ticket.ticket,intent,action:'read',operation:'credentials',exchange:'OKX'}));
});
