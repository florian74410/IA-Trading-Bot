'use strict';
// Verified Auth21 principal from an operation-bound signed IPC proof.
// The IPC key loader is restricted to the authenticated local Auth21 trial.
// No browser-supplied role or CP/1 machine token is trusted as ADMIN.
const crypto=require('node:crypto');
const {proofCodec}=require('../../Core/Clients/auth21_ipc_proof');
const {authorizeInterprocess}=require('../../Core/Clients/auth21_rbac_guard');
function createVerifier({env=process.env,replayStore}={}){
 const {preflightEnv}=require('../../Core/Backup/auth21_core_local_trial_wiring');
 const {loadTrialSecret}=require('../../Core/Clients/auth21_ipc_keyfile');
 const {active}=require('../../Core/Clients/auth21_service_boundary');
 if(!active(env)||env.IATB_AUTH21_IPC_PROBE_TRIAL!=='1')return null;
 const {root}=preflightEnv(env);
 const secret=loadTrialSecret({env,root});
 const codec=proofCodec({secret,replayStore});
 return async function(context){
   const payload=context&&context.payload;
   const proof=context&&context.proof;
   if(!payload||typeof payload!=='object'||typeof proof!=='string')return null;
   const operation=payload.command==='STATUS'?'admin.read':'admin.write';
   const action='trading.admin.command';
   const bodyDigest=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
   const access=authorizeInterprocess({codec,proof,audience:'trading',operation,method:operation==='admin.read'?'GET':'POST',action,bodyDigest});
   return access.allowed?{verified:true,role:access.role,subject:access.clientId}:null;
 };
}
module.exports={createVerifier};
