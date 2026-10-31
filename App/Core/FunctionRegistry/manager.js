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
   if(prior&&prior.contract_hash!==h)this.db.prepare('DELETE FROM privileges WHERE engine=? AND id=?').run(engine,f.id);
   this.db.prepare('INSERT INTO functions(engine,id,contract_json,contract_hash) VALUES(?,?,?,?) ON CONFLICT(engine,id) DO UPDATE SET contract_json=excluded.contract_json,contract_hash=excluded.contract_hash').run(engine,f.id,JSON.stringify(f),h);}
  for(const row of this.db.prepare('SELECT id FROM functions WHERE engine=?').all(engine))if(!seen.has(row.id)){this.db.prepare('DELETE FROM privileges WHERE engine=? AND id=?').run(engine,row.id);this.db.prepare('DELETE FROM functions WHERE engine=? AND id=?').run(engine,row.id);}
  this.db.prepare('INSERT INTO audit(at,actor,action,details) VALUES(?,?,?,?)').run(at,engine,'SYNC',JSON.stringify({revision,count:seen.size}));return true;
 });
 const changed=transaction();if(changed){this.generation++;this.cache.clear();}return {engine,revision,changed,count:seen.size};
 }
 list(agent){if(this.cache.has(agent))return this.cache.get(agent);const rows=this.db.prepare('SELECT f.engine,f.id,f.contract_json,f.contract_hash,p.decision,p.contract_hash AS grant_hash FROM functions f LEFT JOIN privileges p ON p.engine=f.engine AND p.id=f.id AND p.agent=? ORDER BY f.engine,f.id').all(agent);
 const result={agent,generation:this.generation,functions:rows.map(r=>{const contract=JSON.parse(r.contract_json);return {id:r.id,engine:r.engine,contract,decision:r.decision==='ALLOW'&&r.contract_hash===r.grant_hash&&!contract.hard_deny?'ALLOW':'DENY'};})};
 this.cache.set(agent,result);return result;}
 grant(agent,engine,id,decision,adminIdentity){
 // Identity must come from independently authenticated Core ADMIN ingress, never from LLM request JSON.
 if(!adminIdentity||!adminIdentity.verified||!adminIdentity.isAdmin)throw Error('ADMIN_REQUIRED');
 if(!['ALLOW','DENY'].includes(decision))throw Error('BAD_DECISION');
 const row=this.db.prepare('SELECT contract_json,contract_hash FROM functions WHERE engine=? AND id=?').get(engine,id);if(!row)throw Error('UNKNOWN_FUNCTION');
 const contract=JSON.parse(row.contract_json);
 if(decision==='ALLOW'&&(contract.hard_deny||!contract.verified_handler||!['LOW','MEDIUM'].includes(contract.risk_level)))throw Error('GRANT_NOT_PERMITTED');
 const at=new Date().toISOString();this.db.transaction(()=>{
 this.db.prepare('INSERT INTO privileges(agent,engine,id,decision,contract_hash,actor,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(agent,engine,id) DO UPDATE SET decision=excluded.decision,contract_hash=excluded.contract_hash,actor=excluded.actor,updated_at=excluded.updated_at').run(agent,engine,id,decision,row.contract_hash,adminIdentity.id,at);
 this.db.prepare('INSERT INTO audit(at,actor,action,details) VALUES(?,?,?,?)').run(at,adminIdentity.id,'PRIVILEGE',JSON.stringify({agent,engine,id,decision}));})();
 this.cache.clear();this.generation++;
 }
 allowed(agent,engine,id){return this.list(agent).functions.some(f=>f.engine===engine&&f.id===id&&f.decision==='ALLOW');}
 close(){this.db.close();}
}
module.exports={FunctionRegistryManager};
