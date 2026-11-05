'use strict';
// Core-owned polling of authenticated Engine Action Blocks. No direct trading calls.
const crypto=require('node:crypto');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
class RegistryDiscovery {
 constructor({manager,transport,targets,timeoutMs=3000}={}){
  if(!manager||typeof manager.sync!=='function'||typeof transport!=='function'||!Array.isArray(targets))throw Error('DISCOVERY_CONFIG_REQUIRED');
  this.manager=manager;this.transport=transport;this.targets=targets;this.timeoutMs=timeoutMs;
 }
 async refresh(){
  const report=[];
  for(const target of this.targets){
   const {engineId,brokerId=null}=target;
   if(!engineId||brokerId!==null&&!/^[a-zA-Z0-9_-]{1,64}$/.test(brokerId)){report.push({engineId,brokerId,status:'ERROR',error:'INVALID_TARGET'});continue;}
   const identity=brokerId===null?engineId:engineId+'@'+brokerId;
   try{
    // Transport MUST authenticate peer and bind verifiedEngine to a trusted service identity,
    // not to an Engine-supplied JSON field.
    const reply=await this.transport(target,{command:'registry.capabilities.snapshot',protocol:'CP/1',broker:brokerId},this.timeoutMs);
    if(!reply||reply.verifiedEngine!==engineId||!reply.manifest||!Array.isArray(reply.manifest.functions))throw Error('UNVERIFIED_SNAPSHOT');
    const manifest=reply.manifest;
    if(manifest.engine_id!==engineId||manifest.functions.length>1000)throw Error('INVALID_SNAPSHOT');
    if(brokerId!==null&&manifest.broker_id!==brokerId)throw Error('BROKER_MISMATCH');
    // Broker capabilities are scoped to the actual broker; never share grants across brokers.
    const scoped={...manifest,engine_id:identity,functions:manifest.functions.map(f=>({...f,engine:identity,broker_id:brokerId}))};
    const result=this.manager.sync(scoped,identity);
    report.push({engineId,brokerId,status:'SYNCED',count:result.count,changed:result.changed,revision:digest(scoped.functions)});
   }catch(error){report.push({engineId,brokerId,status:'ERROR',error:String(error.message||error)});}
  }
  return {checked:report.length,synced:report.filter(r=>r.status==='SYNCED').length,report};
 }
}
module.exports={RegistryDiscovery};
