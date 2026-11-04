'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {RegistryDiscovery}=require('../../Core/FunctionRegistry/discovery');
const targets=[{engineId:'marketdata'},{engineId:'trading',brokerId:'binance'},{engineId:'trading',brokerId:'kraken'}];
const calls=[],snapshots=[];
const manager={sync:(manifest,identity)=>{snapshots.push({manifest,identity});return {count:manifest.functions.length,changed:true};}};
const transport=async(target,request)=>{
 calls.push({target,request});
 return {verifiedEngine:target.engineId,manifest:{engine_id:target.engineId,broker_id:target.brokerId||null,functions:[{id:'status',engine:target.engineId,risk_level:'LOW',verified_handler:false}]}};
};
test('Core polls each Engine and broker, scoped registry identities',async()=>{
 const result=await new RegistryDiscovery({manager,transport,targets}).refresh();
 assert.equal(result.synced,3);assert.equal(calls.length,3);
 assert.ok(calls.every(c=>c.request.command==='registry.capabilities.snapshot'));
 assert.deepEqual(snapshots.map(s=>s.identity),['marketdata','trading@binance','trading@kraken']);
 assert.equal(snapshots[1].manifest.functions[0].engine,'trading@binance');
 assert.equal(snapshots[2].manifest.functions[0].broker_id,'kraken');
});
test('reject unauthenticated peer and do not import',async()=>{
 const saved=snapshots.length;
 const result=await new RegistryDiscovery({manager,targets:[{engineId:'risk'}],transport:async()=>({verifiedEngine:'trading',manifest:{engine_id:'risk',functions:[]}})}).refresh();
 assert.equal(result.synced,0);assert.equal(snapshots.length,saved);
});
test('reject cross-broker snapshots',async()=>{
 const saved=snapshots.length;
 const result=await new RegistryDiscovery({manager,targets:[{engineId:'trading',brokerId:'okx'}],transport:async()=>({verifiedEngine:'trading',manifest:{engine_id:'trading',broker_id:'binance',functions:[]}})}).refresh();
 assert.equal(result.synced,0);assert.equal(snapshots.length,saved);
});
test('one failed Engine does not stop others',async()=>{
 const result=await new RegistryDiscovery({manager,targets:[{engineId:'bad'},{engineId:'risk'}],transport:async(target)=>{if(target.engineId==='bad')throw Error('OFFLINE');return {verifiedEngine:'risk',manifest:{engine_id:'risk',functions:[]}};}}).refresh();
 assert.equal(result.synced,1);assert.equal(result.report[0].status,'ERROR');
});
