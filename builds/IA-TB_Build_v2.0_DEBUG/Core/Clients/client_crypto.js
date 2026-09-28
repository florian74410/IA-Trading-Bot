'use strict';
var fs=require('fs'),path=require('path'),crypto=require('crypto');

function ensureDir(dir){
  if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true,mode:448});
  try{fs.chmodSync(dir,448);}catch(e){}
}
function ClientCrypto(keyFile){
  this.keyFile=path.resolve(keyFile);
  ensureDir(path.dirname(this.keyFile));
  this.master=this._loadKey();
  this.indexKey=crypto.createHash('sha256').update(this.master).update('IA-TB_CLIENT_INDEX_V1').digest();
}
ClientCrypto.prototype._loadKey=function(){
  var k;
  try{k=Buffer.from(String(fs.readFileSync(this.keyFile,'utf8')).trim(),'hex');if(k.length===32)return k;}catch(e){}
  k=crypto.randomBytes(32);
  try{fs.writeFileSync(this.keyFile,k.toString('hex'),{encoding:'utf8',mode:384,flag:'wx'});}catch(e){
    try{k=Buffer.from(String(fs.readFileSync(this.keyFile,'utf8')).trim(),'hex');}catch(x){}
  }
  if(!k||k.length!==32)throw new Error('CLIENT_MASTER_KEY_UNAVAILABLE');
  try{fs.chmodSync(this.keyFile,384);}catch(e){}
  return k;
};
ClientCrypto.prototype.seal=function(value){
  var text=String(value==null?'':value);
  if(!text)return'';
  var iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',this.master,iv);
  var data=Buffer.concat([c.update(Buffer.from(text,'utf8')),c.final()]);
  var env={v:1,alg:'AES-256-GCM',iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:data.toString('base64')};
  return Buffer.from(JSON.stringify(env),'utf8').toString('base64');
};
ClientCrypto.prototype.open=function(value){
  if(!value)return'';
  var env=JSON.parse(Buffer.from(String(value),'base64').toString('utf8'));
  if(env.v!==1||env.alg!=='AES-256-GCM')throw new Error('CLIENT_ENVELOPE_UNSUPPORTED');
  var d=crypto.createDecipheriv('aes-256-gcm',this.master,Buffer.from(env.iv,'base64'));
  d.setAuthTag(Buffer.from(env.tag,'base64'));
  return Buffer.concat([d.update(Buffer.from(env.data,'base64')),d.final()]).toString('utf8');
};
ClientCrypto.prototype.lookupHash=function(value){
  var s=String(value==null?'':value).trim().toLowerCase();
  if(!s)return'';
  return crypto.createHmac('sha256',this.indexKey).update(s).digest('hex');
};
ClientCrypto.prototype.externalHash=function(value){
  var s=String(value==null?'':value).trim().toLowerCase()||'local-admin';
  return crypto.createHmac('sha256',this.indexKey).update('external:'+s).digest('hex');
};
module.exports=ClientCrypto;
