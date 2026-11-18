'use strict';
const fs=require('node:fs'),path=require('node:path'),Database=require('better-sqlite3');
async function create(root){
 const app=path.resolve(__dirname,'../../..');fs.mkdirSync(path.join(root,'Security'),{recursive:true});fs.mkdirSync(path.join(root,'Database'),{recursive:true});
 const file=path.join(root,'Database/clients.sqlite'),key=path.join(root,'Security/client_master.key'),cipher=new(require('../../../Core/Clients/client_crypto'))(key,{clientDbPath:file}),db=new Database(file);db.pragma('foreign_keys=ON');
 for(const f of ['001_clients_v1.sql','002_client_accounts_v1.sql'])db.exec(fs.readFileSync(path.join(app,'Core/Clients/migrations',f),'utf8'));
 await require('../../../Core/Clients/UserManagement/migration').migrate(db,{backupFile:file+'.backup',keyFile:key,confirm:'MIGRATE USER MANAGEMENT V1'});
 const password='Fictional simulator password 2026!',prompts=['Admin','Fixture','admin@example.invalid','ADMIN',password,password,'CREATE FIRST ADMIN'];
 await require('../../../Core/Clients/UserManagement/cli').run(['create-first-admin'],{env:{IATB_DATA_ROOT:root},check:()=>true,prompt:async()=>prompts.shift()});
 let clock=Math.floor(Date.now()/1000);const sessions=new(require('../../../Core/Clients/UserManagement/store').UserStore)({db,clientCrypto:cipher,nowSeconds:()=>clock}),admin=await sessions.loginEmail('admin@example.invalid',password),manager=new(require('../../../Core/Clients/auth21_admin_store').Auth21AdminStore)({sessionStore:sessions,authorizeLocalOperator:()=>true}),tokens={admin:admin.token};
 for(const name of ['alice','bob']){await manager.createAccount(admin.token,{firstName:name,lastName:'Fixture',email:name+'@example.invalid',username:name,password,role:'USER'});const login=await sessions.loginEmail(name+'@example.invalid',password);tokens[name]=(await sessions.loginWithPassword(login.clientId,password,{ttlSeconds:43200})).token;}
 return {sessions,tokens,advance:n=>clock+=n,close:()=>db.close()};
}
module.exports={create};
