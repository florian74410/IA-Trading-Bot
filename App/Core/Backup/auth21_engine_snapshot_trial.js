'use strict';
/* Engine-side local writer gate, DEBUG fixture sandbox ONLY.
 * This connects the real store to snapshot freeze semantics; it does not
 * imply cross-process coordination or authorize snapshot capture.
 */
const path=require('node:path');
const {preflightEnv}=require('./auth21_core_local_trial_wiring');
const {LocalSnapshotWriter}=require('./snapshot_coordinator');
const ENGINES=new Set(['portfolio','marketdata']);
function openEngineSnapshotTrial({env=process.env,engine}={}){
 if(!ENGINES.has(engine)||env.IATB_AUTH21_CORE_AUTH_TRIAL!=='1')
  throw Error('AUTH21_ENGINE_SNAPSHOT_TRIAL_DISABLED');
 const {root}=preflightEnv(env);
 if(engine==='marketdata'){
  for(const key of ['IATB_MARKET_REGISTRY_DB','IATB_API_TELEMETRY_DB','IATB_MICROSTRUCTURE_DB','IATB_FINANCIAL_STORE']){
   const configured=env[key];
   if(!configured)continue;
   const p=path.resolve(configured),data=path.join(root,'userdata');
   if(p===data||!p.startsWith(data+path.sep))throw Error('AUTH21_MARKETDATA_STORE_OUTSIDE_FIXTURE');
  }
 }
 if(engine==='portfolio'){
  const configured=env.IATB_PORTFOLIO_DB;
  if(configured){
   const p=path.resolve(configured),data=path.join(root,'userdata');
   if(p===data||!p.startsWith(data+path.sep))
    throw Error('AUTH21_PORTFOLIO_DB_OUTSIDE_FIXTURE');
  }
 }
 const gate=new LocalSnapshotWriter(engine);
 return Object.freeze({engine,root,gate,
  // No remotely accessible coordinator. This module intentionally cannot
  // signal PREPARE/RELEASE without a future authenticated Core connection.
 });
}
module.exports={openEngineSnapshotTrial};
