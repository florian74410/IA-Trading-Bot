'use strict';
var fs=require('fs'),path=require('path');
function ensureDir(p){if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true});}
function cleanUser(x){x=String(x||'default').trim();x=x.replace(/[^A-Za-z0-9._-]/g,'_');return x||'default';}
function LocalRemoteStore(root){this.root=path.resolve(root);ensureDir(this.root);}
LocalRemoteStore.prototype.userDir=function(username){var p=path.join(this.root,'User Data',cleanUser(username));ensureDir(p);return p;};
LocalRemoteStore.prototype.dbPath=function(username){return path.join(this.userDir(username),'user_data.db');};
LocalRemoteStore.prototype.exists=function(username){return fs.existsSync(this.dbPath(username));};
LocalRemoteStore.prototype.pull=function(username,target){var src=this.dbPath(username);if(!fs.existsSync(src))return false;ensureDir(path.dirname(target));fs.copyFileSync(src,target);return true;};
LocalRemoteStore.prototype.push=function(username,source){if(!fs.existsSync(source))throw new Error('USER_DATA_DB_MISSING');var dst=this.dbPath(username),tmp=dst+'.tmp';fs.copyFileSync(source,tmp);fs.renameSync(tmp,dst);return dst;};
module.exports={LocalRemoteStore:LocalRemoteStore,cleanUser:cleanUser};
