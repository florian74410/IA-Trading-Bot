'use strict';
var fs=require('fs'),path=require('path'),child=require('child_process');

function q(v){return "'"+String(v==null?'':v).replace(/'/g,"''")+"'";}
function rows(text){
  if(!text)return[];
  return String(text).split(/\r?\n/).filter(Boolean).map(function(line){
    var c=line.split('\t');
    return c;
  });
}
function ClientRepository(opts){
  opts=opts||{};
  this.dbPath=path.resolve(opts.dbPath);
  this.sqlite=opts.sqlite||process.env.IATB_SQLITE_BIN||'sqlite3';
  this.migrationsDir=path.resolve(opts.migrationsDir);
  this.ready=false;this.lastError=null;this.schemaVersion=0;
  this.init();
}
ClientRepository.prototype.run=function(sql,read){
  var dir=path.dirname(this.dbPath);
  try{if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true,mode:448});fs.chmodSync(dir,448);}catch(e){}
  var pre='.timeout 5000\nPRAGMA foreign_keys=ON;\n';
  var args=read?['-batch','-noheader','-separator','\t',this.dbPath]:['-batch',this.dbPath];
  var r=child.spawnSync(this.sqlite,args,{input:pre+String(sql||''),encoding:'utf8',timeout:7000,maxBuffer:2*1024*1024});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(String(r.stderr||'CLIENT_SQLITE_ERROR').trim());
  try{if(fs.existsSync(this.dbPath))fs.chmodSync(this.dbPath,384);}catch(e){}
  return String(r.stdout||'');
};
ClientRepository.prototype.init=function(){
  try{
    this.run('PRAGMA journal_mode=DELETE; CREATE TABLE IF NOT EXISTS client_schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL);');
    var files=fs.readdirSync(this.migrationsDir).filter(function(x){return /^\d+_.*\.sql$/.test(x);}).sort();
    for(var i=0;i<files.length;i++){
      var m=/^(\d+)_/.exec(files[i]),v=+(m&&m[1]||0);
      var done=this.run('SELECT version FROM client_schema_migrations WHERE version='+v+' LIMIT 1;',true).trim();
      if(!done)this.run(fs.readFileSync(path.join(this.migrationsDir,files[i]),'utf8'));
    }
    var sv=this.run('SELECT COALESCE(MAX(version),0) FROM client_schema_migrations;',true).trim();
    this.schemaVersion=+sv||0;this.ready=true;this.lastError=null;
  }catch(e){this.ready=false;this.lastError=String(e&&e.message||e);}
};
ClientRepository.prototype.assertReady=function(){if(!this.ready)throw new Error('CLIENT_DB_UNAVAILABLE: '+(this.lastError||'unknown'));};
ClientRepository.prototype.nextClientId=function(){
  this.assertReady();
  var out=this.run("SELECT client_id FROM clients WHERE client_id GLOB 'CL[0-9]*' ORDER BY CAST(SUBSTR(client_id,3) AS INTEGER) DESC LIMIT 1;",true).trim();
  var n=out?parseInt(out.slice(2),10)+1:1;
  if(!isFinite(n)||n<1)n=1;
  return'CL'+String(n).padStart(6,'0');
};
ClientRepository.prototype.byId=function(id){
  this.assertReady();
  var r=rows(this.run('SELECT client_id,external_ref_hash,first_name_enc,last_name_enc,email_enc,email_hash,status,security_version,created_at,updated_at FROM clients WHERE client_id='+q(id)+' LIMIT 1;',true))[0];
  return r?{clientId:r[0],externalRefHash:r[1],firstNameEnc:r[2],lastNameEnc:r[3],emailEnc:r[4],emailHash:r[5],status:r[6],securityVersion:+r[7]||1,createdAt:r[8],updatedAt:r[9]}:null;
};
ClientRepository.prototype.byExternalHash=function(hash){
  this.assertReady();
  var id=this.run('SELECT client_id FROM clients WHERE external_ref_hash='+q(hash)+' LIMIT 1;',true).trim();
  return id?this.byId(id):null;
};
ClientRepository.prototype.byEmailHash=function(hash){
  this.assertReady();if(!hash)return null;
  var id=this.run('SELECT client_id FROM clients WHERE email_hash='+q(hash)+' LIMIT 1;',true).trim();
  return id?this.byId(id):null;
};
ClientRepository.prototype.insert=function(x){
  this.assertReady();
  this.run('INSERT INTO clients(client_id,external_ref_hash,first_name_enc,last_name_enc,email_enc,email_hash,status,security_version,created_at,updated_at) VALUES('+[x.clientId,x.externalRefHash,x.firstNameEnc,x.lastNameEnc,x.emailEnc,x.emailHash||null,x.status||'ACTIVE',x.securityVersion||1,x.createdAt,x.updatedAt].map(function(v,i){return i===7?String(+v||1):(v===null?'NULL':q(v));}).join(',')+');');
  return this.byId(x.clientId);
};
ClientRepository.prototype.updateIdentity=function(id,x){
  this.assertReady();
  this.run('UPDATE clients SET first_name_enc='+q(x.firstNameEnc)+',last_name_enc='+q(x.lastNameEnc)+',email_enc='+q(x.emailEnc)+',email_hash='+(x.emailHash?q(x.emailHash):'NULL')+',updated_at='+q(x.updatedAt)+' WHERE client_id='+q(id)+';');
  return this.byId(id);
};
ClientRepository.prototype.list=function(){
  this.assertReady();
  var ids=this.run('SELECT client_id FROM clients ORDER BY created_at;',true).split(/\r?\n/).filter(Boolean),self=this;
  return ids.map(function(id){return self.byId(id);}).filter(Boolean);
};
ClientRepository.prototype.linkWallet=function(clientId,walletId){
  this.assertReady();
  this.run('INSERT OR IGNORE INTO client_wallets(client_id,wallet_id,created_at) VALUES('+q(clientId)+','+q(walletId)+','+q(new Date().toISOString())+');');
};
ClientRepository.prototype.archiveWallet=function(clientId,walletId){
  this.assertReady();
  this.run('UPDATE client_wallets SET archived_at='+q(new Date().toISOString())+' WHERE client_id='+q(clientId)+' AND wallet_id='+q(walletId)+';');
};
ClientRepository.prototype.walletIds=function(clientId,includeArchived){
  this.assertReady();
  return this.run('SELECT wallet_id FROM client_wallets WHERE client_id='+q(clientId)+(includeArchived?'':' AND archived_at IS NULL')+' ORDER BY created_at;',true).split(/\r?\n/).filter(Boolean);
};
ClientRepository.prototype.audit=function(clientId,action,subjectId,detailsEnc){
  this.assertReady();
  this.run('INSERT INTO client_audit(client_id,action,subject_id,created_at,details_enc) VALUES('+(clientId?q(clientId):'NULL')+','+q(action)+','+(subjectId?q(subjectId):'NULL')+','+q(new Date().toISOString())+','+q(detailsEnc||'')+');');
};
ClientRepository.prototype.status=function(){return{ready:this.ready,dbPath:this.dbPath,schemaVersion:this.schemaVersion,backend:'sqlite3-cli',lastError:this.lastError};};
module.exports=ClientRepository;
