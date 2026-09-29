'use strict';
/* Internal-only Market Data client.
   Liquidity Engine never calls Internet providers directly.
   Every request goes through Router CP/1 to Market Data, whose external data
   has already passed the Data Firewall before cache/SQL persistence.
*/
var http=require('http'),CP=require('../../Core/Communication/communication_protocol_v1');

function P(o){
 o=o||{};this.root=o.root;this.port=+o.routerPort||+o.port||+(process.env.ROUTER_PORT||8021);
 this.host='127.0.0.1';this.timeout=Math.max(1000,+o.timeout||10000);this.name='MARKET_DATA_CP1';
}
P.prototype._call=function(action,args,cb){
 var token;try{token=CP.ensureSecret(this.root)}catch(e){return cb(e)}
 var msg=CP.makeRequest('marketdata',action,args||{},'analysis'),raw=Buffer.from(JSON.stringify(msg));
 var q=http.request({host:this.host,port:this.port,path:'/communication/v1/request',method:'POST',timeout:this.timeout,headers:{
  'Content-Type':'application/json','Accept':'application/json','Content-Length':raw.length,'X-IATB-CP-Token':token
 }},function(r){var a=[],n=0;r.on('data',function(c){n+=c.length;if(n<=4*1024*1024)a.push(c)});r.on('end',function(){
  var o;try{o=JSON.parse(Buffer.concat(a).toString('utf8')||'{}')}catch(e){return cb(new Error('MARKET_DATA_CP1_JSON_INVALID'))}
  if((r.statusCode||500)>=400||o.status==='ERROR')return cb(new Error(o.error||(o.data&&o.data.error)||('MARKET_DATA_CP1_HTTP_'+r.statusCode)));
  cb(null,o.data!==undefined?o.data:o);
 });});
 q.on('timeout',function(){q.destroy(new Error('MARKET_DATA_CP1_TIMEOUT'))});q.on('error',cb);q.end(raw);
};
P.prototype.getCandles=function(s,t,l,cb){this._call('marketdata.candles',{symbol:s,timeframe:t,limit:l,force:false},cb);};
P.prototype.getLiquiditySnapshot=function(s,source,depth,force,cb){this._call('marketdata.microstructure.snapshot',{symbol:s,source:source||'AUTO',depth:depth||20,force:force===true},cb);};
P.prototype.getLiquidityHistory=function(o,cb){o=o||{};this._call('marketdata.microstructure.history',{symbol:o.symbol||'',source:o.source||'',limit:o.limit||240,since:o.since||0},cb);};
P.prototype.getLiquidityStorage=function(cb){this._call('marketdata.microstructure.storage',{},cb);};
P.prototype.getOpenInterestAggregate=function(symbol,sources,cb){this._call('marketdata.derivatives.open_interest',{symbol:symbol,sources:Array.isArray(sources)?sources:[]},cb);};
P.prototype.getLiquidationStats=function(o,cb){o=o||{};this._call('marketdata.liquidations.stats',{symbol:o.symbol||'',source:o.source||'',windowMs:o.windowMs||900000},cb);};
P.prototype.getRecentLiquidations=function(o,cb){o=o||{};this._call('marketdata.liquidations.recent',{symbol:o.symbol||'',source:o.source||'',windowMs:o.windowMs||900000,limit:o.limit||500,since:o.since||0},cb);};
module.exports=P;
