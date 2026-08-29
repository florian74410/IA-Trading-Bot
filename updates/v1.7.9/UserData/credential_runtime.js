'use strict';
var fs=require('fs'),path=require('path'),crypto=require('crypto');
var active=null;
function pairForLegacy(name){
 name=String(name||'').trim().toUpperCase();
 if(name==='OPENAI_API_KEY')return{provider:'OPENAI',scope:'API_KEY'};
 if(name==='X_BEARER_TOKEN')return{provider:'X',scope:'BEARER_TOKEN'};
 var suffixes=['BEARER_TOKEN','API_SECRET','SECRET_KEY','API_KEY','PASSPHRASE','SECRET','TOKEN'];
 for(var i=0;i<suffixes.length;i++){var suf=suffixes[i],mark='_'+suf;if(name.length>mark.length&&name.slice(-mark.length)===mark){var provider=name.slice(0,-mark.length);if(/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(provider))return{provider:provider,scope:suf};}}
 return{provider:'LEGACY',scope:name.replace(/[^A-Z0-9._-]/g,'_').slice(0,64)||'UNKNOWN'};
}
function keyOf(provider,scope){return String(provider).toUpperCase()+':'+String(scope).toUpperCase();}
function promiseCall(fn){return new Promise(function(resolve,reject){fn(function(e,r){if(e)reject(e);else resolve(r);});});}
function deriveKey(password,salt,iterations){return crypto.pbkdf2Sync(String(password),Buffer.from(salt,'base64'),iterations||180000,32,'sha256');}
function unwrapPrivateKey(env,password){var key=deriveKey(password,env.salt,env.iterations||180000),d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(env.iv,'base64'));d.setAuthTag(Buffer.from(env.tag,'base64'));return Buffer.concat([d.update(Buffer.from(env.data,'base64')),d.final()]).toString('utf8');}
function rsaDecrypt(value,privateKey){return crypto.privateDecrypt({key:privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(value,'base64')).toString('utf8');}
function Runtime(ctx,queue){this.root=path.resolve(ctx.root);this.client=ctx.client;this.queue=typeof queue==='function'?queue:function(p){return p;};this.values=Object.create(null);this.configured=Object.create(null);this.ready=false;}
Runtime.prototype.preload=async function(){var self=this,keys=Object.keys(this.client.cache.credentials||{});for(var i=0;i<keys.length;i++){var parts=keys[i].split(':'),provider=parts.shift(),scope=parts.join(':');try{var value=await promiseCall(function(cb){self.client.getCredential(provider,scope,cb);});self.values[keyOf(provider,scope)]=value;self.configured[keyOf(provider,scope)]=String(value||'').length>0;}catch(e){if(e&&e.statusCode!==404)throw e;}}this.ready=true;return this;};
Runtime.prototype.attachClient=async function(client){this.client=client;this.values=Object.create(null);this.configured=Object.create(null);return this.preload();};
Runtime.prototype.get=function(provider,scope){var k=keyOf(provider,scope);return Object.prototype.hasOwnProperty.call(this.values,k)?this.values[k]:'';};
Runtime.prototype.isConfigured=function(provider,scope){return !!this.configured[keyOf(provider,scope)];};
Runtime.prototype.set=function(provider,scope,value){var self=this,p=String(provider).toUpperCase(),s=String(scope).toUpperCase(),k=keyOf(p,s),v=value==null?'':String(value);this.values[k]=v;this.configured[k]=v.length>0;var pr=promiseCall(function(cb){self.client.setCredential(p,s,v,cb);});return this.queue(pr);};
Runtime.prototype.getLegacy=function(name){var x=pairForLegacy(name);return this.get(x.provider,x.scope);};
Runtime.prototype.saveLegacy=function(values){var self=this,jobs=[];Object.keys(values||{}).forEach(function(name){var x=pairForLegacy(name),v=values[name];if(v==='__CLEAR__')v='';if(v==null||String(v).trim()==='')return jobs.push(self.set(x.provider,x.scope,''));jobs.push(self.set(x.provider,x.scope,String(v).trim()));});return jobs;};
Runtime.prototype.legacyStatus=function(){return{openai:this.isConfigured('OPENAI','API_KEY'),x:this.isConfigured('X','BEARER_TOKEN')};};
Runtime.prototype.migrateLegacy=function(password){var self=this,legacyName=['secrets','v2.dat'].join('_'),p=path.join(this.root,legacyName);if(!fs.existsSync(p))return'VAULT_SQLITE';var raw=JSON.parse(fs.readFileSync(p,'utf8'));if(!raw||!raw.privateKeyEnvelope||!raw.secrets)throw new Error('LEGACY_VAULT_INVALID');var privateKey=unwrapPrivateKey(raw.privateKeyEnvelope,password),jobs=[];Object.keys(raw.secrets).forEach(function(name){var clear=rsaDecrypt(raw.secrets[name],privateKey),x=pairForLegacy(name);self.values[keyOf(x.provider,x.scope)]=clear;self.configured[keyOf(x.provider,x.scope)]=!!clear;jobs.push(promiseCall(function(cb){self.client.setCredential(x.provider,x.scope,clear,cb);}));});var done=Promise.all(jobs).then(function(){try{fs.unlinkSync(p);}catch(e){if(e.code!=='ENOENT')throw e;}return true;});this.queue(done);return'VAULT_SQLITE';};
Runtime.prototype.exchange=function(provider,scope){return this.get(provider,scope);};
async function initialize(ctx,queue){active=new Runtime(ctx,queue);await active.preload();return active;}
function current(){if(!active)throw new Error('CREDENTIAL_RUNTIME_NOT_READY');return active;}
module.exports={initialize:initialize,current:current,pairForLegacy:pairForLegacy};
