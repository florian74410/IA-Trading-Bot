'use strict';
var Client=require('./memory_client'),cleanUser=require('./local_remote_store').cleanUser;
function UserDataService(root,opt){opt=opt||{};this.root=root;this.username=cleanUser(opt.username||process.env.IATB_USERNAME||'default');this.client=new Client({username:this.username,port:opt.port});this.cache=this.client.cache;}
UserDataService.prototype.bootstrap=function(cb){var self=this;this.client.load(function(e,c){if(!e)self.cache=c;if(cb)return cb(e,self.status());if(e)throw e;});return this.status();};
UserDataService.prototype.getSetting=function(scope,key,def){return this.client.getSetting(scope,key,def);};
UserDataService.prototype.setSetting=function(scope,key,value,cb){return this.client.setSetting(scope,key,value,cb);};
UserDataService.prototype.getCredential=function(provider,scope,cb){return this.client.getCredential(provider,scope,cb);};
UserDataService.prototype.setCredential=function(provider,scope,value,cb){return this.client.setCredential(provider,scope,value,cb);};
UserDataService.prototype.saveStrategy=function(name,definition,meta,cb){return this.client.setStrategy(name,definition,meta,cb);};
UserDataService.prototype.getStrategy=function(name){return this.client.getStrategy(name);};
UserDataService.prototype.renameUser=function(username,cb){this.username=cleanUser(username);this.client.username=this.username;return this.client.load(cb||function(){});};
UserDataService.prototype.status=function(){return{ok:!!this.client.cache.loaded,schema:1,username:this.username,storage:'REMOTE_SQLITE_MEMORY_CLIENT',dbLocal:false,dbLocation:this.client.cache.dbLocation||null,loadedAt:this.client.cache.loadedAt||null};};
UserDataService.prototype.close=function(){};
module.exports=UserDataService;
