'use strict';
/* TradingBot Kraken Router v1.0.3
   Point d'entree unique navigateur : 127.0.0.1:8000
   - Coeur TradingBot v1.0 : 127.0.0.1:8001
   - Add-On Kraken : 127.0.0.1:8011
   Le coeur original n'est pas modifie.
*/
var http=require('http'),fs=require('fs'),path=require('path'),URL=require('url').URL;
var HOST='127.0.0.1';
var PORT=+(process.env.ROUTER_PORT||8000);
var CORE_HOST='127.0.0.1',CORE_PORT=+(process.env.CORE_PUBLIC_PORT||8001);
var KRAKEN_HOST='127.0.0.1',KRAKEN_PORT=+(process.env.KRAKEN_ADDON_PORT||8011);
var ROOT=__dirname;

function sendJson(res,code,obj){var b=Buffer.from(JSON.stringify(obj,null,2));res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store'});res.end(b);}
function proxyError(res,label,err){if(res.headersSent){try{res.end();}catch(e){}return;}sendJson(res,503,{ok:false,service:label,error:label+' indisponible',detail:String(err&&err.message||err||'connexion impossible')});}
function copyHeaders(src){var h={};Object.keys(src||{}).forEach(function(k){if(k.toLowerCase()==='host'||k.toLowerCase()==='connection')return;h[k]=src[k];});return h;}
function responseHeaders(h){var out={};Object.keys(h||{}).forEach(function(k){var l=k.toLowerCase();if(l==='connection'||l==='transfer-encoding'||l==='content-length')return;out[k]=h[k];});return out;}
function injectKrakenLink(html){return html;}
function proxy(req,res,targetHost,targetPort,targetPath,opts){opts=opts||{};var headers=copyHeaders(req.headers);headers.host=targetHost+':'+targetPort;var p=http.request({host:targetHost,port:targetPort,path:targetPath,method:req.method,headers:headers,timeout:15000},function(pr){var ct=String(pr.headers['content-type']||'');if(opts.injectHtml&&req.method==='GET'&&ct.indexOf('text/html')>=0){var chunks=[];pr.on('data',function(c){chunks.push(c);});pr.on('end',function(){var body=Buffer.concat(chunks).toString('utf8');body=injectKrakenLink(body);var rh=responseHeaders(pr.headers);rh['Content-Length']=Buffer.byteLength(body);res.writeHead(pr.statusCode||200,rh);res.end(body);});return;}var rh=responseHeaders(pr.headers);res.writeHead(pr.statusCode||200,rh);pr.pipe(res);});p.on('timeout',function(){p.destroy(new Error('timeout'));});p.on('error',function(e){proxyError(res,opts.label||'Service',e);});req.pipe(p);}
function internalJson(port,pathname,cb){var req=http.get({host:'127.0.0.1',port:port,path:pathname,timeout:12000},function(pr){var chunks=[];pr.on('data',function(c){chunks.push(c)});pr.on('end',function(){var txt=Buffer.concat(chunks).toString('utf8'),obj=null;try{obj=JSON.parse(txt)}catch(e){return cb(new Error('JSON interne invalide'))}if((pr.statusCode||500)>=400)return cb(new Error(obj.error||('HTTP '+pr.statusCode)));cb(null,obj)});});req.on('timeout',function(){req.destroy(new Error('timeout'))});req.on('error',cb)}
function krakenPair(sym){sym=String(sym||'XBTEUR').toUpperCase();var map={BTCEUR:'XBTEUR',BTCUSD:'XBTUSD',XBTEUR:'XBTEUR',XBTUSD:'XBTUSD',ETHEUR:'ETHEUR',ETHUSD:'ETHUSD',SOLEUR:'SOLEUR',SOLUSD:'SOLUSD'};return map[sym]||sym}
function krakenMinutes(tf){return {'1m':1,'5m':5,'15m':15,'1h':60,'4h':240,'1d':1440}[String(tf||'1h')]||60}
function firstDataKey(o){var ks=Object.keys(o||{});for(var i=0;i<ks.length;i++)if(ks[i]!=='last'&&Array.isArray(o[ks[i]]))return ks[i];return''}
function exchangeTicker(req,u,res){var ex=String(u.searchParams.get('exchange')||'GMX').toUpperCase(),sym=String(u.searchParams.get('symbol')||'BTCUSD').toUpperCase();if(ex!=='KRAKEN')return proxy(req,res,CORE_HOST,CORE_PORT,'/api/gmx/ticker?symbol='+encodeURIComponent(sym),{label:'GMX'});var pair=krakenPair(sym);internalJson(KRAKEN_PORT,'/ticker?pair='+encodeURIComponent(pair),function(e,o){if(e)return proxyError(res,'Kraken Add-On',e);var k=Object.keys(o||{})[0],t=k&&o[k],px=t&&t.c&&+t.c[0];if(!isFinite(px)||px<=0)return sendJson(res,502,{ok:false,error:'Ticker Kraken invalide'});sendJson(res,200,{ok:true,exchange:'KRAKEN',symbol:sym,pair:pair,price:px,rawPair:k})})}
function exchangeKlines(req,u,res){var ex=String(u.searchParams.get('exchange')||'GMX').toUpperCase(),sym=String(u.searchParams.get('symbol')||'BTCUSD').toUpperCase(),tf=String(u.searchParams.get('interval')||'1h'),limit=Math.max(20,Math.min(720,+u.searchParams.get('limit')||100));if(ex!=='KRAKEN'){return proxy(req,res,CORE_HOST,CORE_PORT,'/api/market/klines?source=GMX&symbol='+encodeURIComponent(sym)+'&interval='+encodeURIComponent(tf)+'&limit='+limit,{label:'GMX'})}var pair=krakenPair(sym),mins=krakenMinutes(tf);internalJson(KRAKEN_PORT,'/ohlc?pair='+encodeURIComponent(pair)+'&interval='+mins,function(e,o){if(e)return proxyError(res,'Kraken Add-On',e);var key=firstDataKey(o),rows=key?o[key]:[];if(!Array.isArray(rows))rows=[];var byTime={},candles=[];for(var i=0;i<rows.length;i++){var x=rows[i];if(!Array.isArray(x)||x.length<5)continue;var ts=+x[0],op=+x[1],hi=+x[2],lo=+x[3],cl=+x[4],vol=x.length>6?+x[6]:0;if(!isFinite(ts)||!isFinite(op)||!isFinite(hi)||!isFinite(lo)||!isFinite(cl))continue;if(ts<1000000000000)ts*=1000;if(!isFinite(vol))vol=0;byTime[String(ts)]=[ts,op,hi,lo,cl,vol]}Object.keys(byTime).sort(function(a,b){return(+a)-(+b)}).forEach(function(k){candles.push(byTime[k])});if(candles.length>limit)candles=candles.slice(candles.length-limit);sendJson(res,200,{ok:true,exchange:'KRAKEN',symbol:sym,pair:pair,interval:tf,candles:candles,volumeAvailable:true,timestampUnit:'ms'})})}
function probe(port,pathname,cb){var done=false,req=http.get({host:'127.0.0.1',port:port,path:pathname,timeout:1000},function(r){r.resume();r.on('end',function(){if(done)return;done=true;cb(null,r.statusCode);});});req.on('timeout',function(){req.destroy();});req.on('error',function(e){if(done)return;done=true;cb(e);});}
function routerHealth(res){probe(CORE_PORT,'/api/health',function(ec,cc){probe(KRAKEN_PORT,'/health',function(ek,kc){sendJson(res,200,{ok:!ec,router:true,pid:process.pid,host:HOST,port:PORT,core:{ok:!ec&&cc===200,port:CORE_PORT,status:cc||0,error:ec?ec.message:''},kraken:{ok:!ek&&kc===200,port:KRAKEN_PORT,status:kc||0,error:ek?ek.message:''}});});});}
var server=http.createServer(function(req,res){var u=new URL(req.url,'http://'+HOST+':'+PORT),p=u.pathname;
 if(p==='/router-health')return routerHealth(res);
 if((req.method==='GET'||req.method==='HEAD')&&p==='/kraken'){res.writeHead(302,{'Location':'/trading?exchange=KRAKEN','Cache-Control':'no-store'});return res.end();}
 if(req.method==='GET'&&p==='/router-api/exchange/ticker')return exchangeTicker(req,u,res);
 if(req.method==='GET'&&p==='/router-api/exchange/klines')return exchangeKlines(req,u,res);
 if(p.indexOf('/kraken-api/')===0){var sub=p.slice('/kraken-api'.length)||'/';return proxy(req,res,KRAKEN_HOST,KRAKEN_PORT,sub+u.search,{label:'Kraken Add-On'});}
 return proxy(req,res,CORE_HOST,CORE_PORT,u.pathname+u.search,{label:'TradingBot Core',injectHtml:true});
});
server.on('error',function(e){console.error('TradingBot Router bind error:',e&&e.message||e);process.exit(13);});server.listen(PORT,HOST,function(){console.log('TradingBot Router : http://'+HOST+':'+PORT);console.log('Core interne      : http://'+CORE_HOST+':'+CORE_PORT);console.log('Kraken interne    : http://'+KRAKEN_HOST+':'+KRAKEN_PORT);});
function stop(){server.close(function(){process.exit(0);});setTimeout(function(){process.exit(0);},1200);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
