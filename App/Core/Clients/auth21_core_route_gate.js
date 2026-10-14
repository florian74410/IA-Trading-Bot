'use strict';
/* Auth 2.1 Core boundary: explicit isolated handler only, default deny legacy.
 * No imports from server.js, legacy session(), Wallet or CP/1.
 * Deliberately not activated without independent runtime proof.
 */
const {createAuth21HttpHandler}=require('./auth21_http_boundary');
function deny(res,status,error){
 if(res.writableEnded)return;
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify({error}));
}
function createIsolatedCoreGate({sessions}={}){
 const auth=createAuth21HttpHandler({sessions});
 return async function isolatedCoreGate(req,res){
  let pathname;
  try{pathname=new URL(req.url,'http://localhost').pathname}
  catch(_){deny(res,404,'NOT_FOUND');return}
  // Auth boundary rechecks path, query string, method and bearer itself.
  if(['/auth21/login','/auth21/me','/auth21/logout'].includes(pathname)){
   await auth(req,res);return;
  }
  // No legacy cookie, localBypass, active_client_id, recovery, setup, admin,
  // trading, Wallet, CP/1, static pages or server diagnostics in this mode.
  deny(res,404,'NOT_FOUND');
 };
}
module.exports={createIsolatedCoreGate};
