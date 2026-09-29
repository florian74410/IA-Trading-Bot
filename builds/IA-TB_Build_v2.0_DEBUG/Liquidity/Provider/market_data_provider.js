'use strict';
var http=require('http');
function P(o){o=o||{};this.port=+o.port||8013;this.host='127.0.0.1';this.name='MARKET_DATA_LAYER';}
P.prototype.getCandles=function(s,t,l,cb){var path='/candles?symbol='+encodeURIComponent(s)+'&interval='+encodeURIComponent(t)+'&limit='+encodeURIComponent(l);var q=http.get({host:this.host,port:this.port,path:path,timeout:10000},function(r){var a=[];r.on('data',function(c){a.push(c)});r.on('end',function(){var o;try{o=JSON.parse(Buffer.concat(a).toString('utf8')||'{}')}catch(e){return cb(new Error('MarketData JSON invalide'))}if((r.statusCode||500)>=400||o.ok===false)return cb(new Error(o.error||('MarketData HTTP '+r.statusCode)));cb(null,o)});});q.on('timeout',function(){q.destroy(new Error('MarketData timeout'))});q.on('error',cb);};

P.prototype._getJson=function(path,cb){var q=http.get({host:this.host,port:this.port,path:path,timeout:10000},function(r){var a=[];r.on('data',function(c){a.push(c)});r.on('end',function(){var o;try{o=JSON.parse(Buffer.concat(a).toString('utf8')||'{}')}catch(e){return cb(new Error('MarketData JSON invalide'))}if((r.statusCode||500)>=400||o.ok===false)return cb(new Error(o.error||('MarketData HTTP '+r.statusCode)));cb(null,o)});});q.on('timeout',function(){q.destroy(new Error('MarketData timeout'))});q.on('error',cb);};
P.prototype.getFinancialSnapshot=function(force,cb){this._getJson('/financial/snapshot'+(force?'?force=1':''),cb);};
P.prototype.getFinancialHistory=function(family,limit,cb){this._getJson('/financial/history?family='+encodeURIComponent(family||'ALL')+'&limit='+encodeURIComponent(limit||96),cb);};
module.exports=P;
