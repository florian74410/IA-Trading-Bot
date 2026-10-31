'use strict';
/* IA-TB Component CP/1 Adapter v2.0
   Shared backend-only adapter used to normalize local Engines/Modules behind Router.
   - authenticates Router calls with CP token + HMAC signature
   - validates actions/arguments with the shared CP/1 contract
   - normalizes every response through CP.makeResponse
   - registers capabilities dynamically with Communication Router
   - never exposes arbitrary shell/path/URL execution
   Node.js 16 compatible, zero npm dependencies.
*/
var crypto=require('crypto'),CP=require('./communication_protocol_v1'),CPClient=require('./cp1_client');
function eq(a,b){a=String(a||'');b=String(b||'');if(!a||a.length!==b.length)return false;try{return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}catch(e){return false;}}
function read(req,max,cb){var a=[],n=0;max=max||524288;req.on('data',function(c){n+=c.length;if(n<=max)a.push(c);});req.on('end',function(){if(n>max)return cb(new Error('CP_BODY_TOO_LARGE'));cb(null,Buffer.concat(a));});req.on('error',cb);}
function send(res,code,o){var b=Buffer.from(JSON.stringify(o));res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(b);}
function addOperatorChannel(adapter){
 if(process.env.IATB_AUTH_MODE!=='authenticated'||!require('../Clients/UserManagement/operator_policy').policies[adapter.id])return;
 var wrapper=adapter.id+'.operator.request',receive=require('../Clients/UserManagement/owner_receiver').receiver({root:adapter.root,engine:adapter.id,operator:true,dispatch:function(principal,action,args){return new Promise(function(resolve,reject){var handler=adapter.handlers[action],registry=new (require('./protocol_registry_v2'))(require('path').resolve(__dirname,'../..')),argumentError=registry.validateActionArgs(adapter.id,action,args);if(argumentError)return reject(Error(argumentError));if(typeof handler!=='function')return reject(Error('OPERATOR_HANDLER_UNAVAILABLE'));function done(error,value){error?reject(error):resolve(value);}try{var output=handler(args,CP.makeRequest(adapter.id,action,args,'analysis'),done);if(output&&typeof output.then==='function')output.then(resolve,reject);else if(output!==undefined)resolve(output);}catch(error){reject(error);}});}});
 adapter.actions.push(wrapper);adapter.handlers[wrapper]=function(args){return receive(args);};
}
function Adapter(opt){opt=opt||{};this.root=opt.root;this.id=String(opt.id||'');this.label=String(opt.label||this.id);this.port=+opt.port||0;this.routerPort=+opt.routerPort||8021;this.cpPath=String(opt.cpPath||'/cp/v1');this.healthPath=String(opt.healthPath||'/health');this.version=String(opt.version||'');this.schema=String(opt.schema||this.id+'.response/1.0');this.actions=Array.isArray(opt.actions)?opt.actions.slice():[];this.events=Array.isArray(opt.events)?opt.events.slice():[];this.handlers=opt.handlers||{};addOperatorChannel(this);this.allowed=Object.create(null);for(var i=0;i<this.actions.length;i++)this.allowed[this.actions[i]]=1;this.client=new CPClient({root:this.root,routerPort:this.routerPort,timeout:3000});this.registrationHandle=null;}
Adapter.prototype.functionManifest=function(){
 var fs=require('fs'),path=require('path');
 var map={core:'Core',router:'Core/Router',supervisor:'Supervisor',marketdata:'MarketData',
 fundamental:'Fundamental',indicator:'Indicators',liquidity:'Liquidity',portfolio:'Portfolio',
 risk:'Risk',strategy:'Strategy',trading:'services/trading-engine',firewall:'Core/Firewall'};
 var folder=map[this.id];if(!folder)throw Error('FUNCTION_REGISTRY_UNKNOWN_ENGINE');
 var appRoot=path.resolve(__dirname,'../..');
 var file=path.join(appRoot,folder,'FunctionRegistry','Functions.json');
 var raw=fs.readFileSync(file,'utf8');if(Buffer.byteLength(raw)>1024*1024)throw Error('FUNCTION_REGISTRY_OVERSIZED');
 var catalog=JSON.parse(raw);if(catalog.engine_id!==this.id)throw Error('FUNCTION_REGISTRY_ENGINE_MISMATCH');
 return catalog;
};
Adapter.prototype.handleFunctionRegistry=function(req,res){
 var uri=String(req.url||'').split('?')[0];
 if(req.method!=='GET'||uri!==this.cpPath+'/functions')return false;
 var token=String(req.headers['x-iatb-cp-token']||'');
 if(!CP.verifyToken(this.root,token))return send(res,403,{ok:false,error:'CP_AUTH_INVALID'});
 try{send(res,200,{ok:true,manifest:this.functionManifest()});}
 catch(e){send(res,503,{ok:false,error:'FUNCTION_REGISTRY_UNAVAILABLE'});}
 return true;
};
Adapter.prototype.handle=function(req,res){var self=this;if(self.handleFunctionRegistry(req,res))return;if(req.method!=='POST')return false;var u=String(req.url||'').split('?')[0];if(u!==self.cpPath)return false;read(req,524288,function(er,raw){if(er)return send(res,413,{ok:false,error:er.message});var msg;try{msg=JSON.parse(raw.toString('utf8')||'{}');}catch(e){return send(res,400,{ok:false,error:'CP_JSON_INVALID'});}var token=String(req.headers['x-iatb-cp-token']||''),secret='';try{secret=CP.ensureSecret(self.root);}catch(e){}if(!CP.verifyToken(self.root,token))return send(res,403,{ok:false,error:'CP_AUTH_INVALID'});var sig=String(req.headers['x-iatb-cp-signature']||'');var expect=crypto.createHmac('sha256',secret).update(raw).digest('hex');if(!eq(sig,expect))return send(res,403,{ok:false,error:'CP_SIGNATURE_INVALID'});var v=CP.validateRequest(msg,self.allowed,Date.now());if(!v.ok)return send(res,400,{ok:false,error:v.errors[0],errors:v.errors});if(v.target!==self.id)return send(res,404,{ok:false,error:'CP_TARGET_INVALID'});if(process.env.IATB_AUTH_MODE==='authenticated'&&require('../Clients/UserManagement/operator_policy').permission(self.id,v.action))return send(res,403,{ok:false,error:'ADMIN_CAPABILITY_REQUIRED'});var fn=self.handlers[v.action];if(typeof fn!=='function')return send(res,400,CP.makeResponse(msg,'ERROR',{error:'CP_ACTION_HANDLER_MISSING'},{engine:self.id,action:v.action,schema:self.schema}));var started=Date.now(),done=false;function finish(err,data,status,warnings){if(done)return;done=true;if(err)return send(res,500,CP.makeResponse(msg,'ERROR',{error:String(err.message||err).slice(0,300)},{engine:self.id,action:v.action,schema:self.schema,duration_ms:Date.now()-started}));send(res,200,CP.makeResponse(msg,status||'OK',data==null?{}:data,{engine:self.id,action:v.action,schema:self.schema,duration_ms:Date.now()-started,warnings:warnings||[]}));}try{var r=fn(v.arguments||{},msg,finish);if(r&&typeof r.then==='function')r.then(function(x){finish(null,x);},finish);else if(r!==undefined)finish(null,r);}catch(e){finish(e);}});return true;};
Adapter.prototype.registrationDescriptor=function(){return{id:this.id,label:this.label,host:'127.0.0.1',port:this.port,cpPath:this.cpPath,healthPath:this.healthPath,version:this.version,schemaVersion:this.schema,capabilities:this.actions,events:this.events};};
Adapter.prototype.register=function(cb){this.client.register(this.registrationDescriptor(),function(e,o){if(cb)cb(!e,e,o);});};
Adapter.prototype.maintainRegistration=function(opt){var self=this;this.startFunctionChangeWatch();if(this.registrationHandle)this.registrationHandle.stop();this.registrationHandle=this.client.maintainRegistration(this.registrationDescriptor(),Object.assign({},opt||{},{
 onResult:function(ok,e,o,state){if(opt&&typeof opt.onResult==='function')opt.onResult(ok,e,o,state);else if(!ok&&process.env.IATB_CP_REGISTER_LOG==='1')console.error(self.label+' CP register:',e&&e.message||'HTTP');}
}));return this.registrationHandle;};
Adapter.prototype.startFunctionChangeWatch=function(){
 if(process.env.IATB_FUNCTION_REGISTRY_SYNC_V26!=='1'||this._functionsWatch)return;
 var fs=require('fs'),crypto=require('crypto'),path=require('path'),self=this;
 var ids={core:'Core',router:'Core/Router',supervisor:'Supervisor',marketdata:'MarketData',
 fundamental:'Fundamental',indicator:'Indicators',liquidity:'Liquidity',portfolio:'Portfolio',
 risk:'Risk',strategy:'Strategy',trading:'services/trading-engine',firewall:'Core/Firewall'};
 if(!ids[self.id])return;
 var file=path.resolve(__dirname,'../..',ids[self.id],'FunctionRegistry','Functions.json');
 var previous=null;
 try{previous=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}catch(e){}
 fs.watchFile(file,{interval:3000,persistent:false},function(){
  var current;try{current=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}catch(e){return;}
  if(current===previous)return;previous=current;
  // Hint only; Router/Core will re-fetch catalog from the fixed Engine endpoint.
  self.client.routerPost('/communication/v1/functions/changed',{engine:self.id},function(){});
 });
 self._functionsWatch=file;
};
Adapter.prototype.stopFunctionChangeWatch=function(){
 if(this._functionsWatch){require('fs').unwatchFile(this._functionsWatch);this._functionsWatch=null;}
};
Adapter.prototype.stopRegistration=function(){if(this.registrationHandle){this.registrationHandle.stop();this.registrationHandle=null;}this.stopFunctionChangeWatch();};
Adapter.prototype.publish=function(type,data,meta,cb){this.client.publish(this.id,type,data,meta,cb);};
module.exports=Adapter;
