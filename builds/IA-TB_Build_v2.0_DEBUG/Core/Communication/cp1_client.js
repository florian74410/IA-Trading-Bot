'use strict';
/* IA-TB CP/1 Client v2.0
   Single internal client for Router-bound CP/1 traffic.
   Keeps transport/auth/error handling consistent across Engines.
   Node.js 16 compatible, local loopback only.
*/
var http=require('http'),CP=require('./communication_protocol_v1');

function Client(opt){
 opt=opt||{};
 this.root=opt.root;
 this.host='127.0.0.1';
 this.port=+opt.routerPort||+(process.env.ROUTER_PORT||8021);
 this.timeout=Math.max(500,Math.min(60000,+opt.timeout||8000));
 this.maxBytes=Math.max(65536,Math.min(8*1024*1024,+opt.maxBytes||4*1024*1024));
}
Client.prototype._token=function(){return CP.ensureSecret(this.root);};
Client.prototype._post=function(pathname,obj,opt,cb){
 opt=opt||{};cb=typeof cb==='function'?cb:function(){};
 var token;try{token=this._token();}catch(e){return cb(e);}
 var raw;try{raw=Buffer.from(JSON.stringify(obj||{}));}catch(e){return cb(e);}
 var done=false,self=this,limit=Math.max(65536,Math.min(8*1024*1024,+opt.maxBytes||self.maxBytes));
 var q=http.request({host:self.host,port:self.port,path:pathname,method:'POST',timeout:+opt.timeout||self.timeout,headers:{
   Accept:'application/json','Content-Type':'application/json','Content-Length':raw.length,'X-IATB-CP-Token':token
 }},function(r){
   var a=[],n=0;
   r.on('data',function(c){n+=c.length;if(n<=limit)a.push(c);});
   r.on('end',function(){
     if(done)return;done=true;
     if(n>limit)return cb(new Error('CP_ROUTER_RESPONSE_TOO_LARGE'));
     var out;try{out=JSON.parse(Buffer.concat(a).toString('utf8')||'{}');}catch(e){return cb(new Error('CP_ROUTER_JSON_INVALID'));}
     if((r.statusCode||500)>=400||out.status==='ERROR'||out.ok===false){
       var msg=out.error||(out.data&&out.data.error)||('CP_ROUTER_HTTP_'+r.statusCode),er=new Error(msg);er.statusCode=r.statusCode||500;er.response=out;return cb(er);
     }
     cb(null,out,r.statusCode||200);
   });
 });
 q.on('timeout',function(){q.destroy(new Error('CP_ROUTER_TIMEOUT'));});
 q.on('error',function(e){if(done)return;done=true;cb(e);});
 q.end(raw);
};
Client.prototype.requestMessage=function(message,cb){
 this._post('/communication/v1/request',message,{},function(e,o){if(e)return cb(e);cb(null,o&&o.data!==undefined?o.data:o,o);});
};
Client.prototype.request=function(target,action,args,detail,cb){
 if(typeof detail==='function'){cb=detail;detail='analysis';}
 var msg;try{msg=CP.makeRequest(target,action,args||{},detail||'analysis');}catch(e){return cb(e);}
 this.requestMessage(msg,cb);
};
Client.prototype.publish=function(source,type,data,meta,cb){
 cb=typeof cb==='function'?cb:function(){};
 var ev;try{ev=CP.makeEvent(source,type,data||{},meta||{});}catch(e){return cb(e);}
 this._post('/communication/v1/event',ev,{timeout:Math.min(this.timeout,3000),maxBytes:512*1024},function(e,o){cb(e,o);});
};
Client.prototype.register=function(desc,cb){
 cb=typeof cb==='function'?cb:function(){};
 this._post('/communication/v1/register',desc||{},{timeout:Math.min(this.timeout,3000),maxBytes:512*1024},function(e,o){cb(e,o);});
};
module.exports=Client;
