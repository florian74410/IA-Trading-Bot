'use strict';
/* Shared read-only financial data client.
   Consumers never call CoinGecko/DeFiLlama directly; they request Market Data through Router CP/1.
*/
var http=require('http'),crypto=require('crypto'),CP=require('./communication_protocol_v1');
function Client(opt){opt=opt||{};this.root=opt.root;this.port=+opt.routerPort||+(process.env.ROUTER_PORT||8021);this.timeout=Math.max(1000,+opt.timeout||8000);}
Client.prototype._call=function(action,args,cb){
 var token;try{token=CP.ensureSecret(this.root)}catch(e){return cb(e)}
 var msg=CP.makeRequest('marketdata',action,args||{},'analysis'),raw=Buffer.from(JSON.stringify(msg)),
     req=http.request({host:'127.0.0.1',port:this.port,path:'/communication/v1/request',method:'POST',timeout:this.timeout,headers:{
       'Content-Type':'application/json','Accept':'application/json','Content-Length':raw.length,'X-IATB-CP-Token':token
     }},function(res){var a=[],n=0;res.on('data',function(c){n+=c.length;if(n<=4*1024*1024)a.push(c)});res.on('end',function(){var o;try{o=JSON.parse(Buffer.concat(a).toString('utf8')||'{}')}catch(e){return cb(new Error('FINANCIAL_ROUTER_JSON_INVALID'))}if((res.statusCode||500)>=400)return cb(new Error(o.error||('FINANCIAL_ROUTER_HTTP_'+res.statusCode)));if(o&&o.status==='ERROR')return cb(new Error(o.data&&o.data.error||'FINANCIAL_ROUTER_ERROR'));cb(null,o&&o.data!==undefined?o.data:o)})});
 req.on('timeout',function(){req.destroy(new Error('FINANCIAL_ROUTER_TIMEOUT'))});req.on('error',cb);req.end(raw);
};
Client.prototype.snapshot=function(scope,cb){scope=String(scope||'ALL').toUpperCase();this._call('marketdata.financial.snapshot',{force:false},function(e,o){if(e)return cb(e);if(scope==='CEFI')return cb(null,{ok:true,timestamp:o.timestamp,expiresAt:o.expiresAt,cefi:o.cefi,meta:o.meta});if(scope==='DEFI')return cb(null,{ok:true,timestamp:o.timestamp,expiresAt:o.expiresAt,defi:o.defi,meta:o.meta});cb(null,o)});};
Client.prototype.history=function(scope,limit,since,cb){this._call('marketdata.financial.history',{family:String(scope||'ALL').toUpperCase(),limit:Math.max(1,Math.min(1000,+limit||96)),since:+since||0},cb);};
Client.prototype.aiContext=function(scope,cb){this._call('marketdata.financial.ai_context',{scope:String(scope||'ALL').toUpperCase()},cb);};
Client.prototype.storage=function(cb){this._call('marketdata.financial.storage',{},cb);};
module.exports=Client;
