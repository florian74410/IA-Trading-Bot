'use strict';
// Shared Engine ActionBlock startup publisher. Invoke after the CP/1 service is ready.
// The sender identity is authenticated by the transport, never taken from the payload.
const fs=require('node:fs');
const crypto=require('node:crypto');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function publishOnStartup({manifestPath,send,brokerId=null,retries=6,delayMs=500,signal}){
 if(typeof send!=='function')throw Error('AUTHENTICATED_CP1_SEND_REQUIRED');
 if(!Number.isInteger(retries)||retries<1||retries>30)throw Error('INVALID_RETRIES');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(!manifest.engine_id||!Array.isArray(manifest.functions))throw Error('INVALID_MANIFEST');
 if(brokerId!==null&&!/^[a-zA-Z0-9_-]{1,64}$/.test(brokerId))throw Error('INVALID_BROKER');
 const request={protocol:'CP/1',command:'registry.capabilities.publish',arguments:{
  manifest:brokerId===null?manifest:{...manifest,broker_id:brokerId},
  revision:crypto.createHash('sha256').update(JSON.stringify(manifest.functions)).digest('hex')
 }};
 let lastError;
 for(let attempt=1;attempt<=retries;attempt++){
  if(signal?.aborted)throw Error('PUBLISH_ABORTED');
  try{
   const response=await send(request);
   if(response?.ok!==true||response?.engine_id!==manifest.engine_id||response?.broker_id!==(brokerId??null))throw Error('REGISTRY_ACK_MISMATCH');
   return {engine:manifest.engine_id,broker:brokerId,attempts:attempt};
  }catch(e){lastError=e;if(attempt<retries)await sleep(Math.min(delayMs*2**(attempt-1),5000));}
 }
 throw Error('REGISTRY_PUBLISH_FAILED: '+String(lastError?.message||lastError));
}
module.exports={publishOnStartup};
