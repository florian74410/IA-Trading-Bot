'use strict';
var request=require('./http_json');

function num(v){v=+v;return isFinite(v)?v:null;}
function clean(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function baseCoin(s){s=clean(s);var q=['USDT','USDC','USD','EUR','BTC','ETH'];for(var i=0;i<q.length;i++)if(s.length>q[i].length&&s.slice(-q[i].length)===q[i])return s.slice(0,-q[i].length);return s;}
function binanceSymbol(s){s=clean(s);if(/USDT$/.test(s))return s;if(/USD$/.test(s))return s.slice(0,-3)+'USDT';return s;}
function krakenPair(s){s=clean(s);if(s.indexOf('BTC')===0)s='XBT'+s.slice(3);return s;}
function level(x){
 if(Array.isArray(x)){var p=num(x[0]),q=num(x[1]),n=num(x[2]);return p>0&&q>=0?{price:p,size:q,count:n}:null;}
 if(x&&typeof x==='object'){var px=num(x.price!=null?x.price:x.px),sz=num(x.size!=null?x.size:x.sz),ct=num(x.count!=null?x.count:x.n);return px>0&&sz>=0?{price:px,size:sz,count:ct}:null;}
 return null;
}
function book(bids,asks,depth){
 depth=Math.max(5,Math.min(100,+depth||20));
 bids=(bids||[]).map(level).filter(Boolean).sort(function(a,b){return b.price-a.price}).slice(0,depth);
 asks=(asks||[]).map(level).filter(Boolean).sort(function(a,b){return a.price-b.price}).slice(0,depth);
 return{bids:bids,asks:asks};
}
function snapshot(source,symbol,canonical,depth,b,oi,mark,errors){
 var bestBid=b&&b.bids&&b.bids[0]||null,bestAsk=b&&b.asks&&b.asks[0]||null,mid=bestBid&&bestAsk?(bestBid.price+bestAsk.price)/2:null;
 mark=num(mark);if(mark==null)mark=mid;
 oi=num(oi);
 return{ok:true,schema:'marketdata.liquidity.raw/1.0',source:source,provider:source,provenance:'MARKET_DATA_COLLECTOR:'+source,symbol:symbol,canonicalSymbol:canonical||symbol,depth:+depth||20,observedAt:Date.now(),orderBook:b||{bids:[],asks:[]},openInterest:oi==null?{available:false,value:null,unit:'BASE',markPrice:mark,notional:null}:{available:true,value:oi,unit:'BASE',markPrice:mark,notional:mark==null?null:oi*mark},liquidations:[],partial:Array.isArray(errors)&&errors.length>0,errors:(errors||[]).slice(0,16)};
}
function P(o){o=o||{};this.settings=o.settings||{};this.name='LIQUIDITY_PROVIDER_REGISTRY';}
P.prototype.enabled=function(source){
 source=String(source||'').toUpperCase();var id=source==='BINANCE_FUTURES'?'BINANCE':source,p=this.settings.providers&&this.settings.providers[id];return !p||p.enabled!==false;
};
P.prototype.binance=function(symbol,depth,cb){
 if(!this.enabled('BINANCE_FUTURES'))return cb(new Error('MARKET_PROVIDER_DISABLED: BINANCE'));
 var bs=binanceSymbol(symbol),left=2,b=null,oi=null,mark=null,errors=[],done=function(){if(--left)return;if(!b||!b.bids.length||!b.asks.length)return cb(new Error(errors.join('|')||'BINANCE_ORDERBOOK_UNAVAILABLE'));cb(null,snapshot('BINANCE_FUTURES',symbol,bs,depth,b,oi,mark,errors));};
 request('https://fapi.binance.com/fapi/v1/depth?symbol='+encodeURIComponent(bs)+'&limit='+Math.max(5,Math.min(100,+depth||20)),{timeout:10000},function(e,o){if(e)errors.push('ORDERBOOK:'+e.message);else b=book(o.bids,o.asks,depth);done();});
 request('https://fapi.binance.com/fapi/v1/openInterest?symbol='+encodeURIComponent(bs),{timeout:10000},function(e,o){if(e)errors.push('OPEN_INTEREST:'+e.message);else oi=o&&o.openInterest;done();});
};
P.prototype.hyperliquid=function(symbol,depth,cb){
 if(!this.enabled('HYPERLIQUID'))return cb(new Error('MARKET_PROVIDER_DISABLED: HYPERLIQUID'));
 var coin=baseCoin(symbol),left=2,b=null,oi=null,mark=null,errors=[],done=function(){if(--left)return;if(!b||!b.bids.length||!b.asks.length)return cb(new Error(errors.join('|')||'HYPERLIQUID_ORDERBOOK_UNAVAILABLE'));cb(null,snapshot('HYPERLIQUID',symbol,coin,depth,b,oi,mark,errors));};
 request('https://api.hyperliquid.xyz/info',{method:'POST',timeout:10000,headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'l2Book',coin:coin})},function(e,o){if(e)errors.push('ORDERBOOK:'+e.message);else if(o&&Array.isArray(o.levels))b=book(o.levels[0],o.levels[1],depth);else errors.push('ORDERBOOK:INVALID_RESPONSE');done();});
 request('https://api.hyperliquid.xyz/info',{method:'POST',timeout:10000,headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'metaAndAssetCtxs'})},function(e,o){if(e)errors.push('OPEN_INTEREST:'+e.message);else if(Array.isArray(o)&&o[0]&&Array.isArray(o[0].universe)&&Array.isArray(o[1])){for(var i=0;i<o[0].universe.length;i++)if(String(o[0].universe[i].name||'').toUpperCase()===coin){oi=o[1][i]&&o[1][i].openInterest;mark=o[1][i]&&(o[1][i].markPx||o[1][i].midPx);break;}}done();});
};
P.prototype.kraken=function(symbol,depth,cb){
 if(!this.enabled('KRAKEN'))return cb(new Error('MARKET_PROVIDER_DISABLED: KRAKEN'));
 var kp=krakenPair(symbol);
 request('https://api.kraken.com/0/public/Depth?pair='+encodeURIComponent(kp)+'&count='+Math.max(5,Math.min(100,+depth||20)),{timeout:10000},function(e,o){
  if(e)return cb(e);var k=o&&o.result&&Object.keys(o.result)[0],x=k&&o.result[k];if(!x)return cb(new Error('KRAKEN_ORDERBOOK_UNAVAILABLE'));
  cb(null,snapshot('KRAKEN',symbol,kp,depth,book(x.bids,x.asks,depth),null,null,[]));
 });
};
P.prototype.getSnapshot=function(symbol,source,depth,cb){
 var self=this;source=String(source||'AUTO').toUpperCase();
 if(source==='BINANCE'||source==='BINANCE_FUTURES')return self.binance(symbol,depth,cb);
 if(source==='HYPERLIQUID')return self.hyperliquid(symbol,depth,cb);
 if(source==='KRAKEN'||source==='REFERENCE')return self.kraken(symbol,depth,cb);
 if(source!=='AUTO')return cb(new Error('LIQUIDITY_PROVIDER_UNKNOWN: '+source));
 self.hyperliquid(symbol,depth,function(e,o){if(!e)return cb(null,o);self.binance(symbol,depth,function(e2,o2){if(!e2)return cb(null,o2);self.kraken(symbol,depth,function(e3,o3){if(!e3)return cb(null,o3);cb(e2||e||e3||new Error('NO_LIQUIDITY_PROVIDER'));});});});
};
P.prototype.list=function(){var self=this;return[
 {id:'BINANCE_FUTURES',enabled:self.enabled('BINANCE_FUTURES'),capabilities:['ORDERBOOK','OPEN_INTEREST']},
 {id:'HYPERLIQUID',enabled:self.enabled('HYPERLIQUID'),capabilities:['ORDERBOOK','OPEN_INTEREST']},
 {id:'KRAKEN',enabled:self.enabled('KRAKEN'),capabilities:['ORDERBOOK']}
];};
module.exports=P;
