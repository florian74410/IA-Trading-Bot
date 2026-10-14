'use strict';
/* Phase 2 native SQLite session fixture suite. No server, routes, real identity,
 * wallet, user password or GEN-1 service is ever opened.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const Database=require('better-sqlite3');
const ClientCrypto=require('../../Core/Clients/client_crypto');
const {Auth21SessionStore}=require('../../Core/Clients/auth21_session_store');
const {migrateFixture}=require('../CI/auth21_v3_migration_trial');
const {LocalSnapshotWriter}=require('../../Core/Backup/snapshot_coordinator');
const Kdf=require('../../Core/Clients/password_hasher_v2');

const PASSWORD='FICTION_ONLY_auth_22$2030';
const NOW=1900000000;
const migrationDir=path.resolve(__dirname,'../../Core/Clients/migrations');
function prepare(t,{v3=true,gate=null}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-auth21-v3-'));
 const file=path.join(root,'clients-fixture.sqlite');
 // Make a test-only encryption key before creating the SQLite file; key
 // generation deliberately refuses a missing key beside an existing DB.
 const keyFile=path.join(root,'Secrets','client_master.key');
 const clientCrypto=new ClientCrypto(keyFile,{clientDbPath:file});
 const db=new Database(file);
 db.pragma('foreign_keys=ON');
 for(const n of ['001_clients_v1.sql','002_client_accounts_v1.sql'])db.exec(fs.readFileSync(path.join(migrationDir,n),'utf8'));
 const f={root,file,keyFile,clientCrypto,db,now:NOW,gate};
 t.after(()=>{if(f.db.open)f.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return f;
}
function add(f,id='CL000001',role='USER'){
 const now='2026-10-14T00:00:00Z';
 const salt=crypto.randomBytes(16).toString('hex');
 const hash=crypto.pbkdf2Sync(PASSWORD,salt,180000,32,'sha256').toString('hex');
 f.db.prepare('INSERT INTO clients(client_id,external_ref_hash,security_version,status,created_at,updated_at) VALUES(?,?,1,?,?,?)')
   .run(id,'fixture-'+id,'ACTIVE',now,now);
 f.db.prepare('INSERT INTO client_accounts(client_id,username_enc,username_hash,password_salt,password_hash,password_iterations,role,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
   .run(id,'enc-'+id,'h-'+id,salt,hash,180000,role,1,now,now);
}
async function init(f){
 await migrateFixture(f.db,{fixtureRoot:f.root});
 return new Auth21SessionStore({
  db:f.db,clientCrypto:f.clientCrypto,snapshotGate:f.gate,
  nowSeconds:()=>f.now
 });
}
async function login(store,id='CL000001',password=PASSWORD){
 return store.loginWithPassword(id,password);
}

test('v2 schema is rejected without auto-migrating anything',t=>{
 const f=prepare(t);add(f);
 assert.throws(()=>new Auth21SessionStore({db:f.db,clientCrypto:f.clientCrypto}),/AUTH21_V3_REQUIRED/);
 assert.equal(f.db.prepare('SELECT MAX(version) AS v FROM client_schema_migrations').get().v,2);
});
test('valid credentials create opaque high-entropy token, only SHA-256 hash stored',async t=>{
 const f=prepare(t);add(f);const s=await init(f);
 const res=await login(s);
 assert.equal(res.token.length,43);
 assert.deepEqual(s.verifySession(res.token),{
  clientId:'CL000001',role:'USER',issuedAt:NOW,expiresAt:NOW+3600
 });
 const row=f.db.prepare('SELECT session_hash,client_id,security_version,auth_protocol_version,last_seen_at FROM client_sessions').get();
 assert.match(row.session_hash,/^[a-f0-9]{64}$/);
 assert.notEqual(row.session_hash,res.token);
 assert.equal(row.session_hash,crypto.createHash('sha256').update(Buffer.from(res.token,'base64url')).digest('hex'));
 assert.equal(row.last_seen_at,null);
 assert.equal(row.auth_protocol_version,1);
 const audit=f.db.prepare('SELECT detail_enc,action FROM client_security_audit').get();
 assert.equal(audit.action,'SESSION_ISSUED');assert.equal(audit.detail_enc,'');
});
test('wrong or missing password creates neither token nor audit',async t=>{
 const f=prepare(t);add(f);const s=await init(f);
 assert.equal(await login(s,'CL000001','WRONG_PASSWORD'),null);
 assert.equal(await login(s,'CL009999'),null);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_sessions').get().n,0);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_security_audit').get().n,0);
});
test('malformed and tampered tokens are rejected, without SQLite writes',async t=>{
 const f=prepare(t);add(f);const s=await init(f);const r=await login(s);
 for(const token of [null,'','a','x'.repeat(43),r.token.slice(0,-1)+'!',r.token+'a']){
  assert.equal(s.verifySession(token),null);
 }
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_sessions').get().n,1);
});
test('expiry is absolute, cannot be extended by polling or repeated verification',async t=>{
 const f=prepare(t);add(f);const s=await init(f);const r=await login(s);
 f.now+=3599;assert.ok(s.verifySession(r.token));
 f.now++;assert.equal(s.verifySession(r.token),null);
 assert.equal(f.db.prepare('SELECT last_seen_at FROM client_sessions').get().last_seen_at,null);
});
test('short or excessive TTL is rejected before issuing a session',async t=>{
 const f=prepare(t);add(f);const s=await init(f);
 await assert.rejects(()=>s.loginWithPassword('CL000001',PASSWORD,{ttlSeconds:1}),/AUTH21_SESSION_TTL_INVALID/);
 await assert.rejects(()=>s.loginWithPassword('CL000001',PASSWORD,{ttlSeconds:86400}),/AUTH21_SESSION_TTL_INVALID/);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_sessions').get().n,0);
});
test('revoke presented token only; second logout is idempotent',async t=>{
 const f=prepare(t);add(f);const s=await init(f);
 const a=await login(s),b=await login(s);
 assert.equal(s.revokeSession(a.token),true);
 assert.equal(s.verifySession(a.token),null);
 assert.ok(s.verifySession(b.token));
 assert.equal(s.revokeSession(a.token),false);
 assert.equal(s.revokeSession('bad-token'),false);
});
test('revoke-my-sessions only affects the authenticated client',async t=>{
 const f=prepare(t);add(f,'CL000001');add(f,'CL000002');
 const s=await init(f);const a=await login(s,'CL000001');
 const b=await login(s,'CL000001');
 const other=await login(s,'CL000002');
 assert.equal(s.revokeMySessions(a.token),2);
 assert.equal(s.verifySession(a.token),null);assert.equal(s.verifySession(b.token),null);
 assert.ok(s.verifySession(other.token));
 assert.throws(()=>s.revokeMySessions(a.token),/AUTH21_UNAUTHORIZED/);
});
test('credential change invalidates all existing sessions by SQLite trigger',async t=>{
 const f=prepare(t);add(f);const s=await init(f);const r=await login(s);
 const prev=f.db.prepare('SELECT security_version AS v FROM clients').get().v;
 f.db.prepare('UPDATE client_accounts SET password_hash=? WHERE client_id=?').run('FICTIONAL_RESET_DIGEST','CL000001');
 assert.equal(s.verifySession(r.token),null);
 assert.equal(f.db.prepare('SELECT security_version AS v FROM clients').get().v,prev+1);
 assert.notEqual(f.db.prepare('SELECT revoked_at FROM client_sessions').get().revoked_at,null);
});
test('role promotion or demotion invalidates all prior sessions',async t=>{
 const f=prepare(t);add(f);const s=await init(f);const r=await login(s);
 f.db.prepare("UPDATE client_accounts SET role='ADMIN' WHERE client_id='CL000001'").run();
 assert.equal(s.verifySession(r.token),null);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_sessions WHERE revoked_at IS NULL').get().n,0);
});
test('disable account or client identity invalidates existing sessions',async t=>{
 const f=prepare(t);add(f,'CL000001');add(f,'CL000002');const s=await init(f);
 const r1=await login(s,'CL000001'),r2=await login(s,'CL000002');
 f.db.prepare("UPDATE client_accounts SET enabled=0 WHERE client_id='CL000001'").run();
 f.db.prepare("UPDATE clients SET status='DISABLED' WHERE client_id='CL000002'").run();
 assert.equal(s.verifySession(r1.token),null);
 assert.equal(s.verifySession(r2.token),null);
});
test('concurrent password reset while async hashing rejects issuance without token',async t=>{
 const f=prepare(t);add(f);const s=await init(f);
 const pending=login(s);
 f.db.prepare("UPDATE client_accounts SET password_hash='FICTIONAL_RESET' WHERE client_id='CL000001'").run();
 assert.equal(await pending,null);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_sessions').get().n,0);
});
test('concurrent disable/role change while async hashing rejects issuance',async t=>{
 const f=prepare(t);add(f,'CL000001');add(f,'CL000002');const s=await init(f);
 const pending1=login(s,'CL000001'),pending2=login(s,'CL000002');
 f.db.prepare("UPDATE client_accounts SET enabled=0 WHERE client_id='CL000001'").run();
 f.db.prepare("UPDATE client_accounts SET role='GUEST' WHERE client_id='CL000002'").run();
 assert.equal(await pending1,null);assert.equal(await pending2,null);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_sessions').get().n,0);
});
test('audit failure rolls back token insert atomically',async t=>{
 const f=prepare(t);add(f);const s=await init(f);
 f.db.exec("CREATE TRIGGER stop_issue BEFORE INSERT ON client_security_audit WHEN NEW.action='SESSION_ISSUED' BEGIN SELECT RAISE(ABORT,'AUDIT_FIXTURE_FAIL'); END;");
 await assert.rejects(()=>login(s),/AUDIT_FIXTURE_FAIL/);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_sessions').get().n,0);
});
test('personal preferences use AES-256-GCM and are invisible across clients',async t=>{
 const f=prepare(t);add(f,'CL000001');add(f,'CL000002');const s=await init(f);
 const a=await login(s,'CL000001'),b=await login(s,'CL000002');
 s.setPreference(a.token,'ui','theme','private-blue');
 s.setPreference(b.token,'ui','theme','private-orange');
 assert.equal(s.getPreference(a.token,'ui','theme'),'private-blue');
 assert.equal(s.getPreference(b.token,'ui','theme'),'private-orange');
 const raw=f.db.prepare('SELECT client_id,value_enc FROM client_preferences ORDER BY client_id').all();
 assert.equal(raw.length,2);
 assert.ok(raw.every(row=>!row.value_enc.includes('private-')));
 assert.equal(f.clientCrypto.open(raw[0].value_enc),'private-blue');
 assert.equal(f.clientCrypto.open(raw[1].value_enc),'private-orange');
 assert.notEqual(raw[0].value_enc,raw[1].value_enc);
});
test('GUEST cannot write server-side preferences',async t=>{
 const f=prepare(t);add(f,'CL000001','GUEST');const s=await init(f);
 const r=await login(s);
 assert.ok(r);
 assert.equal(s.getPreference(r.token,'ui','theme'),null);
 assert.throws(()=>s.setPreference(r.token,'ui','theme','blue'),/AUTH21_READ_ONLY/);
 assert.throws(()=>s.deletePreference(r.token,'ui','theme'),/AUTH21_READ_ONLY/);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_preferences').get().n,0);
});
test('revoked or expired session cannot read or update personal data',async t=>{
 const f=prepare(t);add(f);const s=await init(f);const r=await login(s);
 s.setPreference(r.token,'ui','theme','dark');
 s.revokeSession(r.token);
 assert.throws(()=>s.getPreference(r.token,'ui','theme'),/AUTH21_UNAUTHORIZED/);
 assert.throws(()=>s.setPreference(r.token,'ui','theme','light'),/AUTH21_UNAUTHORIZED/);
 const another=await login(s);f.now+=3600;
 assert.throws(()=>s.getPreference(another.token,'ui','theme'),/AUTH21_UNAUTHORIZED/);
});
test('preferences reject invalid scope/oversized value and support deletion',async t=>{
 const f=prepare(t);add(f);const s=await init(f);const r=await login(s);
 assert.throws(()=>s.setPreference(r.token,'../../../../','abc','bad'),/AUTH21_PREFERENCE_KEY_INVALID/);
 assert.throws(()=>s.setPreference(r.token,'ui','theme','x'.repeat(16385)),/AUTH21_PREFERENCE_VALUE_INVALID/);
 assert.equal(s.deletePreference(r.token,'ui','theme'),false);
 s.setPreference(r.token,'ui','theme','dark');
 assert.equal(s.deletePreference(r.token,'ui','theme'),true);
 assert.equal(s.getPreference(r.token,'ui','theme'),null);
});
test('snapshot writer gate blocks login creation, revoke and preference mutation',async t=>{
 const gate=new LocalSnapshotWriter('clients');
 const f=prepare(t,{gate});add(f);const s=await init(f);
 const r=await login(s);
 gate.prepare(1);
 await assert.rejects(()=>login(s),/SNAPSHOT_WRITE_QUIESCED/);
 assert.throws(()=>s.revokeSession(r.token),/SNAPSHOT_WRITE_QUIESCED/);
 assert.throws(()=>s.setPreference(r.token,'ui','theme','blocked'),/SNAPSHOT_WRITE_QUIESCED/);
 assert.throws(()=>s.deletePreference(r.token,'ui','theme'),/SNAPSHOT_WRITE_QUIESCED/);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM client_sessions').get().n,1);
 gate.abort(1);
 assert.equal(s.revokeSession(r.token),true);
});
test('session and encrypted preferences persist after SQLite connection restart',async t=>{
 const f=prepare(t);add(f);const s=await init(f);const r=await login(s);
 s.setPreference(r.token,'ui','theme','persistent-test-value');
 f.db.close();f.db=new Database(f.file);f.db.pragma('foreign_keys=ON');
 const reopenCrypto=new ClientCrypto(f.keyFile,{clientDbPath:f.file});
 const reopened=new Auth21SessionStore({db:f.db,clientCrypto:reopenCrypto,nowSeconds:()=>f.now});
 assert.ok(reopened.verifySession(r.token));
 assert.equal(reopened.getPreference(r.token,'ui','theme'),'persistent-test-value');
});
test('unsupported authentication role and protocol version are rejected',async t=>{
 const f=prepare(t);add(f,'CL000001','SUPERADMIN');const s=await init(f);
 assert.equal(await login(s),null);
 f.db.prepare("UPDATE client_accounts SET role='USER' WHERE client_id='CL000001'").run();
 const r=await login(s);
 f.db.prepare('UPDATE client_sessions SET auth_protocol_version=99').run();
 assert.equal(s.verifySession(r.token),null);
});
