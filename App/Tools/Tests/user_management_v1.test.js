'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const Database=require('better-sqlite3'),ClientCrypto=require('../../Core/Clients/client_crypto');
const {migrate}=require('../../Core/Clients/UserManagement/migration'),{UserStore}=require('../../Core/Clients/UserManagement/store');
const {run}=require('../../Core/Clients/UserManagement/cli'),{Auth21AdminStore}=require('../../Core/Clients/auth21_admin_store');
const {configuration}=require('../../Core/Clients/UserManagement/config');
const PASSWORD='Fictional test password 2026!';
async function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-um-test-'));fs.mkdirSync(path.join(root,'Security'));fs.mkdirSync(path.join(root,'Database'));const file=path.join(root,'Database','clients.sqlite'),key=path.join(root,'Security','client_master.key'),cipher=new ClientCrypto(key,{clientDbPath:file}),db=new Database(file);db.pragma('foreign_keys=ON');for(const name of ['001_clients_v1.sql','002_client_accounts_v1.sql'])db.exec(fs.readFileSync(path.resolve(__dirname,'../../Core/Clients/migrations',name),'utf8'));t.after(()=>{if(db.open)db.close();fs.rmSync(root,{recursive:true,force:true});});await migrate(db,{backupFile:file+'.backup',keyFile:key,confirm:'MIGRATE USER MANAGEMENT V1'});const prompts=['Admin','Test','admin@example.invalid','ADMIN',PASSWORD,PASSWORD,'CREATE FIRST ADMIN'];const admin=await run(['create-first-admin'],{env:{IATB_DATA_ROOT:root},check:()=>true,prompt:async()=>prompts.shift()});let now=1900000000;const sessions=new UserStore({db,clientCrypto:cipher,nowSeconds:()=>now});const login=await sessions.loginEmail('admin@example.invalid',PASSWORD);const manager=new Auth21AdminStore({sessionStore:sessions,authorizeLocalOperator:()=>true});return {root,file,key,cipher,db,sessions,login,manager,admin,advance:n=>now+=n};}
async function account(f,name,role='USER'){const x=await f.manager.createAccount(f.login.token,{firstName:name,lastName:'Test',email:name+'@example.invalid',username:name,password:PASSWORD,role});return {...x,...await f.sessions.loginEmail(name+'@example.invalid',PASSWORD)};}
test('offline migration backup and CLI first ADMIN preserve key and reject duplicate bootstrap',async t=>{const f=await fixture(t);assert.equal(fs.statSync(f.file+'.backup').mode&0o777,0o600);assert.equal(f.db.pragma('integrity_check',{simple:true}),'ok');const saved=fs.readFileSync(f.key);await assert.rejects(run(['create-first-admin'],{env:{IATB_DATA_ROOT:f.root},check:()=>true}),/ADMIN_ALREADY_EXISTS/);assert.deepEqual(fs.readFileSync(f.key),saved);await assert.rejects(run(['create','--password','unsafe']),/ARGUMENT/);assert.throws(()=>f.manager.setEnabled(f.login.token,f.admin.clientId,false),/LAST_ACTIVE_ADMIN/i);});
test('real Argon2 email authentication, persistent throttling, ciphertext and opaque sessions',async t=>{const f=await fixture(t),a=await account(f,'alice');assert.equal(f.sessions.profile(a.token).email,'alice@example.invalid');const raw=JSON.stringify(f.db.prepare('SELECT * FROM client_accounts').all())+JSON.stringify(f.db.prepare('SELECT * FROM clients').all())+JSON.stringify(f.db.prepare('SELECT * FROM client_sessions').all());for(const secret of [PASSWORD,a.token,'alice@example.invalid'])assert(!raw.includes(secret));for(let i=0;i<5;i++)assert.equal(await f.sessions.loginEmail('missing@example.invalid','bad'),null);assert.deepEqual(await f.sessions.loginEmail('missing@example.invalid','bad'),{throttled:true});assert(f.db.prepare('SELECT COUNT(*) n FROM um_login_attempts').get().n>0);});
test('two users cannot read preferences, secrets, sessions or audit of each other; GUEST write forbidden',async t=>{const f=await fixture(t),a=await account(f,'alice'),b=await account(f,'bobby'),g=await account(f,'guest','GUEST');f.sessions.setBrowserState(a.token,{layout:'x'.repeat(32768)});assert.deepEqual(f.sessions.browserState(b.token),{});assert.equal(f.sessions.browserState(a.token).layout.length,32768);f.sessions.setPreference(a.token,'chart','layout','private-A');assert.equal(f.sessions.getPreference(b.token,'chart','layout'),null);f.sessions.setSecrets(a.token,{OPENAI_API_KEY:'fixture-only-A'});assert.deepEqual(f.sessions.secrets(b.token),{});const id=f.sessions.sessionsFor(a.token)[0].id;assert.throws(()=>f.sessions.revokeOwn(b.token,id),/NOT_FOUND/);assert.throws(()=>f.sessions.setPreference(g.token,'chart','layout','no'),/GUEST|FORBIDDEN|READ_ONLY/);assert.throws(()=>f.sessions.setSecrets(g.token,{OPENAI_API_KEY:'no'}),/FORBIDDEN/);});
test('password change revokes all sessions and preserves per-user ciphertext, email change revokes login',async t=>{const f=await fixture(t),a=await account(f,'alice');f.sessions.setSecrets(a.token,{OPENAI_API_KEY:'fixture-only-A'});const second=await f.sessions.loginEmail('alice@example.invalid',PASSWORD),oldHash=f.db.prepare('SELECT password_hash FROM client_accounts WHERE client_id=?').get(a.clientId).password_hash;const changed=await f.sessions.changePassword(a.token,{password:PASSWORD,newPassword:PASSWORD+'new'});assert(changed.reauthenticationRequired);assert.equal(f.sessions.verifySession(a.token),null);assert.equal(f.sessions.verifySession(second.token),null);assert.notEqual(f.db.prepare('SELECT password_hash FROM client_accounts WHERE client_id=?').get(a.clientId).password_hash,oldHash);const next=await f.sessions.loginEmail('alice@example.invalid',PASSWORD+'new');assert.equal(f.sessions.secrets(next.token).OPENAI_API_KEY,'fixture-only-A');await f.sessions.updateProfile(next.token,{email:'new@example.invalid',password:PASSWORD+'new'});assert.equal(f.sessions.verifySession(next.token),null);assert(await f.sessions.loginEmail('new@example.invalid',PASSWORD+'new'));});
test('expiry and CLI disable invalidate live session and hashed interprocess session',async t=>{const f=await fixture(t),a=await account(f,'alice'),hash=crypto.createHash('sha256').update(Buffer.from(a.token,'base64url')).digest('hex');assert(f.sessions.verifyHashedSession(hash));f.manager.setEnabled(f.login.token,a.clientId,false);assert.equal(f.sessions.verifySession(a.token),null);assert.equal(f.sessions.verifyHashedSession(hash),null);f.advance(90000);assert.equal(f.sessions.verifySession(f.login.token),null);assert(f.sessions.db.prepare("SELECT 1 FROM client_security_audit WHERE action='SESSION_EXPIRED'").get());});
test('production configuration rejects bypass and cannot silently use DEV credentials',()=>{assert.throws(()=>configuration({NODE_ENV:'production'}),/BYPASS/);assert.throws(()=>configuration({IATB_DEPLOYMENT_MODE:'PRODUCTION',IATB_AUTH_MODE:'authenticated'}),/ORIGIN/);assert.equal(configuration({}).mode,'DEV-LOCAL');});
module.exports={fixture,PASSWORD};
test('real TLS HTTP handler: cookie, origin, CSRF, spoofed ownership, CLI-only administration and logout',async t=>{
 const f=await fixture(t),https=require('node:https'),http=require('node:http'),{once}=require('node:events'),{execFileSync}=require('node:child_process'),{createHandler}=require('../../Core/Clients/UserManagement/http');
 const key=path.join(f.root,'tls.key'),cert=path.join(f.root,'tls.crt');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-keyout',key,'-out',cert],{stdio:'ignore'});const origin='https://localhost:34567';
 const operatorCalls=[],handler=createHandler({sessions:f.sessions,origin,secret:crypto.randomBytes(32),bridge:{bridge:async(token,input,options)=>{operatorCalls.push({input,options});return {ok:true};}}}),server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},handler);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const plain=http.createServer(handler);plain.listen(0,'127.0.0.1');await once(plain,'listening');t.after(()=>new Promise(r=>plain.close(r)));
 async function call(route,method='GET',body=null,headers={},secure=true){const raw=body===null?'':JSON.stringify(body);return new Promise((resolve,reject)=>{const req=(secure?https:http).request({host:'127.0.0.1',port:(secure?server:plain).address().port,path:route,method,ca:fs.readFileSync(cert),servername:'localhost',headers:{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),...headers}},r=>{let data='';r.on('data',b=>data+=b);r.on('end',()=>resolve({status:r.statusCode,data:JSON.parse(data),cookie:r.headers['set-cookie']?.[0]}));});req.on('error',reject);req.end(raw);});}
 assert.equal((await call('/auth21/me')).status,401);assert.equal((await call('/auth21/me','GET',null,{},false)).status,403);
 const login=await call('/auth21/login','POST',{email:'admin@example.invalid',password:PASSWORD});assert.equal(login.status,200);assert.match(login.cookie,/Secure; HttpOnly; SameSite=Strict; Path=\//);assert.equal(login.data.token,undefined);const headers={Cookie:login.cookie.split(';')[0],'X-IATB-CSRF':login.data.csrfToken};
 assert.equal((await call('/auth21/me','GET',null,headers)).data.client.clientId,f.admin.clientId);
 assert.equal((await call('/auth21/preferences','PUT',{scope:'ui',key:'theme',value:'dark'},{Cookie:headers.Cookie})).status,403);
 assert.equal((await call('/auth21/preferences','PUT',{scope:'ui',key:'theme',value:'dark'},headers)).status,200);
 for(const scope of ['indicators','browser_actions','configuration'])assert.equal((await call('/auth21/preferences','PUT',{scope,key:'definitions',value:'{}'},headers)).status,403);
 assert.equal((await call('/auth21/preferences?scope=ui&key=theme','GET',null,headers)).data.value,'dark');
 assert.equal((await call('/api/settings/apis','POST',{openaiApiKey:'FICTIONAL_KEY'},headers)).status,428);
 assert.equal((await call('/api/settings/apis','POST',{openaiApiKey:'FICTIONAL_KEY',password:PASSWORD},headers)).status,200);
 assert.equal((await call('/api/settings/apis/clear','POST',{name:'OPENAI_API_KEY'},headers)).status,428);
 assert.equal((await call('/api/settings/apis/clear','POST',{name:'OPENAI_API_KEY',password:'wrong'},headers)).status,401);
 assert.equal((await call('/api/settings/apis/clear','POST',{name:'OPENAI_API_KEY',password:PASSWORD},headers)).status,200);
 assert.deepEqual(f.sessions.secrets(f.login.token),{});
 const operation={target:'marketdata',action:'marketdata.settings.set',arguments:{settings:{defaultSource:'BINANCE'}}};assert.equal((await call('/communication/v1/ui/write','POST',operation,headers)).status,428);assert.equal((await call('/communication/v1/ui/write','POST',{...operation,password:'wrong',confirmed:true},headers)).status,401);assert.equal((await call('/communication/v1/ui/write','POST',{...operation,password:PASSWORD,confirmed:true},headers)).status,200);assert.equal(operatorCalls.length,1);assert.equal(operatorCalls[0].options.operatorAuthorized,true);assert.equal(operatorCalls[0].input.password,undefined);assert.equal(operatorCalls[0].input.confirmed,undefined);
 assert.equal((await call('/api/admin/users','POST',{email:'evil@example.invalid'},headers)).status,403);
 assert.equal((await call('/api/settings/language','POST',{clientId:'CLVictim',language:'fr'},headers)).status,404); // no legacy delegate in this focused handler fixture
 assert.equal((await call('/auth21/profile','POST',{email:'x@example.invalid',password:PASSWORD,role:'ADMIN'},headers)).status,400);
 assert.equal((await call('/auth21/logout','POST',{}, {...headers,Origin:'https://evil.invalid'})).status,403);
 assert.equal((await call('/auth21/logout','POST',{},headers)).status,200);assert.equal((await call('/auth21/me','GET',null,headers)).status,401);
});
test('actual Core and Gateway processes authenticate over pinned TLS, isolate language and deny web administration',async t=>{
 const f=await fixture(t),{spawn,execFileSync}=require('node:child_process'),https=require('node:https'),net=require('node:net'),{once}=require('node:events');await account(f,'alice');await account(f,'bobby');await account(f,'guest','GUEST');
 const allocatedPorts=new Set();
 async function port(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));if(allocatedPorts.has(p))return port();allocatedPorts.add(p);return p;}
 fs.writeFileSync(path.join(f.root,'Security','wallet_master.key'),crypto.randomBytes(32).toString('hex'),{mode:0o600});
 const corePort=await port(),uiPort=await port(),routerPort=await port(),indicatorPort=await port(),strategyPort=await port(),portfolioPort=await port(),supervisorPort=await port(),crt=path.join(f.root,'tls.crt'),key=path.join(f.root,'tls.key');execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-keyout',key,'-out',crt],{stdio:'ignore'});fs.chmodSync(key,0o600);fs.chmodSync(f.file,0o600);fs.mkdirSync(path.join(f.root,'state'));
 const origin='https://localhost:'+uiPort,env={...process.env,IATB_DATA_ROOT:f.root,IATB_RUNTIME_ROOT:path.join(f.root,'runtime'),IATB_STATE_ROOT:path.join(f.root,'state'),IATB_ANNEX_ROOT:path.join(f.root,'annex'),IATB_UPDATES_ROOT:path.join(f.root,'updates'),IATB_PORT:String(corePort),CORE_PUBLIC_PORT:String(corePort),IATB_UI_PORT:String(uiPort),ROUTER_PORT:String(routerPort),IATB_INDICATOR_PORT:String(indicatorPort),IATB_STRATEGY_PORT:String(strategyPort),IATB_PORTFOLIO_PORT:String(portfolioPort),IATB_SUPERVISOR_PORT:String(supervisorPort),IATB_AUTH_MODE:'authenticated',IATB_DEPLOYMENT_MODE:'AUTHENTICATED',IATB_AUTH_ORIGIN:origin,IATB_AUTH_TLS_CERT:crt,IATB_AUTH_TLS_KEY:key};
 let output='';for(const entry of ['Core/Server/server.js','UI/Gateway/ui_service.js','Core/Router/router.js','Indicators/Engine/indicator_service.js','Strategy/Engine/strategy_service.js','Portfolio/Engine/portfolio_service.js','Supervisor/supervisor_service.js']){const p=spawn(process.execPath,[path.resolve(__dirname,'../..',entry)],{env,stdio:['ignore','pipe','pipe']});p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);t.after(()=>{p.kill('SIGTERM');});}
 async function call(route,method='GET',body=null,headers={}){return new Promise((resolve,reject)=>{const raw=body===null?'':JSON.stringify(body),q=https.request({host:'127.0.0.1',port:uiPort,servername:'localhost',ca:fs.readFileSync(crt),path:route,method,headers:{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),...headers}},r=>{let data='';r.on('data',b=>data+=b);r.on('end',()=>{let json;try{json=JSON.parse(data);}catch(_){}resolve({status:r.statusCode,data:json,text:data,cookie:r.headers['set-cookie']?.[0]});});});q.on('error',reject);q.end(raw);});}
 let ready=false;for(let i=0;i<100;i++){try{if((await call('/api/health')).status===200){ready=true;break;}}catch(_){}await new Promise(r=>setTimeout(r,50));}assert(ready,'Core/Gateway startup failed: '+output);
 assert.equal((await call('/ui-health')).data.authentication,'Auth21');
 assert.equal((await call('/settings')).status,303);assert.equal((await call('/login')).status,200);
 const a=await call('/auth21/login','POST',{email:'alice@example.invalid',password:PASSWORD});assert.equal(a.status,200,JSON.stringify(a.data));const ha={Cookie:a.cookie.split(';')[0],'X-IATB-CSRF':a.data.csrfToken};
 assert.equal((await call('/api/settings/language','POST',{language:'en'},ha)).status,200);
 assert.equal((await call('/api/settings','GET',null,ha)).data.language,'en');
 const b=await call('/auth21/login','POST',{email:'bobby@example.invalid',password:PASSWORD}),hb={Cookie:b.cookie.split(';')[0],'X-IATB-CSRF':b.data.csrfToken};assert.equal((await call('/api/settings','GET',null,hb)).data.language,'fr');
 const guestViewer=await call('/auth21/login','POST',{email:'guest@example.invalid',password:PASSWORD}),hGuestViewer={Cookie:guestViewer.cookie.split(';')[0],'X-IATB-CSRF':guestViewer.data.csrfToken};for(const route of ['/bank','/keys','/portfolio','/api/security/wallets'])assert.equal((await call(route,'GET',null,hGuestViewer)).status,403);assert.equal((await call('/settings','GET',null,hGuestViewer)).status,403,'GUEST cannot open private Settings UI');assert.equal((await call('/api/settings','GET',null,hGuestViewer)).status,200,'sanitized GUEST settings API remains available');
 const walletA=await call('/api/security/wallets/create','POST',{name:'Fictional Alice',notRobot:true,password:PASSWORD},ha);assert.equal(walletA.status,200,JSON.stringify(walletA.data));assert.equal((await call('/api/security/wallets','GET',null,hb)).data.items.length,0);assert.equal((await call('/api/security/wallets/reveal','POST',{id:walletA.data.item.id,accountId:'evm',password:PASSWORD,confirmed:true},hb)).status,404);
 const walletB=await call('/api/security/wallets/create','POST',{name:'Fictional Bob',notRobot:true,password:PASSWORD},hb);assert.equal(walletB.status,200,JSON.stringify(walletB.data));assert.equal(walletB.data.item.id,walletA.data.item.id);assert.notEqual(walletB.data.item.accounts[0].address,walletA.data.item.accounts[0].address);
 const revealA=await call('/api/security/wallets/reveal','POST',{id:walletA.data.item.id,accountId:'evm',password:PASSWORD,confirmed:true},ha);assert.equal(revealA.status,200);assert(revealA.data.privateKey);assert.equal((await call('/api/onchain/identity?walletId='+walletA.data.item.id,'GET',null,ha)).data.accounts[0].address,walletA.data.item.accounts[0].address);
 const personalApis={password:PASSWORD,openaiApiKey:'',xBearerToken:'',zeroxApiKey:'',iatbFeeRecipient:'',swapBridgeRpc:{ethereum:'https://ethereum-rpc.publicnode.com',arbitrum:'',polygon:'',bnb:'',base:''}};
 assert.equal((await call('/api/settings/apis','POST',personalApis,ha)).status,403,'USER cannot edit infrastructure RPC or ZeroX fields');
 assert.equal((await call('/api/settings/apis','POST',{password:PASSWORD,openaiApiKey:'',xBearerToken:''},ha)).status,200,'USER can still edit own AI credentials');
 assert.equal((await call('/api/settings','GET',null,ha)).data.swapBridge?.rpc?.ethereum??'','','denied RPC update did not persist');
 assert.equal((await call('/api/settings','GET',null,hb)).data.swapBridge?.rpc?.ethereum??'','');
 assert.equal((await call('/api/settings/apis','POST',{...personalApis,openaiApiKey:'MUST_NOT_SAVE',swapBridgeRpc:{ethereum:'https://127.0.0.1/admin'}},ha)).status,403,'USER is denied before infrastructure URL validation');
 assert.equal((await call('/api/settings','GET',null,ha)).data.openaiConfigured,false);
 assert.equal((await call('/api/settings/test-x','POST',{},ha)).status,409);
 async function cp(action,args,headers=ha){return call('/communication/v1/ui/'+(action.includes('create')||action.endsWith('delete')?'write':'read'),'POST',{target:'indicator',action,arguments:args},headers);}
 let registry;for(let i=0;i<80;i++){registry=await cp('indicator.registry.status',{});if(registry.status===200)break;await new Promise(r=>setTimeout(r,50));}assert.equal(registry.status,200,JSON.stringify(registry.data)+' '+output);assert(registry.data.data.items.length>=21);
 const source='indicator private_test "Private Alice"\ninput price = close\nparam period = 14 min=2 max=200\nuse base = ema(source=close,period=$param.period).value\noutput value = base';
 const created=await cp('indicator.language.create',{source});assert.equal(created.status,200,JSON.stringify(created.data));assert((await cp('indicator.registry.status',{})).data.data.items.some(x=>x.id==='private_test'));assert(!(await cp('indicator.registry.status',{},hb)).data.data.items.some(x=>x.id==='private_test'));
 const rows=Array.from({length:80},(_,i)=>[1700000000000+i*60000,100+i,102+i,99+i,101+i,1000]);const computed=await cp('indicator.compute_batch_data',{symbol:'BTCUSD',timeframe:'1m',candles:rows,requests:[{id:'private_test'},{id:'rsi'}]});assert.equal(computed.status,200,JSON.stringify(computed.data)+output);assert(computed.data.data.results.every(x=>x.ok),JSON.stringify(computed.data));const bob=await cp('indicator.compute_batch_data',{symbol:'BTCUSD',timeframe:'1m',candles:rows,requests:[{id:'private_test'}]},hb);assert.equal(bob.status,200);assert.equal(bob.data.data.results[0].ok,false);
 const owner=(target,action,args,headers=ha)=>call('/communication/v1/ui/read','POST',{target,action,arguments:args},headers);
 let ownPortfolio;for(let i=0;i<80;i++){ownPortfolio=await owner('portfolio','portfolio.overview',{});if(ownPortfolio.status===200)break;await new Promise(r=>setTimeout(r,50));}assert.equal(ownPortfolio.status,200,JSON.stringify(ownPortfolio.data)+output);
 assert.equal((await call('/api/settings/supervisor/brains','POST',{provider:'MOCK',fallbackEnabled:false,fallbackProvider:'OPENAI_API',openai:{model:'gpt-5.6',timeoutMs:45000},remote:{endpoint:''}},ha)).status,200);
 assert.equal((await owner('supervisor','supervisor.status',{})).data.data.llm.provider,'MOCK');
 assert.equal((await call('/api/settings/supervisor/brains','POST',{provider:'REMOTE_LLM',remote:{endpoint:'http://127.0.0.1:1234'}},ha)).status,409);
 const sup=await owner('supervisor','supervisor.status',{});assert.equal(sup.status,200,JSON.stringify(sup.data)+output);const mock=await owner('supervisor','supervisor.reason',{provider:'MOCK',prompt:'Fictional smoke only'});assert.equal(mock.status,200,JSON.stringify(mock.data));assert.equal(mock.data.data.response.provider,'MOCK');assert.equal((await owner('supervisor','supervisor.status',{},hb)).data.data.reasoningCount,0);
 const definition={schema_version:1,name:'Alice RSI',version:'1.0',symbol:'BTCUSD',timeframe:'5m',entry:{side:'BUY',conditions:[{indicator:'RSI',operator:'<',value:30}]},risk:{leverage:2,max_position_usdt:10,stop_loss_percent:1,take_profit_percent:2}};
 const saved=await owner('strategy','strategy.definition.save',{strategy:definition});assert.equal(saved.status,200,JSON.stringify(saved.data)+output);assert.equal((await owner('strategy','strategy.catalog',{},hb)).data.data.catalog.count,0);assert.equal((await owner('strategy','strategy.definition.delete',{strategy_id:saved.data.data.strategy.strategy_id},hb)).status,403);
 assert.equal((await call('/api/mosaics/create','POST',{definition:{id:'alice-only',title:'Alice dashboard',items:[{source:'literal.text',value:'ALICE_ONLY'}]}},ha)).status,200);assert.equal((await call('/api/mosaics','GET',null,hb)).data.items.length,0);assert.equal((await call('/api/mosaics/delete','POST',{moduleId:'moz:alice-only'},hb)).status,400);
 const page=await call('/settings','GET',null,ha);assert.equal(page.status,200);assert(page.text.includes('id="iatb-session"'));assert(page.text.includes('alice@example.invalid'));assert(!page.text.includes('bobby@example.invalid'));
 assert.equal((await call('/api/settings/language','POST',{language:'fr',clientId:b.data.clientId},ha)).status,400);
 for(const entry of require('../CI/user_management_route_inventory').inventory().rows.filter(x=>x.path.startsWith('/api/')&&x.policy!=='public-or-login')){const unauth=await call(entry.path,entry.method,entry.method==='GET'?null:{});assert([401,403].includes(unauth.status),entry.method+' '+entry.path+' anonymous: '+unauth.status);if(['denied-in-authenticated-mode','authenticated-admin-context'].includes(entry.policy)){const denied=await call(entry.path,entry.method,entry.method==='GET'?null:{},ha);assert.equal(denied.status,403,entry.method+' '+entry.path+' must stay denied');}}
 assert.equal((await call('/api/admin/users','POST',{role:'ADMIN'},ha)).status,403);assert.equal((await call('/auth21/internal/authorize-compute','POST',{},ha)).status,403);
 if(process.env.IATB_BROWSER_QA==='1'){
  const browser=await require('playwright').firefox.launch({headless:true,firefoxUserPrefs:{'security.sandbox.content.level':0,'security.sandbox.gpu.level':0,'dom.ipc.forkserver.enable':false}});t.after(()=>browser.close());const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/login');await page.fill('#email','alice@example.invalid');await page.fill('#password',PASSWORD);await page.click('button[type=submit]');await page.waitForURL('**/settings?section=profile');await page.waitForFunction(()=>document.getElementById('profileEmail').value==='alice@example.invalid');assert(await page.locator('#profileSecurity').isVisible());await page.waitForFunction(()=>document.querySelectorAll('#userSessions li').length>0);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>window.IATBSession.role),'USER');await page.fill('#profileFirstName','Alice browser');await page.fill('#profileCurrentPassword',PASSWORD);await page.click('#saveProfile');await page.waitForFunction(()=>document.getElementById('profileMsg').textContent.includes('enregistré'));assert.equal((await call('/auth21/me','GET',null,ha)).data.client.firstName,'Alice browser');
  await page.evaluate(()=>{window.__qaClear=fetch('/api/settings/apis/clear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'OPENAI_API_KEY'})}).then(r=>r.status);});await page.locator('dialog input[type=password]').fill(PASSWORD);await page.locator('dialog button[type=submit]').click();assert.equal(await page.evaluate(()=>window.__qaClear),200);assert.equal(await page.locator('dialog').count(),0);assert.deepEqual(errors,[]);await context.close();
 }
 const adminLogin=await call('/auth21/login','POST',{email:'admin@example.invalid',password:PASSWORD}),adminHeaders={Cookie:adminLogin.cookie.split(';')[0],'X-IATB-CSRF':adminLogin.data.csrfToken};assert.equal((await call('/api/admin/cache/clear','POST',{target:'invalid'},adminHeaders)).status,428);assert.equal((await call('/api/admin/cache/clear','POST',{target:'invalid',password:'wrong',confirmed:true},adminHeaders)).status,401);assert.equal((await call('/api/admin/cache/clear','POST',{target:'invalid',password:PASSWORD,confirmed:true},adminHeaders)).status,400);
 assert.equal((await call('/ui-api/session','GET',null,{...hb,'X-IATB-UI-Role':'ADMIN','X-IATB-Client-Id':a.data.clientId})).data.role,'USER');
 const bridgeQuota=crypto.createHash('sha256').update('bridge:'+a.data.clientId).digest('hex');f.db.prepare('INSERT OR REPLACE INTO um_login_attempts VALUES(?,?,?)').run(bridgeQuota,300,Math.floor(Date.now()/1000)+300);assert.equal((await cp('indicator.registry.status',{})).status,429);f.db.prepare('DELETE FROM um_login_attempts WHERE key=?').run(bridgeQuota);
 f.manager.changeRole(f.login.token,a.data.clientId,'GUEST');assert.equal((await call('/auth21/me','GET',null,ha)).status,401);assert.equal((await call('/auth21/me','GET',null,hb)).status,200);
 const guest=await call('/auth21/login','POST',{email:'alice@example.invalid',password:PASSWORD}),hg={Cookie:guest.cookie.split(';')[0],'X-IATB-CSRF':guest.data.csrfToken};assert.equal(guest.data.role,'GUEST');assert.equal((await call('/api/settings','GET',null,hg)).status,200);assert.equal((await cp('indicator.compute_batch_data',{symbol:'BTCUSD',timeframe:'1m',candles:rows,requests:[{id:'rsi'}]},hg)).status,403);assert.equal((await cp('marketdata.symbols',{source:'BINANCE'},hg)).status,403);assert.equal((await call('/ui-data/market/candles?symbol=BTCUSD','GET',null,hg)).status,403);assert(!(await cp('indicator.registry.status',{},hg)).data.data.items.some(x=>x.id==='private_test'));
 assert.equal((await call('/auth21/logout','POST',{},hg)).status,200);assert.equal((await call('/api/settings','GET',null,hg)).status,401);

});
test('real unprivileged owner TTY CLI authenticates ADMIN without echo and refuses a piped password',async t=>{
 const mapping=fs.existsSync('/proc/self/uid_map')?fs.readFileSync('/proc/self/uid_map','utf8').trim().split(/\s+/).map(Number):[];if(mapping.length===3&&mapping[2]===1){t.skip('container maps only UID 0; no unprivileged OS identity is available');return;}
 if(!process.getuid){t.skip('requires POSIX UID checks');return;}
 const f=await fixture(t),{execFileSync}=require('node:child_process'),uid=process.getuid()===0?65534:process.getuid(),app=path.join(f.root,'cli-app');fs.mkdirSync(path.join(app,'Core'),{recursive:true});fs.cpSync(path.resolve(__dirname,'../../Core/Clients'),path.join(app,'Core','Clients'),{recursive:true});fs.cpSync(path.resolve(__dirname,'../../CLI'),path.join(app,'CLI'),{recursive:true});fs.cpSync(path.resolve(__dirname,'../../node_modules'),path.join(app,'node_modules'),{recursive:true});
 function own(dir){if(process.getuid()===0){if(fs.lstatSync(dir).isSymbolicLink())fs.lchownSync(dir,uid,uid);else fs.chownSync(dir,uid,uid);}if(fs.lstatSync(dir).isDirectory())for(const name of fs.readdirSync(dir))own(path.join(dir,name));}own(f.root);fs.chmodSync(f.file,0o600);
 const result=JSON.parse(execFileSync('python3',[path.join(__dirname,'auth21_cli_pty_driver.py')],{encoding:'utf8',input:JSON.stringify({uid,argv:[process.execPath,path.join(app,'CLI','users.js'),'list'],env:{...process.env,IATB_DATA_ROOT:f.root},steps:[['Email ADMIN:', 'admin@example.invalid'],['Mot de passe ADMIN:',PASSWORD]]}),timeout:20000}));assert.equal(result.code,0,result.output);assert(result.output.includes(f.admin.clientId));assert(!result.output.includes(PASSWORD));
 const piped=require('node:child_process').spawnSync(process.execPath,[path.join(app,'CLI','users.js'),'list'],{uid,gid:process.getuid()===0?uid:process.getgid(),env:{...process.env,IATB_DATA_ROOT:f.root},input:PASSWORD,encoding:'utf8'});assert.equal(piped.status,1);assert(piped.stderr.includes('LOCAL_OWNER_TTY_REQUIRED'));
});
test('legacy RSA vault imports once to explicit owner, survives password reset, original bytes remain untouched',async t=>{
 const f=await fixture(t),a=await account(f,'alice'),b=await account(f,'bobby'),file=path.join(f.root,'legacy-vault.dat'),kp=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}}),salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=crypto.pbkdf2Sync(PASSWORD,salt,180000,32,'sha256'),c=crypto.createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([c.update(kp.privateKey),c.final()]);const vault={privateKeyEnvelope:{alg:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:180000,salt:salt.toString('base64'),iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:data.toString('base64')},secrets:{OPENAI_API_KEY:crypto.publicEncrypt({key:kp.publicKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from('FICTIONAL_LEGACY_API_KEY')).toString('base64')}};fs.writeFileSync(file,JSON.stringify(vault),{mode:0o600});const original=fs.readFileSync(file),{importVault}=require('../../Core/Clients/UserManagement/legacy_vault');const options={db:f.db,cipher:f.cipher,actor:()=>assert.equal(f.sessions.verifySession(f.login.token).role,'ADMIN'),target:a.clientId,file,password:PASSWORD};await assert.rejects(importVault({...options,password:'incorrect'}));assert.equal(f.db.prepare('SELECT COUNT(*) n FROM um_migration_claims').get().n,0);await importVault(options);assert.equal(f.sessions.secrets(a.token).OPENAI_API_KEY,'FICTIONAL_LEGACY_API_KEY');assert.deepEqual(f.sessions.secrets(b.token),{});await assert.rejects(importVault({...options,target:b.clientId}),/ALREADY_CLAIMED/);await f.manager.resetPassword(f.login.token,a.clientId,PASSWORD+'reset');assert.equal(f.sessions.verifySession(a.token),null);const login=await f.sessions.loginEmail('alice@example.invalid',PASSWORD+'reset');assert.equal(f.sessions.secrets(login.token).OPENAI_API_KEY,'FICTIONAL_LEGACY_API_KEY');assert.deepEqual(fs.readFileSync(file),original);
});
test('literal legacy route inventory remains explicit; shared private routes default deny',()=>{const result=require('../CI/user_management_route_inventory').inventory();assert(result.literalRoutes>=90);assert(result.rows.some(x=>x.path.startsWith('/api/admin')&&x.policy==='denied-in-authenticated-mode'));assert(result.rows.some(x=>x.path==='/api/security/wallets'&&x.policy==='authenticated-owner-context'));assert.equal(result.unknownPaths,'DENY');});
test('historical SUPERADMIN and PBKDF2 identity survive migration with original key and clientId',async t=>{
 const f=await fixture(t),old=new Database(f.file+'.backup');t.after(()=>old.close());old.pragma('foreign_keys=ON');const id='CL000001',salt=crypto.randomBytes(16).toString('hex'),hash=crypto.pbkdf2Sync(PASSWORD,salt,180000,32,'sha256').toString('hex'),now=new Date().toISOString();old.prepare('INSERT INTO clients VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,'legacy-owner',f.cipher.seal('Historical'),f.cipher.seal('Owner'),f.cipher.seal('legacy@example.invalid'),f.cipher.lookupHash('legacy@example.invalid'),'ACTIVE',1,now,now);old.prepare('INSERT INTO client_accounts VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,f.cipher.seal('LEGACY'),f.cipher.lookupHash('username:LEGACY'),salt,hash,180000,'SUPERADMIN',1,now,now);const before=old.prepare('SELECT first_name_enc,email_enc FROM clients WHERE client_id=?').get(id);await migrate(old,{backupFile:f.file+'.legacy-before',keyFile:f.key,confirm:'MIGRATE USER MANAGEMENT V1'});assert.deepEqual(old.prepare('SELECT first_name_enc,email_enc FROM clients WHERE client_id=?').get(id),before);assert.equal(old.prepare('SELECT password_hash FROM client_accounts WHERE client_id=?').get(id).password_hash,hash);const sessions=new UserStore({db:old,clientCrypto:f.cipher}),login=await sessions.loginEmail('legacy@example.invalid',PASSWORD);assert.equal(login.clientId,id);assert.equal(login.role,'ADMIN');assert.equal(sessions.profile(login.token).firstName,'Historical');
});
test('owner AI transport selects only the live session owner key and rejects substitution before provider call',async t=>{
 const f=await fixture(t),a=await account(f,'alice'),b=await account(f,'bobby'),{transport}=require('../../Core/Clients/UserManagement/owner_ai'),OpenAI=require('../../Supervisor/LLM/providers/openai_provider'),calls=[];
 f.sessions.setSecrets(a.token,{OPENAI_API_KEY:'FICTIONAL_ALICE_KEY'});f.sessions.setSecrets(b.token,{OPENAI_API_KEY:'FICTIONAL_BOB_KEY'});
 const spec={model:'gpt-5.6',prompt:'Fixture only',schema:{type:'object',properties:{message:{type:'string'}},required:['message'],additionalProperties:false}},response={output_text:'{"message":"FICTIONAL_RESPONSE"}',usage:{input_tokens:1,output_tokens:2,total_tokens:3}};let payload;
 await new OpenAI({transport:async body=>{payload=body;return response;}}).structured(spec);
 const send=transport({sessions:f.sessions,request:async req=>{calls.push(req);return response;}}),gateway=x=>({clientId:x.clientId,sessionHash:crypto.createHash('sha256').update(Buffer.from(x.token,'base64url')).digest('hex'),operation:'supervisor.structured',spec,configuration:{model:'gpt-5.6'}});
 await send(gateway(a),payload);await send(gateway(b),payload);assert.equal(calls[0].headers.Authorization,'Bearer FICTIONAL_ALICE_KEY');assert.equal(calls[1].headers.Authorization,'Bearer FICTIONAL_BOB_KEY');assert.equal(calls[0].url,'https://api.openai.com/v1/responses');assert.equal(calls[0].body.store,false);
 await assert.rejects(send({...gateway(a),clientId:b.clientId},payload),/REVOKED/);await assert.rejects(send(gateway(a),{...payload,input:'substituted'}),/MISMATCH/);assert.equal(calls.length,2);f.manager.setEnabled(f.login.token,a.clientId,false);await assert.rejects(send(gateway(a),payload),/REVOKED/);assert.equal(calls.length,2);
});
test('browser action acknowledgements are owner-scoped, single use and never execute Engine actions',async t=>{const f=await fixture(t),a=await account(f,'alice'),b=await account(f,'bobby'),action=f.sessions.planBrowserAction(a.token,'chart.…14455 tokens truncated… doit jamais écraser la seule variante encore lisible par une ancienne RELEASE.
- [ ] Prévoir éventuellement des adaptateurs de migration/conversion versionnés et testés, mais **aucune conversion implicite ni réinterprétation silencieuse**.
- [ ] Tester le scénario critique : DEBUG produit un schéma plus récent que celui accepté par RELEASE ; RELEASE refuse la nouvelle version et continue à lire ses données compatibles sans perturbation. Tester également coexistence, cache expiré, déduplication et rollback.
- [ ] Valider tests, documentation, sauvegarde/restauration et séparation des permissions avant tout premier déploiement RELEASE.

**Statut :** décision validée, développement non commencé. **Ordre imposé :** tunnel SSH + UI DEBUG → validation fonctionnelle DEBUG → implémentation/validation Shared Data + compatibilité → seulement ensuite première intégration d'un build RELEASE.

---

---

## ✅ Dernière version stabilisée

### v1.7.8 — STABLE

Principales évolutions clôturées :

- [x] Architecture Market Data multi-provider.
- [x] Nouveau type de provider `SOCKET`.
- [x] Hyperliquid comme premier provider `SOCKET`.
- [x] OHLCV historique Hyperliquid.
- [x] Flux WebSocket temps réel Hyperliquid.
- [x] Trades et carnet `l2Book` Hyperliquid.
- [x] Provenance des données et volumes conservée.
- [x] Cache Market Data borné et séparé par provider / symbole / timeframe.
- [x] Diagnostics et gestion des providers Market Data.
- [x] Dépendance WebSocket `ws` intégrée au runtime.
- [x] Documentation/Wiki mise à jour.
- [x] Build complet v1.7.8 généré et archivé.

---

# ✅ v1.7.9 — PATCH / BUILD / ARCHIVE FINALISÉS

**État de packaging : FINALISÉ.**  
**État fonctionnel machine cible : validation finale encore requise avant de remplacer v1.7.8 comme dernière version STABLE.**

Le patch v1.7.9, son test d'installation, le build complet et l'archive complète sont présents dans le dépôt. La v1.7.9 constitue également la source officielle utilisée par l'UpdateManager pour produire et valider la v1.8.

## Flux de données prévus

- [ ] **CoinGecko — API** — intégration technique terminée, validation machine cible restante
  - [x] Socle du provider `COINGECKO` programmé.
  - [x] Enregistrement dans le registre multi-provider programmé.
  - [x] Provenance CoinGecko explicite et séparation des données CEX/DEX natives.
  - [x] Aucun volume d'exchange artificiel : volume indisponible déclaré explicitement.
  - [x] État interne : dernière réussite, dernière erreur et état d'authentification.
  - [x] Configuration complète depuis `Settings > API` avec stockage de la clé dans le coffre RSA existant.
  - [x] Transmission de la clé à Market Data uniquement en mémoire via canal interne authentifié.
  - [x] Tests automatiques du provider, de la provenance, du volume et du pont de sécurité ajoutés.
  - [ ] Tests d'intégration et validation sur la machine cible.
  - [ ] Validation fonctionnelle finale CoinGecko avant passage de la fonction principale à `[x]`.

- [ ] **Blockchain.com — API** — intégration technique terminée, spécialisation finale et validation machine cible restantes
  - [x] Provider `BLOCKCHAIN` ajouté au registre multi-provider.
  - [x] Flux public anonyme Blockchain.com Exchange utilisé via le canal WebSocket `prices` dans l'implémentation actuelle.
  - [x] Bougies OHLCV et volumes natifs conservés sans fabrication de données.
  - [x] Normalisation symbole / timeframe et provenance `BLOCKCHAIN.COM` explicite.
  - [x] Timeframes non supportés refusés explicitement au lieu d'être approximés.
  - [x] État, fraîcheur, connexion, dernière erreur et nombre de séries en cache exposés.
  - [x] Tests automatiques de normalisation, granularités et format OHLCV ajoutés.
  - [ ] Recentrer Blockchain.com sur le rôle Bitcoin / on-chain retenu afin d'éviter un doublon inutile de source Exchange.
  - [ ] Tests d'intégration et validation sur la machine cible.
  - [ ] Validation fonctionnelle finale Blockchain.com avant passage de la fonction principale à `[x]`.

- [ ] **DefiLlama — API** — intégration technique terminée, validation machine cible restante
  - [x] Provider complémentaire `DEFILLAMA` ajouté au registre multi-provider.
  - [x] DefiLlama déclaré `candleCapable:false` afin de ne jamais remplacer silencieusement les OHLCV natifs CEX/DEX.
  - [x] TVL protocoles et chaînes intégrés.
  - [x] Prix tokens actuels, historiques, chart et variations intégrés.
  - [x] Données stablecoins intégrées.
  - [x] Pools de rendement et historiques APY/TVL intégrés.
  - [x] Volumes DEX et options, open interest, fees et revenue intégrés.
  - [x] Provenance `DEFILLAMA_PUBLIC_API`, fraîcheur, dernière commande et dernière erreur exposées.
  - [x] Tests automatiques du provider et de son catalogue de commandes ajoutés.
  - [ ] Tests d'intégration et validation sur la machine cible.
  - [ ] Validation fonctionnelle finale DefiLlama avant passage de la fonction principale à `[x]`.

## Market Data Collector / prix consensus

- [x] Kraken est une source explicite du Market Data Collector pour OHLCV et prix live.
- [x] GMX est intégré comme source explicite du Market Data Collector pour OHLC et prix Oracle ; aucun volume GMX n'est fabriqué.
- [x] Endpoint `GET /price/consensus` ajouté ; sources par défaut : Kraken + GMX.
- [x] Prix consensus calculé par moyenne des sources valides avec filtre d'outliers autour de la médiane à partir de 3 sources.
- [x] La réponse conserve les prix individuels, la provenance, le nombre de sources et le spread entre sources.
- [x] Test automatisé du calcul de consensus ajouté.
- [ ] Affichage UI détaillé du prix consensus et des prix sources à intégrer/valider.
- [ ] Validation réseau et machine cible Kraken + GMX.

## Market Data Collector / ƒx OHLCV synthétique

- [x] Source virtuelle `FX` / `ƒx Consensus` intégrée directement au Market Data Collector, sans nouveau service ni nouvelle couche réseau.
- [x] Endpoint `GET /candles/consensus` ajouté pour produire les bougies synthétiques à la demande.
- [x] `Open`, `High`, `Low` et `Close` sont calculés par moyenne arithmétique des bougies sources valides et alignées.
- [x] `Volume` est calculé par somme des volumes natifs comparables disponibles ; aucune donnée manquante n'est fabriquée.
- [x] Correspondance stricte de la paire canonique : une donnée `BTC/USD` ne peut pas participer à un consensus `BTC/EUR`.
- [x] Alignement des timestamps par bucket de timeframe avant agrégation.
- [x] Provenance conservée : sources prix, sources volume, volume par source, sources exclues et motifs d'exclusion.
- [x] Proxy Core `GET /api/market/fx-klines` ajouté pour que le navigateur reste sur le canal local existant.
- [x] Le sélecteur Exchange du graphique Trading IA propose `ƒx` en plus des sources natives.
- [x] En mode `ƒx`, le graphique affiche les OHLC synthétiques et le volume total en unité de l'actif de base lorsqu'il est disponible.
- [x] Rafraîchissement `ƒx` léger à 15 secondes ; aucun historique consensus supplémentaire n'est conservé en mémoire.
- [x] Test dédié `test_fx_consensus_v1.7.9.js` ajouté ; le calcul pur moyenne OHLC + somme des volumes a été vérifié localement.
- [ ] Validation end-to-end avec les flux réels sur la machine cible.
- [ ] Vérifier le comportement `ƒx` à mesure que Binance, Coinbase, OKX et d'autres connecteurs sont migrés dans le registre courant du Collector.

## Catalogue des commandes Market Data

- [x] Catalogue central créé pour GMX, Kraken/Reference, Hyperliquid, CoinGecko, Blockchain.com et DefiLlama, avec visibilité des connecteurs historiques Binance/Coinbase/OKX.
- [x] Chaque commande indique si elle est `IMPLEMENTED`, `LEGACY_IMPLEMENTED` ou seulement `UPSTREAM_AVAILABLE`.
- [x] `GET /capabilities` expose la liste complète au runtime.
- [x] `GET /capabilities?provider=...` expose la liste d'un provider précis.
- [x] `POST /command` permet l'exécution des commandes analytiques génériques actuellement branchées, notamment DefiLlama.
- [x] Les commandes privées de compte/trading/retrait restent séparées du catalogue Market Data.
- [x] Documentation du catalogue et de la source virtuelle `ƒx` ajoutée dans `updates/v1.7.9/MarketData/API_COMMANDS.md`.

> Ces sources API complètent les données de l'application. Elles ne doivent pas remplacer silencieusement les chandeliers ou volumes natifs des CEX/DEX.

## Authentification / inscription

- [ ] **Écran d'authentification unifié** — intégré, validation complète machine cible restante
  - [x] Le formulaire affiché par défaut reste toujours le formulaire de connexion, y compris lorsque la base utilisateur ne contient encore aucun compte.
  - [x] Ajout d'un libellé/lien cliquable `S'inscrire` depuis le formulaire de connexion.
  - [x] Bascule dans le même panneau entre les modes `Connexion` et `Inscription`, sans page d'authentification séparée.
  - [x] Ajout du lien inverse `Déjà un compte ? Se connecter` en mode inscription.
  - [x] Le backend conserve la règle actuelle : une installation locale ne crée pas un second compte si un compte local existe déjà.
  - [ ] Vérifier visuellement le formulaire sur macOS High Sierra / Firefox cible.
  - [ ] Tester connexion, première inscription, refus d'une seconde inscription et récupération de mot de passe.
  - [ ] Validation fonctionnelle finale avant passage de la fonction principale à `[x]`.

## Validation v1.7.9

- [x] Packaging du patch v1.7.9 finalisé dans `updates/v1.7.9/` avec ZIP et SHA-256.
- [x] Test d'installation du patch documenté dans `updates/v1.7.9/INSTALL_TEST_RESULT.md`.
- [x] Build complet publié dans `Builds/v1.7.9/`.
- [x] Archive complète publiée dans `Archives/IA-Trading-Bot_V1.7.9.zip` avec SHA-256.
- [x] `CHANGELOG.md` et `VERSION` disponibles dans le code livré.
- [x] La v1.7.9 a servi de source officielle vérifiée pour le passage UpdateManager vers v1.8.0.
- [ ] Validation end-to-end de toutes les fonctions prévues sur la machine cible.
- [ ] Vérification consommation mémoire / stabilité sur la machine cible.
- [ ] Vérification finale puis déclaration **v1.7.9 STABLE** au sens fonctionnel complet.

---

# ✅ v1.8.2 — FINALISÉE

Le packaging v1.8 est maintenant reproductible : la version est produite depuis l'archive officielle v1.7.9 au moyen d'un patch UpdateManager `1.7.9 -> 1.8.0`. Le patch a été accepté et installé par le vrai UpdateManager de la v1.7.9 sous Node.js 16.20.2, puis le résultat a été comparé au build `Builds/v1.8`.

**État packaging : PASS.**  
**État v1.8.2 : FINALISÉ. Les développements suivants commencent après cette version.**

## v1.8.1 — Liquidity Engine

- [x] **Upgrade Liquidity Engine intégré au build v1.8.1.**
  - [x] Conservation du calcul de zones OHLCV `ESTIMATED` comme fallback léger.
  - [x] Ajout du calcul Open Interest avec valeur native, mark price et notionnel lorsque disponible.
  - [x] Ajout du carnet d'ordres avec best bid/ask, spread, VWAP et profondeurs bid/ask.
  - [x] Ajout du calcul `Bid/Ask imbalance`, ratio bid/ask et côté dominant.
  - [x] Ajout des statistiques de liquidations à partir d'événements explicites disponibles ; aucune liquidation n'est fabriquée depuis OHLCV/trades.
  - [x] Ajout du provider temps réel léger Hyperliquid / Binance Futures / Kraken avec mode `AUTO`.
  - [x] Ajout des endpoints `/realtime`, `/snapshot`, `/liquidations` et `/liquidations/event`.
  - [x] Cache temps réel borné et buffer de liquidations borné.
  - [x] Tests unitaires Liquidity et contrôles de syntaxe JavaScript réussis dans l'environnement de build.
  - [x] Validation réseau temps réel avec les providers réels sur la machine cible.
  - [x] Validation consommation mémoire / stabilité Liquidity sur macOS High Sierra.

## v1.8.2 — Admin UI / UpdateManager

- [x] **Nouvelle interface Admin programmée.**
  - [x] Barre latérale gauche avec labels cliquables et icônes/miniatures.
  - [x] Navigation par ancres vers Console, Firewall, Processus, Engines & Services, Maintenance, Logs, Diagnostics et Mises à jour.
  - [x] Défilement fluide et mise en évidence de la section active.
  - [x] Palette et contours harmonisés avec les autres pages de l'application.
  - [x] Réutilisation du logo IA-TB déjà présent dans l'application.
  - [x] Fonctions Admin existantes conservées derrière la nouvelle présentation.
  - [x] Validation visuelle et fonctionnelle sur macOS High Sierra / Firefox cible.

- [x] **UpdateManager v1.8.2 — finalisé.**
  - [x] Cause du rejet identifiée : version installée détectée `1.8.0` alors que le premier patch ciblait `1.8.1`.
  - [x] Patch cumulatif corrigé pour `1.8.0 -> 1.8.2`.
  - [x] Le patch cumulatif inclut les changements Liquidity v1.8.1 et Admin v1.8.2 nécessaires au résultat final.
  - [x] Installation réussie sur une copie du build v1.8.0 dans l'environnement de test.
  - [x] Après installation de test, `current_release.dat` et la version active passent à `1.8.2`.
  - [x] Contrôle SHA-256 et syntaxe JavaScript réussis sur le build installé de test.
  - [x] Le nom externe du fichier ZIP n'est pas utilisé comme source de vérité ; la compatibilité est déterminée par le manifeste interne.
  - [x] Installer le patch corrigé via l'Update Manager sur la machine cible.
  - [x] Confirmer que l'application affiche `1.8.2` après redémarrage.
  - [x] Publier/valider définitivement l'archive corrigée dans `updates/` sur GitHub.

---


## Market Data / Shadow Decision Engine

- [x] Ajouter un Shadow Decision Engine v1 relié à Policy, Passport, Broker et Budget.
- [x] Produire des décisions observationnelles : `ALLOW`, `DEDUP_CANDIDATE`, `DELAY`, `ALLOW_WITH_ADVISORY`, `FALLBACK_CANDIDATE`.
- [x] Garantir `executable:false`, `blocking:false` et `decisionEnforcement:false` en v1.
- [x] Conserver les quotas UNKNOWN en recommandation non bloquante.
- [x] Ajouter un contrat CI observation-only.
- [x] Valider le comportement Shadow sur un workload représentatif de 60 min : run `37712721434`, 12 cycles, 120/120 actions CP/1 réussies, 0 hard failure ; les limitations d'observabilité transport/microstructure sont acceptées pour V1 et reportées en V2.
- [x] Ajouter les alternates ordonnés par dataset sans scoring automatique, avec rang 1 = source préférée, saut des providers indisponibles et état terminal `NO_PROVIDER_AVAILABLE`.
- [x] Refuser tout fallback ambigu sur le dataset historique générique `ORDERBOOK`.
- [x] Distinguer explicitement `SPOT_ORDERBOOK` et `PERP_ORDERBOOK` dans les anciens chemins qui utilisaient `ORDERBOOK`, y compris Policy et profils de requêtes, avec contrat CI empêchant le retour d'un dataset générique.

## Market Data / Currency Registry

- [x] Fusionner la devise FIAT de référence et le mapping Stable Asset dans un **Currency Registry v1** unique.
- [x] Référencer les devises : `USD`, `EUR`, `GBP`, `JPY`, `CNY`, `CHF`, `CAD`.
- [x] Permettre une résolution unique : FIAT direct ou Stable Asset -> FIAT de référence.
- [x] Conserver les mappings initiaux : `USDT -> USD`, `USDC -> USD`, `DAI -> USD`, `EURC -> EUR`, `TGBP -> GBP`, `ZCHF -> CHF`, `QCAD -> CAD`, `JPYC -> JPY`.
- [x] Conserver la zone monétaire et les métadonnées FIAT sans stocker de taux de change temps réel dans le Registry.
- [x] Préserver un reçu de normalisation avec actif source, FIAT de référence, quantité source, prix USD observé et valeur USD normalisée.
- [x] Ajouter un contrat CI dédié au Currency Registry.
- [x] Brancher le Currency Registry à la normalisation Open Interest afin de conserver le détail d'origine de chaque contribution avant agrégation USD.
- [x] Ne jamais supposer `1 Stable Asset = 1 FIAT` : si le taux observé manque, exclure la contribution OI du total et marquer la couverture partielle.
- [ ] Ajouter d'autres Stable Assets uniquement lorsqu'ils sont réellement supportés/identifiés ; ne jamais inventer un mapping par défaut.

## Market Data / Data Trust Boundary

- [x] Auditer le chemin réel Provider -> Firewall -> Cache/Store.
- [x] Interdire le cache des réponses Provider brutes dans le proxy Orchestrator.
- [x] Conserver l'in-flight dedup avant Provider sans persistance de donnée brute.
- [x] Imposer `Data Firewall -> cache/stockage` comme frontière de confiance.
- [x] Ajouter un contrat CI : une donnée rejetée par le Firewall ne doit jamais entrer en cache ni être écrite en stockage.
- [ ] Toute future implémentation Cache First partagée devra consommer uniquement de la donnée déjà validée par le Firewall.

## Market Data / Provider Passport

- [x] Créer un **Provider Passport v1** commun à tous les providers Market Data actuels.
- [x] Classer chaque provider en `READY` / `PARTIAL` / `UNKNOWN` selon la qualité réelle de son profil.
- [x] Conserver explicitement les limites inconnues en `UNKNOWN` au lieu d'inventer un quota.
- [x] Ajouter un contrat CI vérifiant qu'aucun provider suivi par l'Orchestrator ne manque de Passport.
- [x] Compléter les Passports documentés exploitables : Binance, Hyperliquid, DexScreener et Bybit ; conserver les limites dynamiques Bybit depuis les headers officiels.
- [x] Garantir que les quotas `UNKNOWN` restent `OBSERVE_ONLY_NON_BLOCKING` et ne puissent pas bloquer les processus IA-TB.
- [ ] Revenir plus tard sur les Passports encore partiels : CoinGecko anonyme, DeFiLlama, GMX, Kraken et OKX Open Interest.
- [ ] Ne considérer un futur provider comme **intégré** qu'après : connexion API, Passport, Policy/TTL, priorité/criticalité, quota/provenance, erreurs spécifiques, télémétrie, tests et mise à jour de la ROADMAP.

> Règle de développement : **« Ajouter l'API » n'est pas égal à « Provider intégré ».** Le Passport fait partie de la Definition of Done du provider.


## Market Data / API Request Orchestrator V2 — backlog

La V1 Shadow est considérée comme validée pour le build `v2.0_DEBUG`. Les améliorations ci-dessous ne bloquent pas son intégration et seront traitées dans une V2 dédiée.

- [ ] Unifier la télémétrie de décision `START -> TRANSPORT -> END` pour les appels Provider classiques et microstructure.
- [ ] Exposer les décisions runtime `FALLBACK_CANDIDATE`, `AGGREGATE_PARTIAL` et `NO_PROVIDER_AVAILABLE` sur tous les transports.
- [ ] Étudier un mode Native progressif uniquement pour les Providers/Datasets dont le Passport est suffisamment fiable.
- [ ] Ajouter un Cache First partagé uniquement **après Data Firewall**, sans jamais réintroduire de cache Provider brut.
- [ ] Ajouter un Provider Health runtime : `HEALTHY`, `DEGRADED`, `RATE_LIMITED`, `REGION_BLOCKED`, `DOWN`.
- [ ] Rendre le routing sensible à la disponibilité réelle par région/datacenter.
- [ ] Enrichir les quotas dynamiques via headers, `Retry-After`, poids d'endpoints et historique observé.
- [ ] Étendre Policy/Budget/Telemetry aux streams : connexions, abonnements, heartbeat, erreurs et reconnexions.
- [ ] Améliorer le Long-Run Analyzer : fenêtre de mesure figée, schéma `minutes/cycles`, notes régionales et état booléen non sensible des clés API configurées.
- [ ] Exploiter les opportunités de réduction de trafic révélées par V1, en priorité sur les payloads DeFiLlama.

# 🔜 Après v1.8.2 — travaux futurs

Les éléments ci-dessous ne font pas partie de la v1.8.2 finalisée. Ils constituent la suite de la feuille de route.

## R&D — Low-Latency Execution Engine / Smart Execution Router (HyperTrading)

Statut : **idée d'architecture à étudier, non implémentée**. À examiner après migration VPS DEBUG, télémétrie REST/streams fiable et stabilisation du Trading Engine. Objectif : trading événementiel à faible latence sur VPS et API publiques, **sans prétention de HFT professionnel** ni promesse de 2 ms.

### Architecture proposée

- [ ] Étudier un nouveau composant **Low-Latency Execution Engine / Smart Execution Router**, distinct de l'API Request Orchestrator (collecte). Ne jamais contourner le Router CP/1, les protections d'ordres ou le Trading Firewall.
- [ ] Prévoir **HyperTrading** comme stratégie expérimentale du Strategy Engine, distincte du composant de routage. Activation explicite, simulation et environnement DEBUG avant tout ordre réel.
- [ ] Préparer les routes et connexions persistantes en amont lorsque supportées (WebSocket/FIX/REST keep-alive) ; carnets normalisés en mémoire, calculs préétablis et **aucun appel LLM bloquant** sur le chemin critique signal → ordre.
- [ ] Instrumenter séparément : établissement TCP/TLS ; latence REST par endpoint ; latence, fraîcheur et jitter des streams ; acceptation/rejet des ordres ; premier fill, dernier fill ; frais, slippage, disponibilité. Une connexion TCP rapide n'est ni une mesure pure du RTT ni une preuve de vitesse d'exécution.
- [ ] Historiser télémétrie par fournisseur, région, endpoint, protocole, paire et environnement avec médiane, P95/P99, taux d'erreur, jitter, état de santé, DNS et chemins IPv4/IPv6.

### Équation de routage — hypothèse de recherche

Minimiser sur les routes **éligibles** :

    Score(route, stratégie) = α × L_norm + β × C_norm + γ × S_norm + δ × R_norm

- **L_norm** : latence d'exécution attendue normalisée (pas simplement le TCP).
- **C_norm** : coûts d'exécution attendus normalisés (frais, gas/funding pertinents).
- **S_norm** : slippage / impact de marché estimé d'après liquidité, carnet et taille.
- **R_norm** : risque d'échec, rejet, indisponibilité ou données obsolètes.
- **α, β, γ, δ ≥ 0** : poids configurables par stratégie ; définir les unités, bornes et normalisations avant toute comparaison, puis calibrer les coefficients en simulation.

- [ ] Définir des **contraintes éliminatoires avant scoring** : paire disponible, soldes sur le bon exchange, permissions API, liquidité, fraîcheur, tailles minimales, politiques de risque et séparation DEBUG/RELEASE.
- [ ] Préserver les responsabilités existantes : Strategy propose ; Risk analyse ; Supervisor prend la décision finale selon le contrat CP/1 ; Trading Engine exécute sous protections du Trading Firewall. Aucun contournement des contrôles.
- [ ] Distinguer le routage entre endpoints d'un même exchange et le choix entre exchanges (non interchangeables : carnet, fonds, règles et frais).
- [ ] Prévoir fallback déterministe, circuit breaker, protection contre les doublons, réconciliation des ordres après timeout avant toute réémission ; ne jamais relancer un ordre aveuglément.
- [ ] Tester sur GEN-1 (6 vCPU / 12 Go) en simulation/paper trading ; comparer route statique et dynamique sur latence bout-en-bout, P95/P99, taux de remplissage, slippage, coûts et PnL net.

> **Décision :** conserver l'idée dans la ROADMAP en R&D. Aucun moteur, stratégie ou trading rapide réel n'est considéré livré à ce stade.

## Trade Cost Accounting — reçu détaillé par trade (backlog post-migration VPS)

Statut : **prévu**, à étudier et implémenter après stabilisation de l'environnement `DEBUG` sur le VPS. Intégration coordonnée entre Trading Engine, Portfolio Engine, AI Usage & Cost Tracker et, pour l'estimation avant ordre, Strategy/Risk.

- [ ] Produire une fiche de coûts assimilable à une **petite facture** pour chaque trade (`TRADE001`), consultable dans Portfolio : montant notionnel, devise de référence, frais ventilés, PnL brut et PnL net.
- [ ] Conserver les identifiants de traçabilité `trade_id`, `order_id`, `execution_id`, `analysis_id`, `request_id`, `provider/exchange`, `strategy_id`, `environment`, horodatages et statut ; prendre en charge plusieurs exécutions pour un ordre et plusieurs ordres pour un trade.
- [ ] Enregistrer séparément les **frais Maker/Taker réellement facturés** par exécution, à l'entrée comme à la sortie, avec montant et actif de paiement ; éviter les doubles comptages lors des imports ou resynchronisations.
- [ ] Mesurer le **coût IA OpenAI** par requête (modèle, tokens d'entrée/sortie, tarif applicable, coût estimé/constaté si disponible) et l'associer aux analyses, décisions, exécutions et trades ; ne jamais comptabiliser plusieurs fois une analyse partagée dans le coût total réellement payé.
- [ ] Enregistrer les **frais gas/réseau**, commissions annexes et **funding** des positions perpétuelles, avec provenance et caractère réel ou estimé.
- [ ] Quantifier le **slippage** à partir d'un prix de référence horodaté et du prix d'exécution, en le distinguant des commissions et en évitant de le soustraire deux fois si le PnL brut le reflète déjà.
- [ ] Conserver les frais dans leur **devise native** (BNB, ETH, USDT, etc.), ainsi que leur équivalent EUR, taux utilisé, source du taux et horodatage ; rendre visible toute conversion indisponible.
- [ ] Calculer les ratios de frais sur une base explicitement affichée (notionnel engagé, montant exécuté ou PnL) ; distinguer coût réel payé, coût imputé aux trades et estimations pré-trade.
- [ ] Prévoir un **AI Usage & Cost Tracker** transversal avec historique des dépenses, budget mensuel interne configurable, seuils d'alerte et ventilation par moteur, stratégie, analyse et trade ; distinguer estimation locale et solde officiel du fournisseur.
- [ ] Exposer une **estimation de coût avant exécution** pour Strategy/Risk, puis une régularisation après exécution dans Portfolio ; les limites budgétaires IA ne doivent jamais bloquer les actions critiques de protection de positions.
- [ ] Tester avec des trades multi-exécutions, frais en cryptoactifs, analyses mutualisées, positions perpétuelles, données manquantes et imports répétés ; vérifier la réconciliation entre frais agrégés et événements bruts.

## Portfolio Module

- [ ] **Portfolio Module — mémoire financière et source de vérité du portefeuille**
  - [ ] Intégrer un service `portfolio` autonome relié au Router en CP/1.
  - [ ] Utiliser une base SQLite persistante hors du dépôt Git afin qu'un nouveau `git clone` ne supprime jamais l'historique utilisateur.
  - [ ] Ajouter un `Event Ledger` normalisé et dédupliqué pour conserver BUY, SELL, OPEN, INCREASE, REDUCE, CLOSE, DEPOSIT, WITHDRAWAL, TRANSFER, FEE, FUNDING, LIQUIDATION, SWAP et autres événements utiles.
  - [ ] Ajouter un `Position Builder` capable de reconstruire les positions ouvertes, prix d'entrée moyen, quantités, levier, marge, PnL, frais, funding, SL/TP et provenance.
  - [ ] Ajouter les balances consolidées Wallet / CEX / DEX avec provenance et horodatage.
  - [ ] Ajouter les snapshots historiques pour conserver l'évolution de l'equity, de la valeur du portefeuille, de l'exposition, de la marge et du PnL.
  - [ ] Ajouter les statistiques de trading : PnL réalisé/latent, frais, funding, win rate, profit factor, moyennes et historique exploitable pour les graphiques.
  - [ ] Préparer les commandes CP/1 `portfolio.snapshot`, `portfolio.positions`, `portfolio.history`, `portfolio.statistics`, `portfolio.events`, `portfolio.event.record`, `portfolio.events.import`, `portfolio.sync` et `portfolio.health`.
  - [ ] Communication Market Data exclusivement via `Portfolio -> Router -> Market Data Collector` pour récupérer les mark prices et valoriser positions/balances.
  - [ ] Communication Trading exclusivement via le Router : réception des exécutions et ajout d'une capacité de resynchronisation historique côté Trading Engine.
  - [ ] Communication Supervisor exclusivement via le Router ; aucune connexion directe Supervisor ↔ Portfolio hors CP/1.
  - [ ] Préparer l'accès du futur Risk Engine aux snapshots/positions du Portfolio via le Router.
  - [ ] Adapter la page web Portfolio afin qu'elle affiche les données calculées par Portfolio Module plutôt que de reconstruire elle-même l'état depuis Trust Wallet/GMX.
  - [ ] Ajouter un graphique d'equity basé sur les snapshots SQLite.
  - [ ] Valider la présence et le comportement de `sqlite3` sur macOS High Sierra / Node.js 16 et prévoir le comportement VPS.
  - [ ] Tester reconstruction, déduplication, reprise après arrêt, synchronisation et cohérence des calculs.

## Trading Firewall Module

- [x] **Implémentation du Firewall Module** — couche de sécurité du canal `Trading Engine -> Exchanges` conçue et intégrée.
  - [x] Paramétrage `Settings > Trading Firewall` défini.
  - [x] Modes `Protection` et `Observation` définis.
  - [x] Vérification authentification CP, signatures et âge maximal des messages prévue.
  - [x] Command Whitelist définie pour `trading.execute`, `trading.cancel`, `trading.close_position` et `trading.health`.
  - [x] Trading Pair Whitelist intégrée au modèle de configuration.
  - [x] Duplicate Protection avec fenêtre configurable définie.
  - [ ] Validation end-to-end du Firewall sur la machine cible avec les connecteurs réels.

## Risk Engine

- [x] **Implémentation du Risk Engine** — moteur analytique de représentation du risque intégré ; validation runtime CP/1 end-to-end restante
  - [x] Prototype Risk Engine intégré comme Engine autonome prévu pour l'enregistrement auprès du Router en CP/1.
  - [x] Rôle strictement analytique conservé : aucun `APPROVE`, `MODIFY`, `REJECT` et aucune exécution d'ordre dans le Risk Engine.
  - [x] Requêtes de données Market Data conçues exclusivement via le Router.
  - [x] Requêtes d'indicateurs conçues exclusivement via le Router.
  - [x] Requêtes Portfolio conçues exclusivement via le Router.
  - [x] Calculs de position, exposition, levier, marge, drawdown, volatilité, VaR historique et Expected Shortfall intégrés.
  - [x] Tests purs du Risk Engine réussis sous Node.js 16.20.2 pendant la validation UpdateManager.
  - [ ] Vérifier l'enregistrement réel du service Risk auprès du Router sur la machine cible.
  - [ ] Fournir et valider les analyses Risk au Supervisor via CP/1 en conditions runtime.
  - [ ] Ajouter/valider les scénarios de stress avancés.
  - [ ] Valider que le Supervisor reste seul responsable de la décision finale de stratégie / action dans le flux end-to-end.

## Trading Engine / historique Portfolio

- [ ] Ajouter une sortie d'événement d'exécution normalisée vers `portfolio.event.record` via Router après chaque résultat d'exécution utile.
- [ ] Ajouter une capacité READ-ONLY `trading.history` ou équivalent pour permettre au Portfolio de reconstruire/rattraper les événements après une interruption.
- [ ] Garantir l'idempotence des imports afin qu'une resynchronisation ne crée jamais de transaction en double.

## Interface Portfolio v1.8

- [ ] Remplacer progressivement la vue Portfolio actuelle centrée Wallet/GMX par la vue consolidée du Portfolio Module.
- [ ] Afficher : balances, positions ouvertes, prix d'entrée moyen, quantités, levier, marge utilisée, PnL latent/réalisé, SL/TP connus, exchange/source d'origine, mark price, frais, funding, liquidation et date d'ouverture lorsque disponibles.
- [ ] Afficher les statistiques calculées par le module et l'equity curve depuis les snapshots.
- [ ] Le navigateur accède au Portfolio Module via des routes proxy Core authentifiées ; aucun accès navigateur direct au port interne Portfolio.

## Packaging / UpdateManager v1.8

- [x] Archive source officielle v1.7.9 contrôlée par SHA-256 avant génération.
- [x] Patch `1.7.9 -> 1.8.0` généré au format officiel UpdateManager.
- [x] Manifeste couvrant exactement les 61 fichiers du payload avec SHA-256.
- [x] Entrypoint officiel `Core/Server/server_v1.8.js`.
- [x] Patch accepté par le vrai `Core/Updates/update_manager_v1.0.js` de la v1.7.9.
- [x] Installation du patch réussie sur une copie propre de la v1.7.9.
- [x] Version obtenue après installation : `1.8.0`.
- [x] Résultat installé comparé au build cible : `installedBuildMatchesTarget = true`.
- [x] ZIP final vérifié sans erreur.
- [x] Rapport `updates/Patch_v1.7.9_to_v1.8.0/VALIDATION_REPORT.json` publié avec `status = PASS`.
- [x] Patch, SHA-256, manifeste et informations de build publiés dans `main`.
- [x] Build complet v1.8 publié dans `Builds/v1.8/`.

## Validation v1.8.x

- [x] Packaging v1.8.0 validé par UpdateManager à partir de la v1.7.9 officielle.
- [x] Test pur Risk Engine réussi sous Node.js 16.20.2.
- [x] Upgrade Liquidity v1.8.1 intégré et testé dans l'environnement de build.
- [x] Nouvelle interface Admin v1.8.2 programmée.
- [x] Patch cumulatif `1.8.0 -> 1.8.2` validé sur copie du build v1.8.0.
- [x] Installation et validation du patch v1.8.2 sur la machine cible.
- [ ] Intégration Portfolio Module complète.
- [ ] Tests CP/1 Router ↔ Portfolio ↔ Market Data ↔ Trading Engine ↔ Supervisor.
- [ ] Tests CP/1 Router ↔ Risk Engine ↔ Market Data / Indicators / Portfolio / Supervisor sur la machine cible.
- [ ] Tests SQLite et persistance après redémarrage / mise à jour / nouveau clone Git.
- [ ] Tests UI Portfolio sur macOS High Sierra / Firefox cible.
- [ ] Vérification consommation mémoire / CPU sur MacBook Pro 2011.
- [ ] Documentation et Wiki finalisés pour toutes les fonctions effectivement validées.
- [ ] Vérification finale avant déclaration **v1.8.x STABLE**.

---

## 📌 Convention de reprise du développement

Au début d'une session de développement :

1. Lire `ROADMAP.md` depuis GitHub.
2. Identifier la dernière version **STABLE**.
3. Reprendre la première tâche non cochée de la version en cours.
4. Après intégration et vérification, passer la tâche de `[ ]` à `[x]`.
5. Reporter les changements réellement livrés dans `CHANGELOG.md`.
6. Ne clôturer la version qu'une fois toute la section de validation terminée.

Ainsi, GitHub reste la source de vérité permettant de reprendre le développement sans perdre l'état d'avancement du projet.

### Règle UX transversale v2.2.5 — boutons Actualiser/Synchroniser

- [ ] Uniformiser tous les boutons Actualiser et Synchroniser dans les pages IA-TB : `Actualiser` → `Actualisation…` → `À jour` ou `Erreur`.
- [ ] Employer le composant partagé `App/Frontend/JS/sync_button_state_v2_2_5.js` ou son contrat sur les gestionnaires existants, avec tests et sans casser les demandes réseau.
- [ ] Aucun compteur d'événements/news ni message volumineux dans la barre du bouton ; détails éventuels uniquement dans diagnostics/logs.
- [ ] Conserver protections de session, permissions et anti-requêtes concurrentes, sans retirer l'autorisation spéciale d'actions administratives distinctes.
