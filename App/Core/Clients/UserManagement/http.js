'use strict';
const crypto=require('node:crypto');
const {createBrowserSession}=require('../auth21_browser_cookie'),Context=require('./context');
function reply(res,status,data,headers={}){if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));}
function read(req){return new Promise((resolve,reject)=>{let size=0,parts=[];req.on('data',b=>{size+=b.length;if(size<=524288)parts.push(b);});req.once('error',reject);req.once('end',()=>{try{if(size>524288||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw Error();const b=JSON.parse(Buffer.concat(parts).toString());if(!b||typeof b!=='object'||Array.isArray(b))throw Error();resolve(b);}catch(_){reject(Error('INVALID_REQUEST'));}});});}
const LEGACY_SELF_READ=new Set(['/api/status','/api/settings','/api/settings/app-profiles','/api/security/wallets','/api/security/wallets/networks','/api/security/wallets/next-id','/api/security/wallets/export','/api/notifications','/api/notifications/settings','/api/transfers/history','/api/swap-bridge/history']);
const LEGACY_SELF_WRITE=new Set(['/api/settings/language','/api/settings/general','/api/settings/profile/select','/api/settings/profile/save','/api/settings/power','/api/settings/ai','/api/settings/portfolio','/api/notifications/settings','/api/notifications/read','/api/security/wallets/create','/api/security/wallets/import','/api/security/wallets/reveal','/api/security/wallets/archive','/api/security/wallets/remove-secret']);
function createHandler({sessions,origin,secret,bridge=null,readiness=()=>true}={}){
 const cookies=createBrowserSession({secret,origin});
 return async function handle(req,res,next){
  const u=new URL(req.url,'https://localhost'),p=u.pathname,token=cookies.parse(req);
  try{
   if(!readiness())return reply(res,503,{error:'AUTH_UNAVAILABLE'});
   if(p==='/auth21/internal/authorize-compute'&&req.method==='POST'&&bridge){
    if(req.socket.encrypted!==true||!require('../../Communication/communication_protocol_v1').verifyToken(require('../../Shared/paths').ROOT,String(req.headers['x-iatb-cp-token']||'')))return reply(res,403,{error:'FORBIDDEN'});
    const b=await read(req),data=b.payload||{},expect={audience:'indicators',operation:'self.read',method:'POST',ownerClientId:data.clientId,action:'indicator.user.compute',bodyDigest:require('../../Communication/communication_protocol_v1').hashData(data)};
    const grant=bridge.codec.verify(b.proof,expect),active=sessions.verifyHashedSession(data.sessionHash);
    return reply(res,grant&&active&&grant.clientId===active.clientId&&grant.role===active.role?200:403,{ok:!!grant&&!!active});
   }
   if(!cookies.originAllowed(req))return reply(res,403,{error:'ORIGIN_FORBIDDEN'});
   if(p==='/api/health'&&req.method==='GET')return reply(res,200,{ok:true,authentication:'Auth21',version:'2.1.1'});
   if(['/auth21/login','/api/login'].includes(p)&&req.method==='POST'){
    const b=await read(req);if(u.search||Object.keys(b).sort().join(',')!=='email,password'||typeof b.password!=='string'||b.password.length>1024)return reply(res,400,{error:'INVALID_REQUEST'});
    const login=await sessions.loginEmail(b.email,b.password,req.socket.remoteAddress||'local');
    if(login?.throttled)return reply(res,429,{error:'AUTH_THROTTLED'},{'Retry-After':'300'});
    if(login?.busy)return reply(res,503,{error:'AUTH_BUSY'},{'Retry-After':'2'});
    if(!login)return reply(res,401,{error:'INVALID_CREDENTIALS'});
    return reply(res,200,{ok:true,role:login.role,clientId:login.clientId,csrfToken:cookies.csrf(login.token),expiresAt:login.expiresAt},{'Set-Cookie':cookies.cookie(login.token)});
   }
   const principal=token&&sessions.verifySession(token);
   if(!principal){if(p==='/api/bootstrap')return reply(res,200,{authenticated:false,localBypass:false});return reply(res,401,{error:'AUTH_REQUIRED'});}
   sessions.touch(token);
   if(!['GET','HEAD'].includes(req.method)&&!cookies.validate(req,token)){sessions.audit(principal.clientId,'CSRF_REJECTED','DENIED');return reply(res,403,{error:'CSRF_FORBIDDEN'});}
   if(u.search&&!['/auth21/preferences'].includes(p)&&[...u.searchParams.keys()].some(k=>/client|owner|role|user/i.test(k)))return reply(res,400,{error:'IDENTITY_INPUT_FORBIDDEN'});
   if(['/communication/v1/ui/read','/communication/v1/ui/write'].includes(p)&&req.method==='POST'&&bridge){const data=await bridge.bridge(token,await read(req));return reply(res,200,{protocol:'CP/1',status:'OK',data});}
   if(p==='/ui-data/market/candles'&&req.method==='GET'&&bridge){if(principal.role==='GUEST')throw Error('FORBIDDEN');if(!sessions.attempt(crypto.createHash('sha256').update('candles:'+principal.clientId).digest('hex'),300))throw Error('AUTH_THROTTLED');const data=await bridge.rpc('marketdata','marketdata.candles',{symbol:u.searchParams.get('symbol'),timeframe:u.searchParams.get('interval')||'1m',source:u.searchParams.get('exchange'),limit:Math.min(1200,+u.searchParams.get('limit')||300),force:false});return reply(res,200,data);}
   if(['/auth21/me','/api/client/me','/api/profile','/ui-api/session'].includes(p)&&req.method==='GET')return reply(res,200,{ok:true,authenticated:true,authMode:'authenticated',role:principal.role,client:sessions.profile(token),permissions:{read:true,userWrite:principal.role!=='GUEST',adminWrite:principal.role==='ADMIN'}});
   if(p==='/api/bootstrap'&&req.method==='GET')return reply(res,200,{authenticated:true,role:principal.role,clientId:principal.clientId,localBypass:false});
   if(p==='/auth21/csrf'&&req.method==='GET')return reply(res,200,{csrfToken:cookies.csrf(token)});
   if(p==='/auth21/sessions'&&req.method==='GET')return reply(res,200,{items:sessions.sessionsFor(token)});
   if(p==='/auth21/audit'&&req.method==='GET')return reply(res,200,{items:sessions.recent(token)});
   if(['/auth21/logout','/api/logout'].includes(p)&&req.method==='POST'){sessions.revokeSession(token);sessions.audit(principal.clientId,'LOGOUT');return reply(res,200,{ok:true},{'Set-Cookie':cookies.expire});}
   if(p==='/auth21/sessions/revoke'&&req.method==='POST'){const b=await read(req);if(Object.keys(b).join(',')!=='id')throw Error('INVALID_REQUEST');return reply(res,200,{ok:true,revoked:sessions.revokeOwn(token,b.id)});}
   if(['/auth21/profile','/api/profile','/api/client/me'].includes(p)&&['POST','PUT'].includes(req.method)){return reply(res,200,await sessions.updateProfile(token,await read(req)));}
   if(p==='/auth21/password'&&req.method==='POST'){return reply(res,200,await sessions.changePassword(token,await read(req)),{'Set-Cookie':cookies.expire});}
   if(p==='/auth21/browser-state'&&req.method==='GET')return reply(res,200,{state:sessions.browserState(token)});
   if(p==='/auth21/browser-state'&&req.method==='PUT'){const b=await read(req);if(Object.keys(b).join(',')!=='state'||!b.state||typeof b.state!=='object'||Array.isArray(b.state))throw Error('INVALID_REQUEST');sessions.setBrowserState(token,b.state);return reply(res,200,{ok:true});}
   if(p==='/auth21/preferences'){
    if(principal.role==='GUEST')throw Error('FORBIDDEN');
    if(req.method==='GET')return reply(res,200,{value:sessions.getPreference(token,u.searchParams.get('scope'),u.searchParams.get('key'))});
    const b=await read(req);if(Object.keys(b).some(k=>!['scope','key','value'].includes(k)))throw Error('INVALID_REQUEST');
    if(req.method==='PUT'){sessions.setPreference(token,b.scope,b.key,b.value);return reply(res,200,{ok:true});}
    if(req.method==='DELETE')return reply(res,200,{ok:true,deleted:sessions.deletePreference(token,b.scope,b.key)});
   }
   if(p==='/api/settings/apis'&&req.method==='POST'){
    const b=await read(req);await sessions.reauthenticate(token,b.password);const values={};for(const [k,v] of Object.entries(b)){const map={openaiApiKey:'OPENAI_API_KEY',xBearerToken:'X_BEARER_TOKEN',zeroxApiKey:'ZEROX_API_KEY'};if(map[k])values[map[k]]=v;else if(k!=='password')throw Error('INVALID_REQUEST');}sessions.setSecrets(token,values);return reply(res,200,{ok:true});
   }
   if((principal.role==='GUEST'&&req.method!=='GET')||!((req.method==='GET'&&LEGACY_SELF_READ.has(p))||(req.method==='POST'&&LEGACY_SELF_WRITE.has(p)))){sessions.audit(principal.clientId,'ACCESS_DENIED','DENIED');return reply(res,403,{error:'ACCESS_DENIED'});}
   if(!next)return reply(res,404,{error:'NOT_FOUND'});
   let credentialClientId=null;
   if(req.method==='POST'){
    req.umBody=await read(req);
    function forged(x){return x&&typeof x==='object'&&Object.entries(x).some(([k,v])=>/^(clientId|ownerClientId|userId|role|securityVersion)$/i.test(k)||forged(v));}
    if(forged(req.umBody))throw Error('IDENTITY_INPUT_FORBIDDEN');
    if(p.startsWith('/api/security/wallets/')){await sessions.reauthenticate(token,req.umBody.password);credentialClientId=principal.clientId;}
   }
   req.umPrincipal={...principal,auth21:true,localBypass:false};
   return Context.run({...req.umPrincipal,token,credentialClientId},()=>next());
  }catch(e){
   const code=['UNAUTHORIZED','INVALID_CREDENTIALS'].includes(e.message)?401:e.message==='AUTH_THROTTLED'?429:e.message==='NOT_FOUND'?404:e.code==='SQLITE_CONSTRAINT_UNIQUE'?409:/^AUTH21_PREFERENCE/.test(e.message)||['INVALID_REQUEST','IDENTITY_INPUT_FORBIDDEN'].includes(e.message)?400:403;
   return reply(res,code,{error:code===409?'IDENTITY_ALREADY_USED':code===403?'ACCESS_DENIED':e.message});
  }
 };
}
module.exports={createHandler,read,reply,LEGACY_SELF_READ,LEGACY_SELF_WRITE};
