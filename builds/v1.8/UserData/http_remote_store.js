'use strict';
var fs=require('fs'),path=require('path'),child=require('child_process'),auth=require('./server_auth'),cleanUser=require('./local_remote_store').cleanUser;
function ensureDir(p){if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true});}
function HttpRemoteStore(baseUrl){this.baseUrl=String(baseUrl||'http://127.0.0.1:8020').replace(/\/$/,'');}
HttpRemoteStore.prototype.url=function(username){return this.baseUrl+'/User%20Data/'+encodeURIComponent(cleanUser(username))+'/user_data.db';};
HttpRemoteStore.prototype._curl=function(args){return child.execFileSync('/usr/bin/curl',args,{stdio:['ignore','pipe','pipe'],maxBuffer:70*1024*1024});};
HttpRemoteStore.prototype.exists=function(username){try{this._curl(['-sS','-f','-I','-H','X-IATB-UserData-Token: '+auth.token(),this.url(username)]);return true;}catch(e){return false;}};
HttpRemoteStore.prototype.pull=function(username,target){try{ensureDir(path.dirname(target));var tmp=target+'.download';this._curl(['-sS','-f','--connect-timeout','2','--max-time','20','-H','X-IATB-UserData-Token: '+auth.token(),'-o',tmp,this.url(username)]);fs.renameSync(tmp,target);return true;}catch(e){try{fs.unlinkSync(target+'.download');}catch(x){}return false;}};
HttpRemoteStore.prototype.push=function(username,source){if(!fs.existsSync(source))throw new Error('USER_DATA_DB_MISSING');this._curl(['-sS','-f','--connect-timeout','2','--max-time','30','-X','PUT','-H','X-IATB-UserData-Token: '+auth.token(),'--data-binary','@'+source,this.url(username)]);return this.url(username);};
HttpRemoteStore.prototype.dbPath=function(username){return this.url(username);};
module.exports=HttpRemoteStore;
