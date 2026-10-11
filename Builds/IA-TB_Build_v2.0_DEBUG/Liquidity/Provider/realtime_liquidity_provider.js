'use strict';
/* Deprecated compatibility stub.
   External liquidity collection moved to MarketData/Provider/liquidity_provider.js.
   Liquidity Engine must never connect directly to Internet providers.
*/
function P(){}
P.prototype.getSnapshot=function(symbol,source,depth,cb){
 var e=new Error('LIQUIDITY_PROVIDER_MOVED_TO_MARKET_DATA');
 e.code='LIQUIDITY_PROVIDER_MOVED_TO_MARKET_DATA';
 if(typeof cb==='function')return cb(e);
 throw e;
};
module.exports=P;
