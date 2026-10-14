'use strict';
/* Only a no-data proof handshake, never routes business operations. */
const {loadTrialSecret}=require('./auth21_ipc_keyfile');
const {proofCodec}=require('./auth21_ipc_proof');
const {createIpcBoundary}=require('./auth21_ipc_boundary');
function createRouterProbe({env,root}={}){
 if(!env||env.IATB_AUTH21_IPC_PROBE_TRIAL!=='1')throw Error('AUTH21_PROBE_EXPLICIT_OPTIN_REQUIRED');
 const secret=loadTrialSecret({env,root});
 const codec=proofCodec({secret});
 const authorize=createIpcBoundary({env,codec,audience:'router'});
 return function routerProbe(req,res){
  const access=authorize(req,{operation:'shared.read',method:'GET'});
  const ok=req.method==='GET'&&access.allowed;
  res.writeHead(ok?200:403,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(ok?{ok:true,verified:true}:{error:'FORBIDDEN'}));
 };
}
module.exports={createRouterProbe};
