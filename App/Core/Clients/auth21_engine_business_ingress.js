'use strict';
/* Single explicitly allowed Auth21 business action, on disposable DEBUG root.
 * Does not dispatch legacy CP/1, accept browser sessions or touch live settings.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {preflightEnv}=require('../Backup/auth21_core_local_trial_wiring');
const {loadTrialSecret}=require('./auth21_ipc_keyfile');
const {proofCodec}=require('./auth21_ipc_proof');
const {createWriter}=require('./auth21_indicator_fixture_writer');
function openBusinessIngress({env}={}){
 if(!env||env.IATB_AUTH21_BUSINESS_TRIAL!=='1'||
    env.IATB_AUTH21_IPC_PROBE_TRIAL!=='1'||env.IATB_TRADING_LIVE==='1')
  throw Error('AUTH21_BUSINESS_TRIAL_DISABLED');
 const {root}=preflightEnv(env);
 const trial=require('../Backup/auth21_engine_snapshot_trial').currentEngineSnapshotTrial();
 if(!trial||trial.root!==root||trial.engine!=='indicators')
  throw Error('AUTH21_BUSINESS_WRITER_NOT_BOUND');
 const codec=proofCodec({secret:loadTrialSecret({env,root})});
 const directory=path.join(root,'runtime','auth21-business');
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const writer=createWriter({root:directory,codec});
 const send=(res,status,obj)=>{
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
   'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Connection':'close'});
  res.end(JSON.stringify(obj));
 };
 return function handler(req,res){
  if(req.method!=='POST'||req.url!=='/auth21/business/indicator/settings'||
    !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket&&req.socket.remoteAddress)||
    req.headers.origin||req.headers.cookie||req.headers.authorization)
   return send(res,403,{error:'AUTH21_BUSINESS_DENIED'});
  let bytes=0,parts=[],failed=false;
  req.on('data',chunk=>{
   bytes+=chunk.length;
   if(bytes>2048){failed=true;req.destroy();return;}
   parts.push(chunk);
  });
  req.on('end',()=>{
   if(failed)return;
   const raw=Buffer.concat(parts),digest=crypto.createHash('sha256').update(raw).digest('hex');
   let body;
   try{body=JSON.parse(raw.toString('utf8'));}
   catch(_){return send(res,400,{error:'INVALID_JSON'});}
   if(!body||Array.isArray(body)||typeof body!=='object'||
      Object.keys(body).sort().join(',')!=='enabled,refreshMs'||
      typeof body.enabled!=='boolean'||!Number.isSafeInteger(body.refreshMs)||
      body.refreshMs<1000||body.refreshMs>60000)
    return send(res,400,{error:'INVALID_SETTINGS'});
   const proof=req.headers['x-iatb-auth21-proof'];
   if(typeof proof!=='string')return send(res,403,{error:'AUTH21_BUSINESS_DENIED'});
   try{
    trial.gate.assertWritable();
    const result=writer.write({proof,settings:body,bodyDigest:digest});
    return send(res,result.ok?200:403,result);
   }catch(_){return send(res,409,{error:'AUTH21_BUSINESS_WRITE_BLOCKED'});}
  });
  req.on('error',()=>{if(!res.writableEnded)send(res,400,{error:'INVALID_REQUEST'});});
 };
}
module.exports={openBusinessIngress};
