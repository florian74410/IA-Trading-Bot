'use strict';
// Supervisor short-term conversational memory. Separate from Soul and long-term memory.
// Only trusted application code may supply tenantId/sessionId; never trust model output.
const Database=require('better-sqlite3');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
class ConversationMemory {
 constructor({filename,ttlSeconds=86400,maxMessages=40,maxChars=12000}={}){
  if(!filename||filename===':memory:'&&process.env.NODE_ENV==='production')throw Error('PRIVATE_DB_PATH_REQUIRED');
  if(!Number.isInteger(ttlSeconds)||ttlSeconds<60||!Number.isInteger(maxMessages)||maxMessages<1||maxMessages>1000||!Number.isInteger(maxChars)||maxChars<1||maxChars>100000)throw Error('INVALID_MEMORY_CONFIG');
  if(filename!==':memory:'){fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});fs.chmodSync(path.dirname(filename),0o700);}
  this.db=new Database(filename);if(filename!==':memory:')fs.chmodSync(filename,0o600);this.db.pragma('journal_mode=WAL');this.db.pragma('busy_timeout=5000');this.db.pragma('secure_delete=ON');
  this.db.exec(`CREATE TABLE IF NOT EXISTS conversations(tenant_id TEXT NOT NULL,session_id TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,PRIMARY KEY(tenant_id,session_id));
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,session_id TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('user','assistant','tool','system')),content TEXT NOT NULL,created_at INTEGER NOT NULL,FOREIGN KEY(tenant_id,session_id) REFERENCES conversations(tenant_id,session_id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(tenant_id,session_id,created_at,id);`);
  this.db.pragma('foreign_keys=ON');this.ttlSeconds=ttlSeconds;this.maxMessages=maxMessages;this.maxChars=maxChars;
 }
 validate(tenantId,sessionId){if(typeof tenantId!=='string'||typeof sessionId!=='string'||!(/^[a-zA-Z0-9_-]{1,128}$/).test(tenantId)||!(/^[a-zA-Z0-9_-]{1,128}$/).test(sessionId))throw Error('INVALID_SESSION_ID');}
 append({tenantId,sessionId,role,content}){
  this.validate(tenantId,sessionId);
  if(!['user','assistant','tool'].includes(role)||typeof content!=='string'||!content.trim()||content.length>this.maxChars)throw Error('INVALID_MESSAGE');
  const now=Date.now(),id=crypto.randomUUID();
  this.db.transaction(()=>{
   this.db.prepare('DELETE FROM conversations WHERE expires_at<=?').run(now);
   this.db.prepare('INSERT INTO conversations(tenant_id,session_id,created_at,updated_at,expires_at) VALUES(?,?,?,?,?) ON CONFLICT(tenant_id,session_id) DO UPDATE SET updated_at=excluded.updated_at,expires_at=excluded.expires_at').run(tenantId,sessionId,now,now,now+this.ttlSeconds*1000);
   this.db.prepare('INSERT INTO messages(id,tenant_id,session_id,role,content,created_at) VALUES(?,?,?,?,?,?)').run(id,tenantId,sessionId,role,content,now);
   this.db.prepare('DELETE FROM messages WHERE tenant_id=? AND session_id=? AND id NOT IN (SELECT id FROM messages WHERE tenant_id=? AND session_id=? ORDER BY created_at DESC,rowid DESC LIMIT ?)').run(tenantId,sessionId,tenantId,sessionId,this.maxMessages);
  })();
  return {id,createdAt:new Date(now).toISOString()};
 }
 history({tenantId,sessionId,limit=this.maxMessages}){
  this.validate(tenantId,sessionId);if(!Number.isInteger(limit)||limit<1||limit>this.maxMessages)throw Error('INVALID_LIMIT');
  const now=Date.now();
  const rows=this.db.prepare('SELECT role,content,created_at FROM messages WHERE tenant_id=? AND session_id=? AND EXISTS(SELECT 1 FROM conversations WHERE tenant_id=? AND session_id=? AND expires_at>?) ORDER BY created_at DESC,rowid DESC LIMIT ?').all(tenantId,sessionId,tenantId,sessionId,now,limit);
  return rows.reverse().map(r=>({role:r.role,content:r.content,createdAt:new Date(r.created_at).toISOString()}));
 }
 clear({tenantId,sessionId}){this.validate(tenantId,sessionId);return this.db.prepare('DELETE FROM conversations WHERE tenant_id=? AND session_id=?').run(tenantId,sessionId).changes>0;}
 prune(){return this.db.prepare('DELETE FROM conversations WHERE expires_at<=?').run(Date.now()).changes;}
 close(){this.db.close();}
}
module.exports={ConversationMemory};
