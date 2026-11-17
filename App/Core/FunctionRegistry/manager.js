'use strict';
// IA-TB 2.6 Core component; must be called only from an authenticated CP/1 gateway.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),Database=require('better-sqlite3');
const hash=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
class FunctionRegistryManager {
 constructor(filename){if(!filename||filename===':memory:'&&process.env.NODE_ENV==='production')throw Error('PRIVATE_DB_PATH_REQUIRED');fs.mkdirSync(path.dirname(filename),{recursive:true});this.db=new Database(filename);this.db.pragma('journal_mode = WAL');this.db.pragma('foreign_keys = ON');this.db.exec(`
 CREATE TABLE IF NOT EXISTS engines(id TEXT PRIMARY KEY,revision TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS functions(engine TEXT NOT NULL,id TEXT NOT NULL,contract_json TEXT NOT NULL,contract_hash TEXT NOT NULL,PRIMARY KEY(engine,id));
 CREATE TABLE IF NOT EXISTS privileges(agent TEXT NOT NULL,engine TEXT NOT NULL,id TEXT NOT NULL,decision TEXT NOT NULL CHECK(decision IN ('ALLOW','DENY')),contract_hash TEXT NOT NULL,actor TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(agent,engine,id),FOREIGN KEY(engine,id) REFERENCES functions(engine,id));
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,at TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,details TEXT NOT NULL);`);
 this.db.exec(`CREATE TABLE IF NOT EXISTS permission_requests(request_id TEXT PRIMARY KEY,agent TEXT NOT NULL,engine TEXT NOT NULL,id TEXT NOT NULL,scope TEXT NOT NULL CHECK(scope IN ('ONCE','TEMPORARY','PERMANENT')),duration_seconds INTEGER,reason TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','DENIED','REVOKED')),contract_hash TEXT NOT NULL,created_at TEXT NOT NULL,reviewed_at TEXT,reviewer TEXT,expires_at TEXT,uses_remaining INTEGER);`);
 this.cache=new Map();this.generation=0;
 }
 sync(manifest,verifiedEngine){
 if(!verifiedEngine||verifiedEngine!==manifest.engine_id)throw Error('UNVERIFIED_ENGINE_IDENTITY');
 if(!Array.isArray(manifest.functions)||manifest.functions.length>1000)throw Error('INVALID_FUNCTIONS');
 const revision=hash(manifest.functions),engine=verifiedEngine,at=new Date().toISOString();
 const seen=new Set();manifest.functions.forEach(f=>{if(!f||f.engine!==engine||!f.id||seen.has(f.id)||!['LOW','MEDIUM','HIGH','CRITICAL'].includes(f.risk_level))throw Error('BAD_CONTRACT');seen.add(f.id);});
 const transaction=this.db.transaction(()=>{
  const old=this.db.prepare('SELECT revision FROM engines WHERE id=?').get(engine);if(old&&old.revision===revision)return false;
  this.db.prepare('INSERT INTO engines(id,revision,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at').run(engine,revision,at);
  for(const f of manifest.functions){const h=hash(f),prior=this.db.prepare('SELECT contract_hash FROM functions WHERE engine=? AND id=?').get(engine,f.id);
   if(prior&&prior.contract_hash!==h){this.db.prepare('DELETE FROM privileges WHERE engine=? AND id=?').run(engine,f.id);this.db.prepare("UPDATE permission_requests SET status='REVOKED' WHERE engine=? AND id=? AND status IN ('APPROVED','PENDING')").run(engine,f.id);}
   this.db.prepare('INSERT INTO functions(engine,id,contract_json,contract_hash) VALUES(?,?,?,?) ON CONFLICT(engine,id) DO UPDATE SET contract_json=excluded.contract_json,contract_hash=excluded.contract_hash').run(engine,f.id,JSON.stringify(f),h);}
  for(const row of this.db.prepare('SELECT id FROM functions WHERE engine=?').all(engine))if(!seen.has(row.id)){this.db.prepare("UPDATE permission_requests SET status='REVOKED' WHERE engine=? AND id=? AND status IN ('APPROVED','PENDING')").run(engine,row.id);this.db.prepare('DELETE FROM privileges WHERE engine=? AND id=?').run(engine,row.id);this.db.prepare('DELETE FROM functions WHERE engine=? AND id=?').run(engine,row.id);}
  this.db.prepare('INSERT INTO audit(at,actor,action,details) VALUES(?,?,?,?)').run(at,engine,'SYNC',JSON.stringify({revision,count:seen.size}));return true;
 });
 const changed=transaction.immediate();if(changed){this.generation++;this.cache.clear();}return {engine,revision,changed,count:seen.size};
 }
 list(agent){const rows=this.db.prepare('SELECT engine,id,contract_json,contract_hash FROM functions ORDER BY engine,id').all();return {agent,generation:this.generation,functions:rows.map(r=>({id:r.id,engine:r.engine,contract:JSON.parse(r.contract_json),...this.permission(agent,r.engine,r.id)}))};}
 permission(agent,engine,id){const row=this.db.prepare('SELECT * FROM functions WHERE engine=? AND id=?').get(engine,id);if(!row)return {decision:'DENY',reason:'UNKNOWN_FUNCTION'};const c=JSON.parse(row.contract_json);if(c.hard_deny||!c.verified_handler||!['LOW','MEDIUM'].includes(c.risk_level))return {decision:'DENY',reason:'FUNCTION_UNAVAILABLE'};
 const permanent=this.db.prepare('SELECT * FROM privileges WHERE agent=? AND engine=? AND id=? AND contract_hash=?').get(agent,engine,id,row.contract_hash);
 if(permanent?.decision==='ALLOW')return {decision:'ALLOW',scope:'PERMANENT',contract_hash:row.contract_hash,permission_ref:'legacy:'+agent+':'+engine+':'+id};
 const grant=this.db.prepare("SELECT * FROM permission_requests WHERE agent=? AND engine=? AND id=? AND contract_hash=? AND status='APPROVED' AND (expires_at IS NULL OR expires_at>?) AND (uses_remaining IS NULL OR uses_remaining>0) ORDER BY CASE scope WHEN 'PERMANENT' THEN 0 WHEN 'TEMPORARY' THEN 1 ELSE 2 END,created_at LIMIT 1").get(agent,engine,id,row.contract_hash,new Date().toISOString());
 return grant?{decision:'ALLOW',scope:grant.scope,expires_at:grant.expires_at,uses_remaining:grant.uses_remaining,contract_hash:row.contract_hash,permission_ref:grant.request_id}:{decision:'DENY',reason:'NO_ACTIVE_PERMISSION'};
 }
 grant(agent,engine,id,decision,adminIdentity){
 // Identity must come from independently authenticated Core ADMIN ingress, never from LLM request JSON.
 if(!adminIdentity||!adminIdentity.verified||!adminIdentity.isAdmin)throw Error('ADMIN_REQUIRED');
 if(!['ALLOW','DENY'].includes(decision))throw Error('BAD_DECISION');
 const row=this.db.prepare('SELECT contract_json,contract_hash FROM functions WHERE engine=? AND id=?').get(engine,id);if(!row)throw Error('UNKNOWN_FUNCTION');
 const contract=JSON.parse(row.contract_json);
 if(decision==='ALLOW'&&(contract.hard_deny||!contract.verified_handler||!['LOW','MEDIUM'].includes(contract.risk_level)))throw Error('GRANT_NOT_PERMITTED');
 const at=new Date().toISOString();this.db.transaction(()=>{
 this.db.prepare('INSERT INTO privileges(agent,engine,id,decision,contract_hash,actor,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(agent,engine,id) DO UPDATE SET decision=excluded.decision,contract_hash=excluded.contract_hash,actor=excluded.actor,updated_at=excluded.updated_at').run(agent,engine,id,decision,row.contract_hash,adminIdentity.id,at);
 this.db.prepare('INSERT INTO audit(at,actor,action,details) VALUES(?,?,?,?)').run(at,adminIdentity.id,'PRIVILEGE',JSON.stringify({agent,engine,id,decision}));
 if(decision==='DENY')this.db.prepare("UPDATE permission_requests SET status='REVOKED' WHERE agent=? AND engine=? AND id=? AND status='APPROVED'").run(agent,engine,id);}).immediate();this.cache.clear();this.generation++;
 }
 allowed(agent,engine,id){return this.list(agent).functions.some(f=>f.engine===engine&&f.id===id&&f.decision==='ALLOW');}
 close(){this.db.close();}
}
// Requests do not grant access: only an independently authenticated administrator can approve.
FunctionRegistryManager.prototype.requestPermission=function(agent,engine,id,scope,reason,durationSeconds){
 if(!agent||!['ONCE','TEMPORARY','PERMANENT'].includes(scope)||typeof reason!=='string'||!reason.trim()||reason.length>2000)throw Error('INVALID_REQUEST');
 if(scope==='TEMPORARY'&&(!Number.isInteger(durationSeconds)||durationSeconds<60||durationSeconds>86400))throw Error('INVALID_DURATION');
 const row=this.db.prepare('SELECT contract_json,contract_hash FROM functions WHERE engine=? AND id=?').get(engine,id);
 if(!row)throw Error('UNKNOWN_FUNCTION');
 const contract=JSON.parse(row.contract_json);
 if(contract.hard_deny||!contract.verified_handler||!['LOW','MEDIUM'].includes(contract.risk_level))throw Error('FUNCTION_UNAVAILABLE');
 const requestId=crypto.randomUUID(),at=new Date().toISOString();
 this.db.prepare('INSERT INTO permission_requests(request_id,agent,engine,id,scope,duration_seconds,reason,status,contract_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(requestId,agent,engine,id,scope,scope==='TEMPORARY'?durationSeconds:null,reason.trim(),'PENDING',row.contract_hash,at);
 this.db.prepare('INSERT INTO audit(at,actor,action,details) VALUES(?,?,?,?)').run(at,agent,'PERMISSION_REQUEST',JSON.stringify({requestId,engine,id,scope}));
 return {requestId,status:'PENDING'};
};
FunctionRegistryManager.prototype.reviewPermission=function(requestId,approve,adminIdentity){
 if(!adminIdentity?.verified||!adminIdentity.isAdmin||!adminIdentity.id)throw Error('ADMIN_REQUIRED');
 const at=new Date().toISOString();
 const outcome=this.db.transaction(()=>{
  const req=this.db.prepare('SELECT * FROM permission_requests WHERE request_id=?').get(requestId);
  if(!req||req.status!=='PENDING')throw Error('REQUEST_NOT_PENDING');
  const fn=this.db.prepare('SELECT contract_json,contract_hash FROM functions WHERE engine=? AND id=?').get(req.engine,req.id);
  if(approve&&(!fn||fn.contract_hash!==req.contract_hash))throw Error('CONTRACT_CHANGED');
  if(approve){const c=JSON.parse(fn.contract_json);if(c.hard_deny||!c.verified_handler||!['LOW','MEDIUM'].includes(c.risk_level))throw Error('GRANT_NOT_PERMITTED');}
  const status=approve?'APPROVED':'DENIED';
  const expires=approve&&req.scope==='TEMPORARY'?new Date(Date.now()+req.duration_seconds*1000).toISOString():null;
  this.db.prepare('UPDATE permission_requests SET status=?,reviewed_at=?,reviewer=?,expires_at=?,uses_remaining=? WHERE request_id=?').run(status,at,adminIdentity.id,expires,approve&&req.scope==='ONCE'?1:null,requestId);
  this.db.prepare('INSERT INTO audit(at,actor,action,details) VALUES(?,?,?,?)').run(at,adminIdentity.id,'PERMISSION_REVIEW',JSON.stringify({requestId,status}));
  return {requestId,status};
 });
 const result=outcome();this.cache.clear();this.generation++;return result;
};
FunctionRegistryManager.prototype.consumePermission=function(agent,engine,id){return this.db.transaction(()=>{const p=this.permission(agent,engine,id);if(p.decision!=='ALLOW')return false;if(p.scope==='ONCE'){const r=this.db.prepare("UPDATE permission_requests SET uses_remaining=0 WHERE request_id=? AND status='APPROVED' AND uses_remaining=1").run(p.permission_ref);if(r.changes!==1)return false;}this.db.prepare('INSERT INTO audit(at,actor,action,details) VALUES(?,?,?,?)').run(new Date().toISOString(),agent,'PERMISSION_CONSUMED',JSON.stringify({permission:p.permission_ref,engine,id}));return true;}).immediate();};
FunctionRegistryManager.prototype.revokePermission=function(requestId,adminIdentity){
 if(!adminIdentity?.verified||!adminIdentity.isAdmin||!adminIdentity.id)throw Error('ADMIN_REQUIRED');
 const changed=this.db.prepare("UPDATE permission_requests SET status='REVOKED',reviewer=?,reviewed_at=? WHERE request_id=? AND status='APPROVED'").run(adminIdentity.id,new Date().toISOString(),requestId);
 if(changed.changes!==1)throw Error('ACTIVE_GRANT_NOT_FOUND');
 this.cache.clear();this.generation++;return {requestId,status:'REVOKED'};
};
FunctionRegistryManager.prototype.listRequests=function(adminIdentity){
 if(!adminIdentity?.verified||!adminIdentity.isAdmin)throw Error('ADMIN_REQUIRED');
 return this.db.prepare('SELECT * FROM permission_requests ORDER BY created_at DESC LIMIT 500').all();
};
module.exports={FunctionRegistryManager};
