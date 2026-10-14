'use strict';
/* ADMIN 2.1 local-CLI-gated management: REAL SQLite/native crypto on
 * disposable fake data only; no running services, network or wallet keys.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const Database=require('better-sqlite3');
const ClientCrypto=require('../../Core/Clients/client_crypto');
const {Auth21SessionStore}=require('../../Core/Clients/auth21_session_store');
const {Auth21AdminStore}=require('../../Core/Clients/auth21_admin_store');
const {migrateFixture}=require('../CI/auth21_v3_migration_trial');
const {LocalSnapshotWriter}=require('../../Core/Backup/snapshot_coordinator');

const PASSWORD='FICTIONAL_admin_password_2026$';
const legacyDir=path.resolve(__dirname,'../../Core/Clients/migrations');
function setup(t,{gate=null}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-auth21-v3-'));
 const file=path.join(root,'clients-fixture.sqlite');
 const keyFile=path.join(root,'client_master.key');
 const clientCrypto=new ClientCrypto(keyFile,{clientDbPath:file});
 const db=new Database(file);
 db.pragma('foreign_keys=ON');
 for(const script of ['001_clients_v1.sql','002_client_accounts_v1.sql']){
  db.exec(fs.readFileSync(path.join(legacyDir,script),'utf8'));
 }
 const f={root,file,keyFile,db,clientCrypto,gate,now:1900000000};
 t.after(()=>{if(f.db.open)f.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return f;
}
function seed(f,id,role='USER'){
 const iso='2026-10-14T00:00:00.000Z';
 const salt=crypto.randomBytes(16).toString('hex');
 const digest=crypto.pbkdf2Sync(PASSWORD,salt,180000,32,'sha256').toString('hex');
 f.db.prepare([
  'INSERT INTO clients(client_id,external_ref_hash,first_name_enc,email_enc,status,security_version,created_at,updated_at)',
  'VALUES(?,?,?,?,?,1,?,?)'
 ].join(' ')).run(id,'FAKE_'+id,'ENCRYPTED_TEST_NAME_'+id,'ENCRYPTED_TEST_EMAIL_'+id,'ACTIVE',iso,iso);
 f.db.prepare([
  'INSERT INTO client_accounts(client_id,username_enc,username_hash,password_hash,password_salt,',
  'password_iterations,role,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
 ].join(' ')).run(id,'ENCRYPTED_USERNAME','USERNAME_'+id,digest,salt,180000,role,1,iso,iso);
}
async function ready(f,localAuth=()=>true){
 await migrateFixture(f.db,{fixtureRoot:f.root});
 const sessions=new Auth21SessionStore({
  db:f.db,clientCrypto:f.clientCrypto,snapshotGate:f.gate,nowSeconds:()=>f.now
 });
 const adminStore=new Auth21AdminStore({
  sessionStore:sessions,authorizeLocalOperator:localAuth,snapshotGate:f.gate
 });
 return {sessions,adminStore};
}
async function token(sessions,clientId){const r=await sessions.loginWithPassword(clientId,PASSWORD);assert.ok(r);return r.token;}
function count(f){
 return f.db.prepare([
  "SELECT count(*) AS n FROM client_accounts a JOIN clients c USING(client_id)",
  "WHERE role='ADMIN' AND enabled=1 AND status='ACTIVE'"
 ].join(' ')).get().n;
}
function metadata(f,id){
 return f.db.prepare('SELECT client_id,role,enabled,password_hash,password_algo FROM client_accounts WHERE client_id=?').get(id);
}
function actions(f){
 return f.db.prepare('SELECT action,client_id,actor_client_id,detail_enc FROM client_security_audit ORDER BY id').all();
}

test('missing trusted local-operator gate prevents ADMIN store construction',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');await migrateFixture(f.db,{fixtureRoot:f.root});
 const sessions=new Auth21SessionStore({db:f.db,clientCrypto:f.clientCrypto,nowSeconds:()=>f.now});
 assert.throws(()=>new Auth21AdminStore({sessionStore:sessions}),/AUTH21_ADMIN_LOCAL_OPERATOR_REQUIRED/);
});
test('missing last-admin trigger refuses to initialize rather than silently weaken policy',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');await migrateFixture(f.db,{fixtureRoot:f.root});
 const sessions=new Auth21SessionStore({db:f.db,clientCrypto:f.clientCrypto,nowSeconds:()=>f.now});
 f.db.exec('DROP TRIGGER auth21_last_admin_account_update');
 assert.throws(()=>new Auth21AdminStore({sessionStore:sessions,authorizeLocalOperator:()=>true}),/AUTH21_ADMIN_SQL_GUARD_MISSING/);
});
test('the historical SUPERADMIN role is never promoted silently',async t=>{
 const f=setup(t);seed(f,'CL000001','SUPERADMIN');await migrateFixture(f.db,{fixtureRoot:f.root});
 const sessions=new Auth21SessionStore({db:f.db,clientCrypto:f.clientCrypto,nowSeconds:()=>f.now});
 const manager=new Auth21AdminStore({sessionStore:sessions,authorizeLocalOperator:()=>true});
 assert.equal(await sessions.loginWithPassword('CL000001',PASSWORD),null);
 assert.equal(count(f),0);
 assert.equal(metadata(f,'CL000001').role,'SUPERADMIN');
 assert.throws(()=>manager.listAccounts('untrusted'),/AUTH21_ADMIN_FORBIDDEN/);
});
test('ADMIN access needs BOTH a live session and a trusted local operator',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 const access={allowed:false};const {sessions,adminStore}=await ready(f,()=>access.allowed);
 const adminToken=await token(sessions,'CL000001');
 const userToken=await token(sessions,'CL000002');
 assert.throws(()=>adminStore.listAccounts(adminToken),/AUTH21_LOCAL_OPERATOR_DENIED/);
 access.allowed=true;
 assert.throws(()=>adminStore.listAccounts(userToken),/AUTH21_ADMIN_FORBIDDEN/);
 assert.throws(()=>adminStore.listAccounts('invalid-token'),/AUTH21_ADMIN_FORBIDDEN/);
 assert.equal(adminStore.activeAdminCount(adminToken),1);
 const listing=adminStore.listAccounts(adminToken);
 assert.equal(listing.length,2);
 assert.equal(JSON.stringify(listing).includes('password_hash'),false);
 assert.equal(JSON.stringify(listing).includes('first_name_enc'),false);
});
test('last ACTIVE ADMIN cannot be demoted or disabled through management service',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');const {sessions,adminStore}=await ready(f);
 const t1=await token(sessions,'CL000001');
 assert.throws(()=>adminStore.changeRole(t1,'CL000001','USER'),/LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.throws(()=>adminStore.setEnabled(t1,'CL000001',false),/LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.throws(()=>adminStore.setClientStatus(t1,'CL000001','DISABLED'),/LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.throws(()=>adminStore.removeLogin(t1,'CL000001'),/LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.equal(count(f),1);assert.ok(sessions.verifySession(t1));
 assert.equal(actions(f).filter(x=>x.action.startsWith('ADMIN_')).length,0);
});
test('last ADMIN remains protected from direct SQL writers too',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');await migrateFixture(f.db,{fixtureRoot:f.root});
 for(const sql of [
  "UPDATE client_accounts SET role='GUEST' WHERE client_id='CL000001'",
  "UPDATE client_accounts SET enabled=0 WHERE client_id='CL000001'",
  "DELETE FROM client_accounts WHERE client_id='CL000001'",
  "UPDATE clients SET status='DISABLED' WHERE client_id='CL000001'",
  "DELETE FROM clients WHERE client_id='CL000001'"
 ]){
  assert.throws(()=>f.db.exec(sql),/LAST_ACTIVE_ADMIN_REQUIRED/);
  assert.equal(count(f),1);
 }
 assert.equal(f.db.pragma('integrity_check',{simple:true}),'ok');
});
test('two admins allow removal of one but refuse removing the last',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','ADMIN');
 const {sessions,adminStore}=await ready(f);const actor=await token(sessions,'CL000001');
 assert.equal(adminStore.changeRole(actor,'CL000002','USER').changed,true);
 assert.equal(count(f),1);
 assert.throws(()=>adminStore.changeRole(actor,'CL000001','USER'),/LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.equal(count(f),1);
});
test('role change revokes target sessions and audits identity of administrator',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 const {sessions,adminStore}=await ready(f),admin=await token(sessions,'CL000001'),user=await token(sessions,'CL000002');
 assert.equal(adminStore.changeRole(admin,'CL000002','GUEST').changed,true);
 assert.equal(sessions.verifySession(user),null);
 assert.equal(metadata(f,'CL000002').role,'GUEST');
 const a=actions(f).find(x=>x.action==='ADMIN_ROLE_CHANGED');
 assert.deepEqual(a,{action:'ADMIN_ROLE_CHANGED',client_id:'CL000002',actor_client_id:'CL000001',detail_enc:''});
});
test('ADMIN cannot set unknown role, enabled status or a malformed clientId',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');const {sessions,adminStore}=await ready(f);
 const actor=await token(sessions,'CL000001');
 assert.throws(()=>adminStore.changeRole(actor,'CL000001','SUPERADMIN'),/AUTH21_ROLE_INVALID/);
 assert.throws(()=>adminStore.changeRole(actor,'CL000001','root'),/AUTH21_ROLE_INVALID/);
 assert.throws(()=>adminStore.setEnabled(actor,'CL000001',1),/AUTH21_ENABLED_INVALID/);
 assert.throws(()=>adminStore.setClientStatus(actor,'CL000001','DELETED'),/AUTH21_STATUS_INVALID/);
 assert.throws(()=>adminStore.removeLogin(actor,"CL000001'; DROP TABLE clients;"),/AUTH21_CLIENT_ID_INVALID/);
});
test('no-op operations preserve versions, sessions and avoid admin audit spam',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');
 const {sessions,adminStore}=await ready(f),admin=await token(sessions,'CL000001');
 const before=f.db.prepare("SELECT security_version AS v FROM clients WHERE client_id='CL000001'").get().v;
 assert.equal(adminStore.changeRole(admin,'CL000001','ADMIN').changed,false);
 assert.equal(adminStore.setEnabled(admin,'CL000001',true).changed,false);
 assert.equal(adminStore.setClientStatus(admin,'CL000001','ACTIVE').changed,false);
 assert.equal(f.db.prepare("SELECT security_version AS v FROM clients WHERE client_id='CL000001'").get().v,before);
 assert.ok(sessions.verifySession(admin));
 assert.equal(actions(f).filter(x=>x.action.startsWith('ADMIN_')).length,0);
});
test('removing non-last login retains client identity and public wallet references',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 f.db.prepare('INSERT INTO client_wallets(client_id,wallet_id,created_at) VALUES(?,?,?)')
  .run('CL000002','WALLET_PUBLIC_REFERENCE_ONLY','2026-10-14');
 const {sessions,adminStore}=await ready(f),admin=await token(sessions,'CL000001'),user=await token(sessions,'CL000002');
 assert.equal(adminStore.removeLogin(admin,'CL000002').changed,true);
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM clients WHERE client_id='CL000002'").get().n,1);
 assert.equal(f.db.prepare("SELECT wallet_id FROM client_wallets WHERE client_id='CL000002'").get().wallet_id,'WALLET_PUBLIC_REFERENCE_ONLY');
 assert.equal(sessions.verifySession(user),null);
 assert.equal(metadata(f,'CL000002'),undefined);
 assert.equal(actions(f).filter(x=>x.action==='ADMIN_LOGIN_REMOVED').length,1);
});
test('ADMIN identity and ability to log in survive DB close and restart',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');const {sessions,adminStore}=await ready(f);
 const admin=await token(sessions,'CL000001');
 assert.equal(adminStore.activeAdminCount(admin),1);
 f.db.close();f.db=new Database(f.file);f.db.pragma('foreign_keys=ON');
 const key=new ClientCrypto(f.keyFile,{clientDbPath:f.file});
 const reopenedSessions=new Auth21SessionStore({db:f.db,clientCrypto:key,nowSeconds:()=>f.now});
 const reopenedManager=new Auth21AdminStore({sessionStore:reopenedSessions,authorizeLocalOperator:()=>true});
 assert.equal(reopenedManager.activeAdminCount(admin),1);
 assert.ok(reopenedSessions.verifySession(admin));
 assert.equal((await reopenedSessions.loginWithPassword('CL000001',PASSWORD)).role,'ADMIN');
});
test('admin password reset revokes sessions, persists Argon2id and leaves no plaintext in audit',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 const {sessions,adminStore}=await ready(f),actor=await token(sessions,'CL000001'),oldToken=await token(sessions,'CL000002');
 const fresh='NEW_FICTIONAL_password_2026$';
 assert.equal((await adminStore.resetPassword(actor,'CL000002',fresh)).changed,true);
 assert.equal(sessions.verifySession(oldToken),null);
 assert.equal(await sessions.loginWithPassword('CL000002',PASSWORD),null);
 const next=await sessions.loginWithPassword('CL000002',fresh);
 assert.ok(next);
 const target=metadata(f,'CL000002');assert.equal(target.password_algo,'ARGON2ID');
 const history=JSON.stringify(actions(f));
 assert.equal(history.includes(fresh),false);
 assert.equal(history.includes(target.password_hash),false);
 assert.equal(actions(f).filter(x=>x.action==='ADMIN_PASSWORD_RESET').length,1);
});
test('resetting admin own password revokes its own authorization immediately',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');const {sessions,adminStore}=await ready(f);
 const actor=await token(sessions,'CL000001');
 assert.equal((await adminStore.resetPassword(actor,'CL000001','NEW_FICTIONAL_password_2026$')).changed,true);
 assert.equal(sessions.verifySession(actor),null);
 assert.throws(()=>adminStore.listAccounts(actor),/AUTH21_ADMIN_FORBIDDEN/);
 assert.equal(count(f),1);
});
test('revoked ADMIN session cannot perform further management operations',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 const {sessions,adminStore}=await ready(f),actor=await token(sessions,'CL000001');
 sessions.revokeSession(actor);
 assert.throws(()=>adminStore.changeRole(actor,'CL000002','GUEST'),/AUTH21_ADMIN_FORBIDDEN/);
 assert.equal(metadata(f,'CL000002').role,'USER');
});
test('snapshot held blocks mutations, preserves target role and account record',async t=>{
 const gate=new LocalSnapshotWriter('clients');
 const f=setup(t,{gate});seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 const {sessions,adminStore}=await ready(f),actor=await token(sessions,'CL000001');
 gate.prepare(1);
 assert.throws(()=>adminStore.changeRole(actor,'CL000002','GUEST'),/SNAPSHOT_WRITE_QUIESCED/);
 assert.throws(()=>adminStore.setEnabled(actor,'CL000002',false),/SNAPSHOT_WRITE_QUIESCED/);
 assert.throws(()=>adminStore.removeLogin(actor,'CL000002'),/SNAPSHOT_WRITE_QUIESCED/);
 assert.equal(metadata(f,'CL000002').role,'USER');
 gate.abort(1);
 assert.equal(adminStore.changeRole(actor,'CL000002','GUEST').changed,true);
});
test('reset aborted if target status/role changes while asynchronous Argon2id computes',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 const {sessions,adminStore}=await ready(f),actor=await token(sessions,'CL000001');
 const previous=metadata(f,'CL000002').password_hash;
 const pending=adminStore.resetPassword(actor,'CL000002','NEW_FICTIONAL_password_2026$');
 f.db.prepare("UPDATE client_accounts SET role='GUEST' WHERE client_id='CL000002'").run();
 await assert.rejects(()=>pending,/AUTH21_STALE_ACCOUNT/);
 assert.equal(metadata(f,'CL000002').password_hash,previous);
});
test('reset aborted when ADMIN actor loses privileges during async Argon2id',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','ADMIN');
 const {sessions,adminStore}=await ready(f),actor=await token(sessions,'CL000001');
 const before=metadata(f,'CL000002').password_hash;
 const pending=adminStore.resetPassword(actor,'CL000002','NEW_FICTIONAL_password_2026$');
 f.db.prepare("UPDATE client_accounts SET role='USER' WHERE client_id='CL000001'").run();
 await assert.rejects(()=>pending,/AUTH21_ADMIN_FORBIDDEN/);
 assert.equal(metadata(f,'CL000002').password_hash,before);
 assert.equal(count(f),1);
});
test('audit failure rolls back role mutation and preserves ADMIN session',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 const {sessions,adminStore}=await ready(f),actor=await token(sessions,'CL000001'),user=await token(sessions,'CL000002');
 f.db.exec("CREATE TRIGGER stop_admin_audit BEFORE INSERT ON client_security_audit WHEN NEW.action='ADMIN_ROLE_CHANGED' BEGIN SELECT RAISE(ABORT,'ADMIN_AUDIT_FAILURE'); END;");
 assert.throws(()=>adminStore.changeRole(actor,'CL000002','GUEST'),/ADMIN_AUDIT_FAILURE/);
 assert.equal(metadata(f,'CL000002').role,'USER');
 assert.ok(sessions.verifySession(user));
});


test('INSERT OR REPLACE into last ADMIN account cannot bypass DELETE triggers',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 await migrateFixture(f.db,{fixtureRoot:f.root});
 // Same clientId and a role downgrade: REPLACE uses implicit DELETE.
 const src=f.db.prepare('SELECT * FROM client_accounts WHERE client_id=?').get('CL000001');
 assert.throws(()=>f.db.prepare([
  'INSERT OR REPLACE INTO client_accounts',
  '(client_id,username_enc,username_hash,password_salt,password_hash,',
  'password_iterations,role,enabled,created_at,updated_at,password_algo,password_params_json)',
  'VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'
 ].join(' ')).run(src.client_id,src.username_enc,src.username_hash,src.password_salt,
  src.password_hash,src.password_iterations,'USER',1,src.created_at,src.updated_at,
  src.password_algo,src.password_params_json),/LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.equal(count(f),1);
 assert.equal(metadata(f,'CL000001').role,'ADMIN');
});
test('username UNIQUE replacement of final ADMIN is blocked without deleting unrelated identity',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 await migrateFixture(f.db,{fixtureRoot:f.root});
 const a=f.db.prepare('SELECT * FROM client_accounts WHERE client_id=?').get('CL000001');
 assert.throws(()=>f.db.prepare([
  'INSERT OR REPLACE INTO client_accounts',
  '(client_id,username_enc,username_hash,password_salt,password_hash,',
  'password_iterations,role,enabled,created_at,updated_at,password_algo,password_params_json)',
  'VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'
 ].join(' ')).run('CL000002','OTHER_USERNAME',a.username_hash,a.password_salt,
  a.password_hash,180000,'USER',1,a.created_at,a.updated_at,'PBKDF2_SHA256','{}'),
 /LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.equal(count(f),1);
 assert.equal(metadata(f,'CL000001').role,'ADMIN');
 assert.equal(metadata(f,'CL000002').role,'USER');
});
test('INSERT OR REPLACE of final ADMIN parent client cannot cascade-delete account',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');await migrateFixture(f.db,{fixtureRoot:f.root});
 assert.throws(()=>f.db.prepare([
  'INSERT OR REPLACE INTO clients(client_id,external_ref_hash,status,created_at,updated_at)',
  'VALUES(?,?,?,?,?)'
 ].join(' ')).run('CL000001','DUPLICATE_REPLACEMENT','DISABLED','2026','2026'),
 /LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.equal(count(f),1);
 assert.equal(f.db.pragma('foreign_key_check').length,0);
});
test('UNIQUE external reference replacement of final ADMIN parent is blocked',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 await migrateFixture(f.db,{fixtureRoot:f.root});
 assert.throws(()=>f.db.prepare([
  'INSERT OR REPLACE INTO clients(client_id,external_ref_hash,status,created_at,updated_at)',
  'VALUES(?,?,?,?,?)'
 ].join(' ')).run('CL000003','FAKE_CL000001','ACTIVE','2026','2026'),
 /LAST_ACTIVE_ADMIN_REQUIRED/);
 assert.equal(count(f),1);
 assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM clients WHERE client_id='CL000003'").get().n,0);
});
test('missing replace guard triggers refuse manager initialization',async t=>{
 const f=setup(t);seed(f,'CL000001','ADMIN');await migrateFixture(f.db,{fixtureRoot:f.root});
 const sessions=new Auth21SessionStore({db:f.db,clientCrypto:f.clientCrypto,nowSeconds:()=>f.now});
 f.db.exec('DROP TRIGGER auth21_last_admin_account_replace');
 assert.throws(()=>new Auth21AdminStore({sessionStore:sessions,authorizeLocalOperator:()=>true}),/AUTH21_ADMIN_SQL_GUARD_MISSING/);
 await assert.rejects(()=>migrateFixture(f.db,{fixtureRoot:f.root}),/AUTH21_SCHEMA_PARTIAL/);
});

test('local OS operator gate rejects browser-like call, wrong UID, root and forged env',()=>{
 const {createLocalOperatorCheck}=require('../../Core/Clients/auth21_local_operator');
 const valid={allowedUid:1001,stdin:{isTTY:true,fd:0},
  processUid:()=>1001,ttyStat:()=>({uid:1001,isCharacterDevice:()=>true})};
 assert.equal(createLocalOperatorCheck(valid)(),true);
 assert.equal(createLocalOperatorCheck({...valid,stdin:{isTTY:false,fd:0}})(),false);
 assert.equal(createLocalOperatorCheck({...valid,processUid:()=>1002})(),false);
 assert.equal(createLocalOperatorCheck({...valid,ttyStat:()=>({uid:1002,isCharacterDevice:()=>true})})(),false);
 assert.equal(createLocalOperatorCheck({...valid,ttyStat:()=>({uid:1001,isCharacterDevice:()=>false})})(),false);
 assert.equal(createLocalOperatorCheck({...valid,ttyStat:()=>{throw Error('FAKE_TTY_FAILURE')}})(),false);
 assert.throws(()=>createLocalOperatorCheck({...valid,allowedUid:0}),/AUTH21_OPERATOR_UID_REQUIRED/);
});
test('local OS gate and ADMIN bearer BOTH required to mutate role',async t=>{
 const {createLocalOperatorCheck}=require('../../Core/Clients/auth21_local_operator');
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 const state={uid:1001,tty:true};
 const check=createLocalOperatorCheck({allowedUid:1001,
  stdin:{get isTTY(){return state.tty},fd:0},
  processUid:()=>state.uid,
  ttyStat:()=>({uid:1001,isCharacterDevice:()=>true})});
 const {sessions}=await ready(f,check);
 const admin=new Auth21AdminStore({sessionStore:sessions,authorizeLocalOperator:check});
 const bearer=await token(sessions,'CL000001');
 state.tty=false;
 assert.throws(()=>admin.changeRole(bearer,'CL000002','GUEST'),/AUTH21_LOCAL_OPERATOR_DENIED/);
 state.tty=true;state.uid=1002;
 assert.throws(()=>admin.changeRole(bearer,'CL000002','GUEST'),/AUTH21_LOCAL_OPERATOR_DENIED/);
 state.uid=1001;
 assert.equal(admin.changeRole(bearer,'CL000002','GUEST').changed,true);
 assert.equal(f.db.prepare("SELECT role FROM client_accounts WHERE client_id='CL000002'").get().role,'GUEST');
});

test('local ADMIN CLI dispatcher uses live ADMIN + OS gate, not forged command args',async t=>{
 const {dispatchLocalAdmin}=require('../../Core/Clients/auth21_admin_cli_dispatch');
 const {createLocalOperatorCheck}=require('../../Core/Clients/auth21_local_operator');
 const f=setup(t);seed(f,'CL000001','ADMIN');seed(f,'CL000002','USER');
 let uid=1001;
 const allowed=createLocalOperatorCheck({allowedUid:1001,stdin:{isTTY:true,fd:0},
  processUid:()=>uid,ttyStat:()=>({uid:1001,isCharacterDevice:()=>true})});
 const {sessions}=await ready(f,allowed);
 const store=new Auth21AdminStore({sessionStore:sessions,authorizeLocalOperator:allowed});
 const adminToken=await token(sessions,'CL000001');
 const call=(command,args=[])=>dispatchLocalAdmin({adminStore:store,adminToken,command,args});
 assert.equal(call('admin-count').activeAdmins,1);
 assert.equal(call('list').length,2);
 for(const [cmd,args] of [
  ['set-role',['CL000002','SUPERADMIN']],['set-role',['CL000002','ADMIN','extra']],
  ['remove-login',['CL000001','yes']],['reset-password',['CL000002','secret']],
  ['set-enabled',['CL000002','1']],['set-status',['CL000002','SUPERADMIN']]
 ])assert.throws(()=>call(cmd,args),/AUTH21_CLI_/);
 uid=1002;
 assert.throws(()=>call('set-role',['CL000002','GUEST']),/AUTH21_LOCAL_OPERATOR_DENIED/);
 uid=1001;
 assert.equal(call('set-role',['CL000002','GUEST']).changed,true);
 assert.equal(f.db.prepare("SELECT role FROM client_accounts WHERE client_id='CL000002'").get().role,'GUEST');
 assert.throws(()=>call('remove-login',['CL000001']),/LAST_ADMIN|LAST_ACTIVE_ADMIN/i);
});

test('iatb-users command parser rejects secrets in argv and unknown privilege operations',()=>{
 const {validateArgs}=require('../CLI/iatb-users');
 assert.deepEqual(validateArgs(['admin','CL000001','list']),{verb:'admin',rest:['CL000001','list']});
 assert.deepEqual(validateArgs(['migrate-v3']),{verb:'migrate-v3',rest:[]});
 assert.deepEqual(validateArgs(['create-first-admin']),{verb:'create-first-admin',rest:[]});
 for(const args of [
  ['migrate-v3','SECRET'],['create-first-admin','PASSWORD'],
  ['admin','CL000001','reset-password','SECRET'],
  ['admin','CL000001','set-role','CL000002','SUPERADMIN'],
  ['admin','CL000001','list','EXTRA'],['reset-everything']
 ])assert.throws(()=>validateArgs(args),/AUTH21_CLI_/);
});
test('iatb-users preflight rejects fixture without explicit marker and never mutates it',t=>{
 const {checkedFixture}=require('../CLI/iatb-users');
 const f=setup(t);seed(f,'CL000001','ADMIN');
 assert.throws(()=>checkedFixture(f.root),/ENOENT|AUTH21_CLI_MARKER_REQUIRED/);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM clients').get().n,1);
});
test('iatb-users preflight checks original key/database permissions and refuses unsafe copies',t=>{
 const {checkedFixture,MARKER,CONTENT}=require('../CLI/iatb-users');
 const f=setup(t);seed(f,'CL000001','ADMIN');
 fs.chmodSync(f.root,0o700);
 fs.writeFileSync(path.join(f.root,MARKER),CONTENT,{mode:0o600});
 fs.chmodSync(f.file,0o600);fs.chmodSync(f.keyFile,0o600);
 // Existing fixture key may be directly in root in these tests; CLI requires
 // a dedicated preexisting Security path, rather than copying the key.
 assert.throws(()=>checkedFixture(f.root),/ENOENT/);
 assert.equal(fs.existsSync(path.join(f.root,'Security','client_master.key')),false);
});
