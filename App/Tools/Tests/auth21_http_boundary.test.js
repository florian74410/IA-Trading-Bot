'use strict';
/* Pure in-process HTTP handler tests. Does not open a real port or DB.
 * Native SQLite end-to-end tests remain a separate Phase 6 gate.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {createAuth21HttpHandler}=require('../../Core/Clients/auth21_http_boundary');
const VALID_TOKEN='A'.repeat(43);
function fixture(){
 const events=[],state={revoked:false};
 const sessions={
  async loginWithPassword(id,pw){events.push('login');return id==='CL000001'&&pw==='correct-16-characters'
   ?{token:VALID_TOKEN,clientId:id,role:'USER',expiresAt:1900000000}:null},
  verifySession(token){events.push('verify');return token===VALID_TOKEN&&!state.revoked
   ?{clientId:'CL000001',role:'USER',expiresAt:1900000000}:null},
  revokeSession(token){events.push('revoke');if(token!==VALID_TOKEN)return false;state.revoked=true;return true;}
 };
 return {events,state,sessions,handler:createAuth21HttpHandler({sessions})};
}
async function send(handler,{method='GET',url='/auth21/me',headers={},body}={}){
 const req=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
 req.method=method;req.url=url;req.headers={...headers};
 const res={
  headersSent:false,writableEnded:false,
  writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true;return this},
  end(data){this.body=JSON.parse(data);this.writableEnded=true}
 };
 await handler(req,res);
 return res;
}
test('login verifies provided password and returns bearer token without caching',async()=>{
 const x=fixture(),r=await send(x.handler,{method:'POST',url:'/auth21/login',
  headers:{'content-type':'application/json'},
  body:{clientId:'CL000001',password:'correct-16-characters'}});
 assert.equal(r.status,200);assert.equal(r.body.token,VALID_TOKEN);
 assert.equal(r.headers['Cache-Control'],'no-store');assert.deepEqual(x.events,['login']);
});
test('incorrect credentials use uniform 401, no token or account metadata',async()=>{
 const x=fixture(),r=await send(x.handler,{method:'POST',url:'/auth21/login',
  headers:{'content-type':'application/json'},
  body:{clientId:'CL000001',password:'WRONG_PASSWORD'}});
 assert.deepEqual(r.body,{error:'INVALID_CREDENTIALS'});assert.equal(r.status,401);
});
test('login rejects extra role assignment, overlong body and query strings',async()=>{
 const x=fixture();
 const cases=[
  {method:'POST',url:'/auth21/login',headers:{'content-type':'application/json'},body:{clientId:'CL000001',password:'hello',role:'ADMIN'}},
  {method:'POST',url:'/auth21/login',headers:{'content-type':'application/json'},body:'{"clientId":"CL000001","password":"'+('A'.repeat(4500))+'"}'},
  {method:'POST',url:'/auth21/login?debug=1',headers:{'content-type':'application/json'},body:{clientId:'CL000001',password:'hello'}},
  {method:'POST',url:'/auth21/login',headers:{'content-type':'text/plain'},body:'{}'}
 ];
 const out=await Promise.all(cases.map(c=>send(x.handler,c)));
 assert.deepEqual(out.map(r=>r.status),[400,400,404,400]);
 assert.deepEqual(x.events,[]);
});
test('me requires strict bearer header and returns a minimal principal',async()=>{
 const x=fixture();
 for(const auth of [undefined,VALID_TOKEN,'Basic '+VALID_TOKEN,'Bearer  '+VALID_TOKEN]){
  const r=await send(x.handler,{headers:auth?{authorization:auth}:{}});
  assert.equal(r.status,401);
 }
 const r=await send(x.handler,{headers:{authorization:'Bearer '+VALID_TOKEN}});
 assert.equal(r.status,200);
 assert.deepEqual(r.body,{clientId:'CL000001',role:'USER',expiresAt:1900000000});
});
test('logout invalidates token and immediately makes me unauthorized',async()=>{
 const x=fixture();
 const headers={authorization:'Bearer '+VALID_TOKEN};
 const out=await send(x.handler,{method:'POST',url:'/auth21/logout',headers});
 assert.equal(out.status,200);assert.equal(out.body.ok,true);
 const next=await send(x.handler,{headers});assert.equal(next.status,401);
 const again=await send(x.handler,{method:'POST',url:'/auth21/logout',headers});
 assert.equal(again.status,401);
});
test('role spoofing through URL, body or cookie cannot reach account management',async()=>{
 const x=fixture();
 for(const url of ['/api/admin/status','/auth21/admin','/auth21/me?role=ADMIN','/auth21/../../api/admin']){
  const res=await send(x.handler,{method:'GET',url,headers:{cookie:'role=ADMIN',authorization:'Bearer '+VALID_TOKEN}});
  assert.equal(res.status,404);
 }
 assert.deepEqual(x.events,[]);
});
test('unexpected session storage failure returns generic unavailable without stack or secret',async()=>{
 const x=fixture();
 x.sessions.loginWithPassword=async()=>{throw Error('LEAK-FICTIONAL-DB-SECRET')};
 const r=await send(x.handler,{method:'POST',url:'/auth21/login',
  headers:{'content-type':'application/json'},body:{clientId:'CL000001',password:'correct-16-characters'}});
 assert.equal(r.status,503);assert.deepEqual(r.body,{error:'AUTH_UNAVAILABLE'});
});
test('snapshot write-freeze maps to temporary failure without issuing session',async()=>{
 const x=fixture();
 x.sessions.loginWithPassword=async()=>{throw Error('SNAPSHOT_WRITE_QUIESCED')};
 const r=await send(x.handler,{method:'POST',url:'/auth21/login',
  headers:{'content-type':'application/json'},body:{clientId:'CL000001',password:'correct-16-characters'}});
 assert.equal(r.status,503);assert.equal(r.body.error,'AUTH_UNAVAILABLE');
});
test('non-allowed HTTP method refuses with 405 and no state changes',async()=>{
 const x=fixture();const r=await send(x.handler,{method:'PUT',url:'/auth21/login'});
 assert.equal(r.status,405);assert.deepEqual(x.events,[]);
});
