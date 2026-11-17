'use strict';
// Supervisor Engine 3.0-dev.1: owner/session-scoped operational memory.
// This is not a command ledger and must never substitute for Trading/Risk state.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Database=require('better-sqlite3');
const {redactSecrets}=require('../../Core/Shared/cognitive_text_safety');

function key(x){
  if(!x||!/^[a-f0-9]{64}$/.test(x.tenantId||'')||!/^[a-f0-9]{64}$/.test(x.sessionHash||'')||!/^[-A-Za-z0-9_]{1,64}$/.test(x.room||''))throw Error('SUPERVISOR_MEMORY_SCOPE_INVALID');
  return [x.tenantId,x.sessionHash,x.room];
}
function safe(value,max=3000){
  const str=typeof value==='string'?value:JSON.stringify(value);
  return redactSecrets(String(str??'').slice(0,max));
}
class WorkingMemory {
  constructor({root,filename,now=Date.now}={}){
    if(!root&&!filename)throw Error('SUPERVISOR_MEMORY_PATH_REQUIRED');
    this.now=now;
    const directory=filename?null:(process.env.IATB_RUNTIME_ROOT||path.join(root,'.runtime'));
    this.file=filename||path.join(directory,'supervisor-engine','working.sqlite');
    if(this.file===':memory:'&&process.env.NODE_ENV==='production')throw Error('SUPERVISOR_MEMORY_PATH_REQUIRED');
    if(this.file!==':memory:'){
      fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});
      fs.chmodSync(path.dirname(this.file),0o700);
    }
    this.db=new Database(this.file);
    if(this.file!==':memory:')fs.chmodSync(this.file,0o600);
    this.db.pragma('journal_mode=WAL');
    this.db.pragma('busy_timeout=5000');
    this.db.pragma('foreign_keys=ON');
    this.db.exec(`CREATE TABLE IF NOT EXISTS work_sessions (
      tenant TEXT NOT NULL, session_hash TEXT NOT NULL, room TEXT NOT NULL,
      objective TEXT, revision INTEGER NOT NULL DEFAULT 0, updated_ms INTEGER NOT NULL,
      PRIMARY KEY (tenant,session_hash,room)
    );
    CREATE TABLE IF NOT EXISTS work_observations (
      id TEXT PRIMARY KEY, tenant TEXT NOT NULL, session_hash TEXT NOT NULL, room TEXT NOT NULL,
      engine TEXT NOT NULL, command TEXT NOT NULL, status TEXT NOT NULL,
      value TEXT NOT NULL, contract_hash TEXT, observed_ms INTEGER NOT NULL,
      FOREIGN KEY(tenant,session_hash,room) REFERENCES work_sessions(tenant,session_hash,room) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_work_observations_scope
      ON work_observations(tenant,session_hash,room,observed_ms DESC);`);
  }
  current(scope){
    const k=key(scope);
    const row=this.db.prepare('SELECT objective,revision,updated_ms FROM work_sessions WHERE tenant=? AND session_hash=? AND room=?').get(...k);
    const observations=this.db.prepare('SELECT id,engine,command,status,value,contract_hash,observed_ms FROM work_observations WHERE tenant=? AND session_hash=? AND room=? ORDER BY observed_ms DESC,rowid DESC LIMIT 12').all(...k).map(x=>({
      ...x,value:JSON.parse(x.value)
    })).reverse();
    return {schema:'supervisor.working-memory/1.0',objective:row?.objective||null,revision:row?.revision||0,updated_at:row?.updated_ms||null,observations};
  }
  setObjective(scope,objective){
    const k=key(scope);
    if(typeof objective!=='string'||!objective.trim()||objective.length>1200)throw Error('SUPERVISOR_OBJECTIVE_INVALID');
    const text=safe(objective.trim(),1200),now=this.now();
    this.db.transaction(()=>{
      const row=this.db.prepare('SELECT objective FROM work_sessions WHERE tenant=? AND session_hash=? AND room=?').get(...k);
      if(row?.objective===text)return;
      this.db.prepare('INSERT INTO work_sessions VALUES(?,?,?,?,1,?) ON CONFLICT(tenant,session_hash,room) DO UPDATE SET objective=excluded.objective,revision=work_sessions.revision+1,updated_ms=excluded.updated_ms').run(...k,text,now);
      // Observations from a previous objective must not contaminate the new task.
      this.db.prepare('DELETE FROM work_observations WHERE tenant=? AND session_hash=? AND room=?').run(...k);
    }).immediate();
    return this.current(scope);
  }
  record(scope,{engine,command,status,value,contractHash=null}){
    const k=key(scope);
    if(!/^[a-z][a-z0-9_-]{0,40}$/.test(engine)||!/^[a-z][a-z0-9_.-]{0,95}$/.test(command)||!['OK','UNAVAILABLE','DENIED'].includes(status))throw Error('SUPERVISOR_OBSERVATION_INVALID');
    const now=this.now(),id=crypto.randomUUID();
    const compact=safe(value,3000);
    this.db.transaction(()=>{
      this.db.prepare('INSERT OR IGNORE INTO work_sessions VALUES(?,?,?,NULL,0,?)').run(...k,now);
      this.db.prepare('INSERT INTO work_observations VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,...k,engine,command,status,JSON.stringify(compact),typeof contractHash==='string'?contractHash.slice(0,120):null,now);
      this.db.prepare('UPDATE work_sessions SET revision=revision+1,updated_ms=? WHERE tenant=? AND session_hash=? AND room=?').run(now,...k);
      this.db.prepare('DELETE FROM work_observations WHERE id IN (SELECT id FROM work_observations WHERE tenant=? AND session_hash=? AND room=? ORDER BY observed_ms DESC,rowid DESC LIMIT -1 OFFSET 48)').run(...k);
    }).immediate();
    return this.current(scope);
  }
  close(){this.db.close();}
}
module.exports={WorkingMemory,key};
