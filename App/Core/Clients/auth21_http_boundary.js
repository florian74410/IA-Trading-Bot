'use strict';
/* Auth 2.1 isolated HTTP boundary. NOT mounted in Core server or Gateway.
 * Passes all authentication to Auth21SessionStore; no clientId/cookie bypass.
 * Deliberately exposes no ADMIN, recovery, registration, or Wallet functions.
 */
const {URL}=require('node:url');
const MAX_BYTES=4096;
const TOKEN=/^Bearer ([A-Za-z0-9_-]{43})$/;
function reply(res,status,data){
 if(res.headersSent||res.writableEnded)return;
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(data));
}
function readJSON(req){
 return new Promise((resolve,reject)=>{
  let length=0,parts=[],done=false;
  const fail=err=>{if(done)return;done=true;reject(err);req.resume()};
  const header=req.headers['content-length'];
  if(header!==undefined&&(!/^\d+$/.test(String(header))||Number(header)>MAX_BYTES)){
   fail(Error('AUTH21_BODY_TOO_LARGE'));return;
  }
  req.on('data',chunk=>{
   if(done)return;
   length+=chunk.length;
   if(length>MAX_BYTES){fail(Error('AUTH21_BODY_TOO_LARGE'));return}
   parts.push(chunk);
  });
  req.once('aborted',()=>fail(Error('AUTH21_BODY_ABORTED')));
  req.once('error',fail);
  req.once('end',()=>{
   if(done)return;
   done=true;
   try{
    if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw Error('AUTH21_CONTENT_TYPE');
    const obj=JSON.parse(Buffer.concat(parts).toString('utf8'));
    if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('AUTH21_BODY_INVALID');
    resolve(obj);
   }catch(_){reject(Error('AUTH21_BODY_INVALID'))}
  });
 });
}
function bearer(req){
 const h=req.headers.authorization;
 if(typeof h!=='string')return null;
 const match=TOKEN.exec(h);
 return match?match[1]:null;
}
function createAuth21HttpHandler({sessions}={}){
 if(!sessions||typeof sessions.loginWithPassword!=='function'||
    typeof sessions.verifySession!=='function'||typeof sessions.revokeSession!=='function')
  throw Error('AUTH21_SESSIONS_REQUIRED');
 return async function auth21Http(req,res){
  try{
   let uri;
   try{uri=new URL(req.url||'', 'http://localhost');}catch(_){reply(res,404,{error:'NOT_FOUND'});return}
   if(uri.search||uri.hash||!['/auth21/login','/auth21/me','/auth21/logout'].includes(uri.pathname)){
    reply(res,404,{error:'NOT_FOUND'});return;
   }
   if(req.method==='POST'&&uri.pathname==='/auth21/login'){
    const input=await readJSON(req);
    if(Object.keys(input).sort().join(',')!=='clientId,password' ||
      typeof input.clientId!=='string'||!/^(?:CL)[A-Za-z0-9_-]{1,64}$/.test(input.clientId)||
      typeof input.password!=='string'||input.password.length>1024){
     reply(res,400,{error:'INVALID_REQUEST'});return;
    }
    let result;
    try{result=await sessions.loginWithPassword(input.clientId,input.password)}catch(e){
     if(e.message==='SNAPSHOT_WRITE_QUIESCED'){reply(res,503,{error:'AUTH_UNAVAILABLE'});return}
     throw e;
    }
    if(!result){reply(res,401,{error:'INVALID_CREDENTIALS'});return}
    reply(res,200,{token:result.token,role:result.role,clientId:result.clientId,expiresAt:result.expiresAt});
    return;
   }
   if(req.method==='GET'&&uri.pathname==='/auth21/me'){
    const token=bearer(req),session=token&&sessions.verifySession(token);
    if(!session){reply(res,401,{error:'UNAUTHORIZED'});return}
    reply(res,200,{clientId:session.clientId,role:session.role,expiresAt:session.expiresAt});
    return;
   }
   if(req.method==='POST'&&uri.pathname==='/auth21/logout'){
    const token=bearer(req),session=token&&sessions.verifySession(token);
    if(!session){reply(res,401,{error:'UNAUTHORIZED'});return}
    if(sessions.revokeSession(token)!==true){reply(res,401,{error:'UNAUTHORIZED'});return}
    reply(res,200,{ok:true});return;
   }
   reply(res,405,{error:'METHOD_NOT_ALLOWED'});
  }catch(error){
   if(error&&/^AUTH21_BODY_/.test(error.message)){
    reply(res,400,{error:'INVALID_REQUEST'});return;
   }
   if(error&&error.message==='SNAPSHOT_WRITE_QUIESCED'){
    reply(res,503,{error:'AUTH_UNAVAILABLE'});return;
   }
   reply(res,503,{error:'AUTH_UNAVAILABLE'});
  }
 };
}
module.exports={createAuth21HttpHandler};
