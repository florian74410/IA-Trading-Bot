'use strict';
// Attach only to a trusted CP/1 ingress after mutual service authentication.
// peer.engineId MUST be derived from the authenticated connection, not client JSON.
function receivePublication({manager,peer,request,allowedBrokers}){
 if(!manager||!peer?.authenticated||typeof peer.engineId!=='string'||!request||request.command!=='registry.capabilities.publish')throw Error('UNAUTHENTICATED_PUBLICATION');
 const args=request.arguments||{},manifest=args.manifest;
 if(!manifest||manifest.engine_id!==peer.engineId||!Array.isArray(manifest.functions))throw Error('ENGINE_IDENTITY_MISMATCH');
 const broker=manifest.broker_id??null;
 if(broker!==null&&(!/^[a-zA-Z0-9_-]{1,64}$/.test(broker)||typeof allowedBrokers!=='function'||!allowedBrokers(peer.engineId,broker,peer)))throw Error('UNAUTHORIZED_BROKER');
 const identity=broker===null?peer.engineId:peer.engineId+'@'+broker;
 const scoped={...manifest,engine_id:identity,functions:manifest.functions.map(f=>({...f,engine:identity,broker_id:broker}))};
 if(scoped.functions.some(f=>!f.id||f.engine!==identity))throw Error('INVALID_COMMAND');
 const result=manager.sync(scoped,identity);
 return {ok:true,engine_id:peer.engineId,broker_id:broker,count:result.count,changed:result.changed};
}
module.exports={receivePublication};
