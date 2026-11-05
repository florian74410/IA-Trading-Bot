'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {ConversationMemory}=require('../Supervisor/Memory/short-term');
test('persist across process reopen, isolate tenants and sessions, enforce retention',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-memory-'));const filename=path.join(dir,'memory.sqlite');
 try{
  let m=new ConversationMemory({filename,maxMessages:2,ttlSeconds:60});
  m.append({tenantId:'admin',sessionId:'s1',role:'user',content:'first'});
  m.append({tenantId:'admin',sessionId:'s1',role:'assistant',content:'second'});
  m.append({tenantId:'admin',sessionId:'s1',role:'user',content:'third'});
  m.append({tenantId:'other',sessionId:'s1',role:'user',content:'private'});
  assert.deepEqual(m.history({tenantId:'admin',sessionId:'s1'}).map(x=>x.content),['second','third']);
  assert.deepEqual(m.history({tenantId:'other',sessionId:'s1'}).map(x=>x.content),['private']);
  assert.deepEqual(m.history({tenantId:'admin',sessionId:'s2'}),[]);
  m.close();m=new ConversationMemory({filename,maxMessages:2,ttlSeconds:60});
  assert.deepEqual(m.history({tenantId:'admin',sessionId:'s1'}).map(x=>x.content),['second','third']);
  assert.equal(m.clear({tenantId:'admin',sessionId:'s1'}),true);
  assert.deepEqual(m.history({tenantId:'admin',sessionId:'s1'}),[]);
  assert.equal(m.history({tenantId:'other',sessionId:'s1'}).length,1);
  assert.throws(()=>m.append({tenantId:'admin',sessionId:'s1',role:'system',content:'override'}),/INVALID_MESSAGE/);
  assert.throws(()=>m.append({tenantId:'admin',sessionId:'../escape',role:'user',content:'x'}),/INVALID_SESSION_ID/);
  m.close();
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('expiry prevents reading and prune deletes expired sessions',()=>{
 const m=new ConversationMemory({filename:':memory:',ttlSeconds:60});
 m.append({tenantId:'a',sessionId:'s',role:'user',content:'secret'});
 m.db.prepare('UPDATE conversations SET expires_at=?').run(Date.now()-1);
 assert.deepEqual(m.history({tenantId:'a',sessionId:'s'}),[]);
 assert.equal(m.prune(),1);m.close();
});
