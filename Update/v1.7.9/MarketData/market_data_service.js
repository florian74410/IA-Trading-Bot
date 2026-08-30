'use strict';
/* IA-Trading-Bot v1.7.9 - Market Data service.
   Adds secure in-memory CoinGecko credential injection from Core.
   The CoinGecko API key is never persisted by Market Data.
*/
var http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),URL=require('url').URL,Cache=require('./Cache/market_cache'),Registry=require('./Provider/provider_registry'),S=require('./Normalizer/symbols'),T=require('./Normalizer/timeframes');
var ROOT=path.resolve(__dirname,'..'),HOST='127.0.0.1',PORT=+(process.env.IATB_MARKET_DATA_PORT||8013),registry=new Registry({krakenPort:+process.env.KRAKEN_ADDON_PORT||8011,hyperliquid:{url:process.env.IATB_HYPERLIQUID_WS||'wss://api.hyperliquid.xyz/ws'},coingecko:{apiKey:process.env.IATB_COINGECKO_API_KEY||''}}),cache=new Cache({ttlMs:+process.env.IATB_MARKET_CACHE_TTL||20000,maxEntries:64});
var REFRESH_MS=Math.max(3000,+process.env.IATB_MARKET_REFRESH_MS||15000),ACTIVE_TTL_MS=Math.max(60000,+process.env.IATB_MARKET_ACTIVE_TTL_MS||180000),DEFAULT_PROVIDER=String(process.env.IATB_MARKET_PROVIDER||'REFERENCE').toUpperCase(),active=Object.create(null),refreshBusy=Object.create(null);
var INTERNAL_SERVICE_KEY=path.join(ROOT,'Fundamental','Data','internal_service_key.dat');
function send(r,c,o){var b=Buffer.from(JSON.stringify(o));r.writeHead(c,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});r.end(b);}
function pname(x){return String(x||DEFAULT_PROVIDER||'REFERENCE').toUpperCase();}
function key(p,s,t){return pname(p)+'|'+S.canonical(s)+'|'+T.normalize(t);}
function markActive(p,s,t,l){var k=key(p,s,t);active[k]={provider:pname(p),symbol:S.canonical(s),timeframe:T.normalize(t),limit:Math.max(100,Math.min(500,+l||300)),lastRequestedAt:Date.now(),lastRefreshAt:active[k]&&active[k].lastRefreshAt||0,lastError:''};return active[k];}
function cut(x,l,state){l=Math.max(100,Math.min(500,+l||300));var c=Array.isArray(x.candles)?x.candles:[];if(c.length>l)c=c.slice(c.length-l);var o={};Object.keys(x).forEach(function(k){if(k!=='candles')o[k]=x[k];});o.candles=c;o.limit=l;o.cache=state;o.refreshedAt=x.refreshedAt||Date.now();return o;}
function fetchFresh(p,s,t,cb){p=pname(p);var provider=registry.get(p),k=key(p,s,t);if(!provider)return cb(new Error('MARKET_PROVIDER_UNKNOWN:'+p));if(refreshBusy[k]){var wait=0,tm=setInterval(function(){wait+=50;if(!refreshBusy[k]||wait>=12000){clearInterval(tm);var h=cache.get(k);if(h)return cb(null,h);cb(new Error('MARKET_REFRESH_BUSY_TIMEOUT'));}},50);return;}refreshBusy[k]=1;provider.getCandles(s,t,function(e,o){delete refreshBusy[k];if(e){if(active[k])active[k].lastError=e.message;return cb(e);}o.refreshedAt=Date.now();o.requestedProvider=p;cache.set(k,o);if(active[k]){active[k].lastRefreshAt=o.refreshedAt;active[k].lastError='';}cb(null,o);});}
function candles(p,s,t,l,force,cb){var a=markActive(p,s,t,l),k=key(p,s,t),h=!force&&cache.get(k);if(h)return cb(null,cut(h,l,'HIT'));fetchFresh(a.provider,a.symbol,a.timeframe,function(e,o){if(e)return cb(e);cb(null,cut(o,l,force?'FORCED_REFRESH':'MISS'));});}
function refreshActive(){var n=Date.now();Object.keys(active).forEach(function(k){var x=active[k];if(n-x.lastRequestedAt>ACTIVE_TTL_MS){delete active[k];return;}if(refreshBusy[k]||n-x.lastRefreshAt<REFRESH_MS)return;fetchFresh(x.provider,x.symbol,x.timeframe,function(){});});}
function internalKey(){try{return String(fs.readFileSync(INTERNAL_SERVICE_KEY,'utf8')||'').trim();}catch(e){return'';}}
function internalOK(req){var a=String(req.headers['x-ia-tb-internal-key']||''),b=internalKey();if(!/^[a-f0-9]{64}$/i.test(a)||!b||a.length!==b.length)return false;try{return crypto.timingSafeEqual(Buffer.from(a,'utf8'),Buffer.from(b,'utf8'));}catch(e){return false;}}
function body(req,cb){var a=[],n=0,done=false;req.on('data',function(c){if(done)return;n+=c.length;if(n>65536){done=true;return cb(new Error('BODY_TOO_LARGE'));}a.push(c);});req.on('end',function(){if(done)return;try{cb(null,JSON.parse(Buffer.concat(a).toString('utf8')||'{}'));}catch(e){cb(new Error('JSON_INVALID'));}});req.on('error',cb);}
function setCoinGeckoKey(req,res){if(!internalOK(req))return send(res,403,{ok:false,error:'INTERNAL_AUTH_FAILED'});body(req,function(e,b){if(e)return send(res,400,{ok:false,error:e.message});var k=String(b&&b.apiKey||'').trim();var st=k?registry.setCoinGeckoApiKey(k):registry.clearCoinGeckoApiKey();cache.clear();send(res,200,{ok:true,provider:'COINGECKO',configured:!!k,status:st});});}
function testCoinGecko(req,res){if(!internalOK(req))return send(res,403,{ok:false,error:'INTERNAL_AUTH_FAILED'});fetchFresh('COINGECKO','BTCUSD','1h',function(e,o){if(e)return send(res,502,{ok:false,error:e.message,provider:'COINGECKO',status:registry.get('COINGECKO').status()});send(res,200,{ok:true,provider:'COINGECKO',message:'CoinGecko API : OK',candles:Array.isArray(o.candles)?o.candles.length:0,authenticated:!!o.authenticated,volumeAvailable:o.volumeAvailable===true,status:registry.get('COINGECKO').status()});});}
var timer=setInterval(refreshActive,Math.max(3000,Math.min(REFRESH_MS,15000)));if(timer.unref)timer.unref();
var srv=http.createServer(function(req,res){var u=new URL(req.url,'http://'+HOST+':'+PORT),p=pname(u.searchParams.get('provider'));
 if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,name:'IA-TB Market Data',service:'MARKET_DATA',version:'1.7.9',pid:process.pid,defaultProvider:DEFAULT_PROVIDER,providers:registry.list(),cache:cache.stats(),refresh:{intervalMs:REFRESH_MS,activeContexts:Object.keys(active).length}});
 if(req.method==='GET'&&u.pathname==='/providers')return send(res,200,{ok:true,defaultProvider:DEFAULT_PROVIDER,providers:registry.list()});
 if(req.method==='GET'&&u.pathname==='/candles')return candles(p,u.searchParams.get('symbol')||'BTCUSD',u.searchParams.get('interval')||'1h',u.searchParams.get('limit')||300,u.searchParams.get('force')==='1',function(e,o){if(e)return send(res,502,{ok:false,error:e.message,provider:p});send(res,200,o);});
 if(req.method==='POST'&&u.pathname==='/refresh')return candles(p,u.searchParams.get('symbol')||'BTCUSD',u.searchParams.get('interval')||'1h',u.searchParams.get('limit')||300,true,function(e,o){if(e)return send(res,502,{ok:false,error:e.message,provider:p});send(res,200,o);});
 if(req.method==='GET'&&u.pathname==='/active')return send(res,200,{ok:true,refreshIntervalMs:REFRESH_MS,contexts:Object.keys(active).map(function(k){return active[k];})});
 if(req.method==='POST'&&u.pathname==='/cache/clear'){cache.clear();return send(res,200,{ok:true,cache:cache.stats()});}
 if(req.method==='POST'&&u.pathname==='/internal/coingecko/key')return setCoinGeckoKey(req,res);
 if(req.method==='POST'&&u.pathname==='/internal/coingecko/test')return testCoinGecko(req,res);
 send(res,404,{ok:false,error:'NOT_FOUND'});
});
srv.on('error',function(e){console.error('Market Data bind error:',e&&e.message||e);process.exit(15);});
srv.listen(PORT,HOST,function(){console.log('IA-TB Market Data v1.7.9 http://'+HOST+':'+PORT+' default='+DEFAULT_PROVIDER+' refresh='+REFRESH_MS+'ms');});
function stop(){clearInterval(timer);registry.close();srv.close(function(){process.exit(0);});setTimeout(function(){process.exit(0);},1200);}process.on('SIGINT',stop);process.on('SIGTERM',stop);
