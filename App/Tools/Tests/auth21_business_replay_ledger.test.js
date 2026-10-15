'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto');
const {proofCodec}=require('../../Core/Clients/auth21_ipc_proof');
const {openLedger}=require('../../Core/Clients/auth21_business_replay_ledger');
test('signed capability jti cannot be consumed twice even after Engine restart',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-auth21-replay-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const now=()=>1800000000000;
 const codec=proofCodec({secret:crypto.randomBytes(32),now});
 const issue=()=>codec.issue({principal:{clientId:'CL000001',role:'ADMIN'},
  audience:'marketdata',operation:'admin.write',method:'POST',
  action:'marketdata.settings.set'});
 const proof=issue();
 const first=openLedger({root,engine:'marketdata',now});
 assert.equal(first.consume(proof),true);
 const restarted=openLedger({root,engine:'marketdata',now});
 assert.equal(restarted.consume(proof),false);
 assert.equal(restarted.consume(issue()),true);
 assert.equal(openLedger({root,engine:'portfolio',now}).consume(proof),true);
 assert.equal(first.consume('invalid'),false);
 const tooLate=openLedger({root,engine:'strategy',now:()=>1800000100000});
 assert.equal(tooLate.consume(proof),false);
});
test('engine replay ledger fails closed on unsafe directory and scope',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-auth21-replay-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 assert.throws(()=>openLedger({root,engine:'trading'}),/AUTH21_REPLAY_LEDGER_CONFIG/);
 const dir=path.join(root,'runtime','auth21-business','replay-marketdata');
 fs.mkdirSync(dir,{recursive:true});fs.chmodSync(dir,0o777);
 assert.throws(()=>openLedger({root,engine:'marketdata'}),/AUTH21_REPLAY_LEDGER_DIRECTORY_UNSAFE/);
});
