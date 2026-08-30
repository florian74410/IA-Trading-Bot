'use strict';
var fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
function ensureDir(p){if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true});}
function keyPath(){return process.env.IATB_MASTER_KEY_FILE||path.join(os.homedir(),'.ia-trading-bot','master.key');}
function loadKey(){var p=keyPath();if(fs.existsSync(p)){var b=fs.readFileSync(p);if(b.length!==32)throw new Error('INVALID_MASTER_KEY');return b;}ensureDir(path.dirname(p));var k=crypto.randomBytes(32);fs.writeFileSync(p,k,{mode:0o600});try{fs.chmodSync(p,0o600);}catch(e){}return k;}
function encrypt(value){var key=loadKey(),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),plain=Buffer.from(JSON.stringify(value),'utf8'),enc=Buffer.concat([cipher.update(plain),cipher.final()]),tag=cipher.getAuthTag();return JSON.stringify({v:1,alg:'AES-256-GCM',iv:iv.toString('base64'),tag:tag.toString('base64'),data:enc.toString('base64')});}
function decrypt(payload){var x=typeof payload==='string'?JSON.parse(payload):payload;if(!x||x.v!==1)throw new Error('INVALID_VAULT_PAYLOAD');var d=crypto.createDecipheriv('aes-256-gcm',loadKey(),Buffer.from(x.iv,'base64'));d.setAuthTag(Buffer.from(x.tag,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(x.data,'base64')),d.final()]).toString('utf8'));}
module.exports={encrypt:encrypt,decrypt:decrypt,keyPath:keyPath};
