'use strict';
/* Real Engine HTTP ingress with an opt-in sandbox persistence adapter.
 * Proof verified by the receiving Engine; writes never touch live resources.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {preflightEnv}=require('../Backup/auth21_core_local_trial_wiring');
const {loadTrialSecret}=require('./auth21_ipc_keyfile');
const {proofCodec}=require('./auth21_ipc_proof');
const business=require('./auth21_business_capability');
const {contract,validate}=require('./auth21_business_actions');
const {createWriter}=require('./auth21_indicator_fixture_writer');
function openBusinessIngress({env}={}){
 if(!env||env.IATB_AUTH21_BUSINESS_TRIAL!=='1'||
    env.IATB_AUTH21_IPC_PROBE_TRIAL!=='1'||env.IATB_TRADING_LIVE==='1')
  throw Error('AUTH21_BUSINESS_TRIAL_DISABLED');
 const {root}=preflightEnv(env);
 const trial=require('../Backup/auth21_engine_snapshot_trial').currentEngineSnapshotTrial();
 if(!trial||trial.root!==root||!['indicators','marketdata','fundamental','portfolio','strategy'].includes(trial.engine))
  throw Error('AUTH21_BUSINESS_WRITER_NOT_BOUND');
 const codec=proofCodec({secret:loadTrialSecret({env,root})});
 const directory=path.join(root,'runtime','auth21-business');
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 if(fs.lstatSync(directory).isSymbolicLink())throw Error('AUTH21_BUSINESS_SYMLINK');
 const indicatorWriter=trial.engine==='indicators'?createWriter({root:directory,codec}):null;
 const send=(res,status,obj)=>{
  if(res.writableEnded)return;
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
   'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Connection':'close'});
  res.end(JSON.stringify(obj));
 };
 function persist(rule,input,principal){
  if(rule.action==='indicator.settings.set')throw Error('AUTH21_INDICATOR_USES_OWN_WRITER');
  if(rule.action==='marketdata.settings.set'){
   const expected=path.join(root,'runtime','config','market_data_settings.json');
   if(env.IATB_MARKET_SETTINGS!==expected)
    throw Error('AUTH21_MARKETDATA_SETTINGS_OUTSIDE_TRIAL');
   const settings=require('../../MarketData/Config/market_data_settings');
   if(path.resolve(settings.file)!==expected)throw Error('AUTH21_MARKETDATA_SETTINGS_OUTSIDE_TRIAL');
   settings.setSnapshotGate(trial.gate);
   const updated=settings.save({...settings.load(),refreshMs:input.refreshMs});
   if(updated.refreshMs!==input.refreshMs)throw Error('AUTH21_MARKETDATA_SETTINGS_SAVE_INVALID');
  }
  let filename;
  if(rule.owner)filename=rule.engine+'-'+principal.clientId+'-'+input.key+'.fixture.json';
  else if(rule.action==='marketdata.settings.set')filename='marketdata-settings.fixture.json';
  else filename='fundamental-feed.fixture.json';
  const target=path.join(directory,filename);
  const temp=path.join(directory,'.auth21-'+crypto.randomBytes(12).toString('hex')+'.tmp');
  const value={action:rule.action,clientId:principal.clientId,
    ownerClientId:rule.owner?principal.clientId:null,settings:input};
  try{
   fs.writeFileSync(temp,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});
   fs.renameSync(temp,target);
  }finally{try{fs.unlinkSync(temp);}catch(_){}}
  return {ok:true,action:rule.action,ownerClientId:value.ownerClientId};
 }
 return function handler(req,res){
  const rule=contract(req.url);
  if(!rule||rule.engine!==trial.engine||req.method!==(rule.method||'POST')||
    !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket&&req.socket.remoteAddress)||
    req.headers.origin||req.headers.cookie||req.headers.authorization)
   return send(res,403,{error:'AUTH21_BUSINESS_DENIED'});
  if(rule.method==='GET'){
   if(req.headers['transfer-encoding']||
      (req.headers['content-length']!==undefined&&String(req.headers['content-length'])!=='0'))
    return send(res,400,{error:'INVALID_REQUEST'});
   const proof=req.headers['x-iatb-auth21-proof'];
   if(typeof proof!=='string')return send(res,403,{error:'AUTH21_BUSINESS_DENIED'});
   const digest=crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex');
   const access=business.verify({codec,proof,action:rule.action,bodyDigest:digest});
   if(!access.allowed)return send(res,403,{error:'AUTH21_BUSINESS_DENIED'});
   return send(res,200,{ok:true,action:rule.action,readOnly:true,
    providers:['BINANCE','KRAKEN','OKX','GMX']});
  }
  let bytes=0,parts=[],failed=false;
  req.on('data',chunk=>{
   bytes+=chunk.length;
   if(bytes>2048){failed=true;req.destroy();return;}
   parts.push(chunk);
  });
  req.on('end',()=>{
   if(failed)return;
   const raw=Buffer.concat(parts),digest=crypto.createHash('sha256').update(raw).digest('hex');
   let input;
   try{input=JSON.parse(raw.toString('utf8'));}
   catch(_){return send(res,400,{error:'INVALID_JSON'});}
   if(!validate(rule,input))return send(res,400,{error:'INVALID_SETTINGS'});
   const proof=req.headers['x-iatb-auth21-proof'];
   if(typeof proof!=='string')return send(res,403,{error:'AUTH21_BUSINESS_DENIED'});
   try{
    trial.gate.assertWritable();
    if(indicatorWriter){
     const result=indicatorWriter.write({proof,settings:input,bodyDigest:digest});
     return send(res,result.ok?200:403,result);
    }
    const verified=business.verify({codec,proof,action:rule.action,
      ownerClientId:rule.owner?input.ownerClientId:null,bodyDigest:digest});
    if(!verified.allowed)return send(res,403,{error:'AUTH21_BUSINESS_DENIED'});
    return send(res,200,persist(rule,input,verified));
   }catch(_){return send(res,409,{error:'AUTH21_BUSINESS_WRITE_BLOCKED'});}
  });
  req.on('error',()=>{if(!res.writableEnded)send(res,400,{error:'INVALID_REQUEST'});});
 };
}
module.exports={openBusinessIngress};
