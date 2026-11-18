'use strict';
// Persistent long-term self memory, verified facts and unapproved suggestions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Database=require('better-sqlite3');
class PersonalMemory {
 constructor(filename){
  if(!filename||(filename===':memory:'&&process.env.NODE_ENV==='production'))throw Error('PRIVATE_DB_PATH_REQUIRED');
  if(filename!==':memory:'){fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});fs.chmodSync(path.dirname(filename),0o700);}
  this.db=new Database(filename);
  if(filename!==':memory:')fs.chmodSync(filename,0o600);
  this.db.pragma('journal_mode=WAL');this.db.pragma('busy_timeout=5000');this.db.pragma('secure_delete=ON');
  this.db.exec(`CREATE TABLE IF NOT EXISTS self_memory (scope TEXT PRIMARY KEY,summary TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS verified_facts (id TEXT PRIMARY KEY,scope TEXT NOT NULL,category TEXT NOT NULL,content TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_facts_scope ON verified_facts(scope);
CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY,scope TEXT NOT NULL,session TEXT NOT NULL,category TEXT NOT NULL,content TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED')),created_at TEXT NOT NULL);`);
 }
 readSelf(scope='supervisor'){const x=this.db.prepare('SELECT summary FROM self_memory WHERE scope=?').get(scope);return x?x.summary.slice(0,1200):'';}
 search(scope,query,limit=3){
  if(typeof query!=='string'||!query.trim())return [];
  const term=query.trim().slice(0,100).replace(/[\\%_]/g,c=>'\\'+c);
  return this.db.prepare("SELECT id,category,content FROM verified_facts WHERE scope=? AND content LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT ?").all(scope,'%'+term+'%',Math.min(5,Math.max(1,limit))).map(x=>({...x,content:x.content.slice(0,700)}));
 }
 propose(scope,session,entries){
  const out=[],now=new Date().toISOString();
  this.db.transaction(()=>{
   for(const e of entries.slice(0,3)){
    if(!e||typeof e.content!=='string'||!e.content.trim()||e.content.length>1000)continue;
    const id=crypto.randomUUID(),category=String(e.category||'observation').replace(/[^a-z0-9_-]/ig,'').slice(0,40)||'observation';
    this.db.prepare("INSERT INTO proposals(id,scope,session,category,content,status,created_at) VALUES(?,?,?,?,?,'PENDING',?)").run(id,scope,session,category,e.content,now);
    out.push({id,status:'PENDING',category});
   }
  })();
  return out;
 }
 // Trusted administrative workflow only; NEVER call in response to a model-generated tool request.
 saveVerified(scope,category,content){if(typeof content!=='string'||!content.trim()||content.length>2000)throw Error('INVALID_FACT');const id=crypto.randomUUID();this.db.prepare('INSERT INTO verified_facts VALUES(?,?,?,?,?)').run(id,scope,String(category||'general').slice(0,40),content,new Date().toISOString());return id;}
 setSelf(scope,summary){if(typeof summary!=='string'||summary.length>1200)throw Error('INVALID_SELF_MEMORY');this.db.prepare('INSERT INTO self_memory VALUES(?,?,?) ON CONFLICT(scope) DO UPDATE SET summary=excluded.summary,updated_at=excluded.updated_at').run(scope,summary,new Date().toISOString());}
 prune(pendingDays=30){if(!Number.isInteger(pendingDays)||pendingDays<1)throw Error('INVALID_RETENTION');const cutoff=new Date(Date.now()-pendingDays*86400000).toISOString();return this.db.prepare("DELETE FROM proposals WHERE status='PENDING' AND created_at < ?").run(cutoff).changes;}
 close(){this.db.close();}
}
module.exports={PersonalMemory};
