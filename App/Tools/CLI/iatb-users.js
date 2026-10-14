#!/usr/bin/env node
'use strict';
/* iatb-users Auth 2.1 — OFFLINE FIXTURE-ONLY developer executable.
 * Deliberately refuses any real Core database, non-TTY, root operator or
 * absence of fixture marker. Never run on GEN-1 or expose through HTTP.
 * Secrets are prompted on TTY, never argv/env/logs. No auto-migration.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const Database=require('better-sqlite3');
const ClientCrypto=require('../../Core/Clients/client_crypto');
const {migrateFixture}=require('../CI/auth21_v3_migration_trial');
const {Auth21SessionStore}=require('../../Core/Clients/auth21_session_store');
const {Auth21AdminStore}=require('../../Core/Clients/auth21_admin_store');
const {Auth21FirstAdminTrial}=require('../../Core/Clients/auth21_first_admin_trial');
const {createLocalOperatorCheck}=require('../../Core/Clients/auth21_local_operator');
const {dispatchLocalAdmin,ACTIONS}=require('../../Core/Clients/auth21_admin_cli_dispatch');
const MARKER='.iatb-users-fictional-only',CONTENT='IATB_AUTH21_OFFLINE_FIXTURE_ONLY\n';

function validateArgs(argv){
 const [verb,...rest]=argv;
 if(verb==='migrate-v3'||verb==='create-first-admin'||verb==='review-debug'){
  if(rest.length)throw Error('AUTH21_CLI_ARGUMENT_INVALID');
 }else if(verb==='admin'){
  if(rest.length<2)throw Error('AUTH21_CLI_COMMAND_INVALID');
  const [_,action,...args]=rest;
  if(!/^CL[A-Za-z0-9_-]{1,64}$/.test(rest[0])||!Object.hasOwn(ACTIONS,action)||
     args.length!==ACTIONS[action]||args.some(v=>typeof v!=='string'||v.length>64))
   throw Error('AUTH21_CLI_ARGUMENT_INVALID');
  if(action==='set-role'&&!['ADMIN','USER','GUEST'].includes(args[1]))throw Error('AUTH21_CLI_ROLE_INVALID');
  if(action==='set-enabled'&&!['true','false'].includes(args[1]))throw Error('AUTH21_CLI_BOOLEAN_INVALID');
  if(action==='set-status'&&!['ACTIVE','DISABLED'].includes(args[1]))throw Error('AUTH21_CLI_STATUS_INVALID');
  if(args.length&&!/^CL[A-Za-z0-9_-]{1,64}$/.test(args[0]))throw Error('AUTH21_CLI_CLIENT_ID_INVALID');
 }else throw Error('AUTH21_CLI_COMMAND_INVALID');
 return {verb,rest};
}
function checkedFixture(root){
 if(typeof root!=='string'||!path.isAbsolute(root))throw Error('AUTH21_CLI_FIXTURE_ONLY');
 const canonical=fs.realpathSync(root),tmp=fs.realpathSync(os.tmpdir());
 if(canonical!==path.resolve(root)||!canonical.startsWith(tmp+path.sep)||
    !path.basename(canonical).startsWith('iatb-auth21-v3-'))throw Error('AUTH21_CLI_FIXTURE_ONLY');
 const st=fs.lstatSync(canonical);
 if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o777)!==0o700||
    (process.getuid&&st.uid!==process.getuid()))throw Error('AUTH21_CLI_FIXTURE_UNSAFE');
 const marker=path.join(canonical,MARKER),m=fs.lstatSync(marker);
 if(!m.isFile()||m.isSymbolicLink()||(m.mode&0o777)!==0o600||
    fs.readFileSync(marker,'utf8')!==CONTENT)throw Error('AUTH21_CLI_MARKER_REQUIRED');
 const dbFile=path.join(canonical,'clients-fixture.sqlite');
 const keyFile=path.join(canonical,'Security','client_master.key');
 for(const f of [dbFile,keyFile]){
  const s=fs.lstatSync(f);
  if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o777)!==0||
     fs.realpathSync(f)!==f||s.uid!==st.uid)throw Error('AUTH21_CLI_FILE_UNSAFE');
 }
 return {root:canonical,dbFile,keyFile,uid:st.uid};
}
function requireOperator(f){
 const check=createLocalOperatorCheck({allowedUid:f.uid});
 if(!check())throw Error('AUTH21_LOCAL_OPERATOR_DENIED');
 return check;
}
// No password characters are echoed. Ctrl-C aborts without creating a login.
// Only the CLI running in a real interactive OS terminal can use this.
async function secretPrompt(label,{min=1,max=1024}={}){
 if(!process.stdin.isTTY||typeof process.stdin.setRawMode!=='function')
  throw Error('AUTH21_CLI_TTY_REQUIRED');
 process.stdout.write(label+': ');
 return new Promise((resolve,reject)=>{
  let value='',settled=false;
  const input=process.stdin;
  const oldRaw=input.isRaw;
  const end=(error)=>{
   if(settled)return;settled=true;
   input.off('data',onData);
   try{input.setRawMode(Boolean(oldRaw))}catch(_){}
   input.pause();process.stdout.write('\n');
   if(error)reject(error);else resolve(value);
  };
  const onData=buf=>{
   for(const code of buf){
    if(code===3||code===4){end(Error('AUTH21_CLI_CANCELLED'));return}
    if(code===13||code===10){if(value.length<min)end(Error('AUTH21_CLI_EMPTY_INPUT'));else end();return}
    if(code===127||code===8){value=value.slice(0,-1);continue}
    if(code<32||code>126)continue;
    if(value.length>=max){end(Error('AUTH21_CLI_INPUT_TOO_LONG'));return}
    value+=String.fromCharCode(code);
   }
  };
  try{input.setRawMode(true);input.resume();input.on('data',onData)}
  catch(error){end(error)}
 });
}
function print(result){process.stdout.write(JSON.stringify(result)+'\n')}
async function execute(argv,fixtureRoot){
 const parsed=validateArgs(argv),f=checkedFixture(fixtureRoot),operator=requireOperator(f);
 const cipher=new ClientCrypto(f.keyFile,{clientDbPath:f.dbFile});
 const db=new Database(f.dbFile,{fileMustExist:true});
 try{
  db.pragma('foreign_keys=ON');
  if(db.pragma('integrity_check',{simple:true})!=='ok'||db.pragma('foreign_key_check').length)
   throw Error('AUTH21_CLI_DB_INTEGRITY');
  if(parsed.verb==='migrate-v3'){
   const consent=await secretPrompt('Type MIGRATE V3 FIXTURE');
   if(consent!=='MIGRATE V3 FIXTURE')throw Error('AUTH21_CLI_CONFIRMATION_REQUIRED');
   if(!operator())throw Error('AUTH21_LOCAL_OPERATOR_DENIED');
   const out=await migrateFixture(db,{fixtureRoot:f.root});
   return {version:out.version,applied:out.applied,backedUp:!!out.backupFile};
  }
  if(parsed.verb==='create-first-admin'||parsed.verb==='review-debug'){
   const boot=new Auth21FirstAdminTrial({db,fixtureRoot:f.root,clientCrypto:cipher,
    authorizeLocalOperator:operator});
   if(parsed.verb==='review-debug')return boot.review();
   const firstName=await secretPrompt('First name',{max:80});
   const lastName=await secretPrompt('Last name',{max:80});
   const email=await secretPrompt('Email',{max:254});
   const username=await secretPrompt('Username',{max:64});
   const password=await secretPrompt('New ADMIN password');
   const confirm=await secretPrompt('Confirm ADMIN password');
   if(password!==confirm)throw Error('AUTH21_CLI_PASSWORD_MISMATCH');
   const consent=await secretPrompt('Type CREATE FIRST ADMIN ON FIXTURE',{max:40});
   if(!operator())throw Error('AUTH21_LOCAL_OPERATOR_DENIED');
   const outcome=await boot.createFirstAdmin({
    identity:{firstName,lastName,email},username,password,confirmation:consent
   });
   // No password/session/client identity ciphertext in results.
   return {created:true,role:'ADMIN',clientId:outcome.clientId};
  }
  const [adminId,action,...args]=parsed.rest;
  const password=await secretPrompt('ADMIN password');
  if(!operator())throw Error('AUTH21_LOCAL_OPERATOR_DENIED');
  const sessions=new Auth21SessionStore({db,clientCrypto:cipher});
  const login=await sessions.loginWithPassword(adminId,password);
  if(!login||login.role!=='ADMIN')throw Error('AUTH21_CLI_ADMIN_DENIED');
  try{
   const manager=new Auth21AdminStore({sessionStore:sessions,authorizeLocalOperator:operator});
   return dispatchLocalAdmin({adminStore:manager,adminToken:login.token,command:action,args});
  }finally{sessions.revokeSession(login.token)}
 }finally{db.close()}
}
async function main(){
 try{
  const result=await execute(process.argv.slice(2),process.env.IATB_AUTH21_CLI_FIXTURE_ROOT);
  print(result);
 }catch(error){
  // No stack, passwords, OS paths or access tokens in CLI stderr.
  const code=typeof error.message==='string'&&/^AUTH21_[A-Z0-9_]+$/.test(error.message)
   ?error.message:'AUTH21_CLI_FAILED';
  process.stderr.write(code+'\n');
  process.exitCode=1;
 }
}
if(require.main===module)main();
module.exports={validateArgs,checkedFixture,execute,MARKER,CONTENT};
