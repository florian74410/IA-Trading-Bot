'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const evm=require('../../Bank/Core/evm_wallet'),multi=require('../../Bank/Core/multichain_wallet'),{Wallet}=require('ethers');
function fixedScalar(hex,run){const original=crypto.createECDH;crypto.createECDH=function(curve){const e=original(curve);e.generateKeys=function(){e.setPrivateKey(Buffer.from(hex,'hex'));return e.getPublicKey();};return e;};try{run();}finally{crypto.createECDH=original;}}
test('new EVM keys retain zero-prefixed scalar width and reference addresses',()=>{
 for(const scalar of ['01','0100','01'+'00'.repeat(31)])fixedScalar(scalar,()=>{const result=evm.generate(),expected='0x'+scalar.padStart(64,'0');assert.equal(result.privateKey,expected);assert.equal(result.address.toLowerCase(),new Wallet(expected).address.toLowerCase());assert.equal(evm.fromPrivateKey(result.privateKey).address,result.address);});
 assert.throws(()=>evm.fromPrivateKey('01'),/EVM_PRIVATE_KEY_INVALID/);assert.throws(()=>evm.fromPrivateKey('00'.repeat(33)),/EVM_PRIVATE_KEY_INVALID/);assert.throws(()=>evm.fromPrivateKey('00'.repeat(32)));
});
test('new compressed Bitcoin WIF round-trips exact 32-byte scalar and address',()=>{
 for(const scalar of ['01','0100','01'+'00'.repeat(31)])fixedScalar(scalar,()=>{const generated=multi.generateBundle().accounts.find(a=>a.id==='bitcoin');assert.equal(generated.privateKey,scalar.padStart(64,'0'));const restored=multi.importBundle('bitcoin',generated.recovery).accounts[0];assert.equal(restored.privateKey,generated.privateKey);assert.equal(restored.address,generated.address);assert.equal(restored.publicKey,generated.publicKey);assert.equal(generated.recovery.length,52);});
 assert.throws(()=>multi.importBundle('bitcoin','invalid WIF'));
});
