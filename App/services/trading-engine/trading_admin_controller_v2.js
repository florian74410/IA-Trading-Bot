'use strict';
// P3 ADMIN command controller: fail closed. CP/1 service authentication is NOT ADMIN identity.
// This controller has deliberately no HTTP/CP route until Auth21 verifies a principal.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ALLOWED=new Set(['STATUS','START','RESTART','DRAINING_STOP','EMERGENCY_STOP']);
class TradingAdminController {
 constructor({lifecycle, verifyPrincipal, journalFile, now=Date.now}={}){
   if(!lifecycle||typeof lifecycle.snapshot!=='function')throw Error('LIFECYCLE_REQUIRED');
   this.lifecycle=lifecycle;this.verifyPrincipal=verifyPrincipal;this.now=now;
   this.journalFile=journalFile||path.join(path.dirname(lifecycle.file),'trading_admin_actions.jsonl');
   this.seen=new Map();
 }
 async command(input={},context={}){
   const command=String(input.command||'').toUpperCase();
   if(!ALLOWED.has(command))return {ok:false,error:'ADMIN_COMMAND_UNKNOWN'};
   // Fail closed unless the independent Auth21 verifier is actually installed.
   if(typeof this.verifyPrincipal!=='function')return {ok:false,error:'AUTH21_ADMIN_VERIFIER_NOT_CONFIGURED'};
   let identity;
   try {identity=await this.verifyPrincipal(context);} catch(_){return {ok:false,error:'ADMIN_AUTHORIZATION_FAILED'};}
   if(!identity||identity.verified!==true||identity.role!=='ADMIN'||!identity.subject)
     return {ok:false,error:'ADMIN_PERMISSION_DENIED'};
   if(command==='STATUS')return {ok:true,state:this.lifecycle.snapshot()};
   const id=String(input.command_id||'');
   if(!/^[A-Za-z0-9_-]{16,128}$/.test(id))return {ok:false,error:'COMMAND_ID_INVALID'};
   if(input.confirmed!==true)return {ok:false,error:'ADMIN_CONFIRMATION_REQUIRED'};
   const timestamp=Number(input.timestamp);
   if(!Number.isSafeInteger(timestamp)||Math.abs(this.now()-timestamp)>60000)return {ok:false,error:'COMMAND_EXPIRED'};
   // P4/P5 and the Auth21 binding must precede any mutation of the lifecycle state.
   // We record no claim of execution at this stage.
   return {ok:false,error:'COMMAND_IMPLEMENTATION_PENDING',command};
 }
}
module.exports={TradingAdminController,ALLOWED};
