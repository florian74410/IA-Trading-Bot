'use strict';
/* TradingBot Unified Router + Communication Router v1.7.2
   Router interne CP/1 : 127.0.0.1:8021 (UI séparée sur 8000)
   - Coeur TradingBot v1.0 : 127.0.0.1:8001
   - Add-On Kraken : 127.0.0.1:8011
   - Indicator Engine : 127.0.0.1:8012
   Le coeur trading reste isole du moteur d'indicateurs.
*/
var http=require('http'),fs=require('fs'),path=require('path'),URL=require('url').URL,CommRouter=require('../Communication/communication_router_v1'),CP=require('../Communication/communication_protocol_v1');
var HOST='127.0.0.1';
var PORT=+(process.env.ROUTER_PORT||8021);
var CORE_HOST='127.0.0.1',CORE_PORT=+(process.env.CORE_PUBLIC_PORT||8001);
var KRAKEN_HOST='127.0.0.1',KRAKEN_PORT=+(process.env.KRAKEN_ADDON_PORT||8011);
var INDICATOR_HOST='127.0.0.1',INDICATOR_PORT=+(process.env.IATB_INDICATOR_PORT||8012);
var MARKET_DATA_HOST='127.0.0.1',MARKET_DATA_PORT=+(process.env.IATB_MARKET_DATA_PORT||8013),FIREWALL_PORT=+(process.env.IATB_FIREWALL_PORT||process.env.IATB_TRADING_FIREWALL_PORT||8017);
var LIQUIDITY_HOST='127.0.0.1',LIQUIDITY_PORT=+(process.env.IATB_LIQUIDITY_PORT||8014);
var FUNDAMENTAL_HOST='127.0.0.1',FUNDAMENTAL_PORT=+(process.env.IATB_FUNDAMENTAL_PORT||8015);
var TRADING_ENGINE_HOST='127.0.0.1',TRADING_ENGINE_PORT=+(process.env.IATB_TRADING_ENGINE_PORT||8016),TRADING_FIREWALL_PORT=+(process.env.IATB_FIREWALL_PORT||process.env.IATB_TRADING_FIREWALL_PORT||8017);
var STRATEGY_HOST='127.0.0.1',STRATEGY_PORT=+(process.env.IATB_STRATEGY_PORT||8018);
var PORTFOLIO_HOST='127.0.0.1',PORTFOLIO_PORT=+(process.env.IATB_PORTFOLIO_PORT||8020);
var ROOT=__dirname,APP_ROOT=path.resolve(__dirname,'../..'),COMM=new CommRouter(APP_ROOT);
var COMM_MAX_BODY=512*1024;

function sendJson(res,code,obj){var b=Buffer.from(JSON.stringify(obj,null,2));res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store'});res.end(b);}
function readJsonBody(req,limit,cb){var a=[],n=0,done=false;limit=limit||COMM_MAX_BODY;function fail(e){if(done)return;done=true;cb(e);}req.on('data',function(c){if(done)return;n+=c.length;if(n>limit){try{req.destroy();}catch(x){}return fail(new Error('COMM_PAYLOAD_TOO_LARGE'));}a.push(c);});req.on('end',function(){if(done)return;done=true;try{cb(null,JSON.parse(Buffer.concat(a).toString('utf8')||'{}'));}catch(e){cb(new Error('COMM_JSON_INVALID'));}});req.on('error',fail);}
function communicationRegister(req,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});readJsonBody(req,131072,function(e,b){if(e)return sendJson(res,400,{ok:false,error:e.message});try{var x=COMM.register(b);sendJson(res,200,{ok:true,protocol:CP.PROTOCOL,engine:{id:x.id,label:x.label,port:x.port,capabilities:x.capabilities,events:x.events||[],lastSeen:x.lastSeen}});}catch(er){sendJson(res,400,{ok:false,error:er.message});}});}

var UI_READ_ACTIONS={
 'strategy.health':1,
 'strategy.capabilities':1,
 'strategy.catalog':1,
 'strategy.stats':1,
 'strategy.state':1,
 'portfolio.positions':1,
 'portfolio.position.health':1,
 'portfolio.trades':1,
 'portfolio.trade.detail':1,
 'portfolio.statistics':1,
 'portfolio.history':1,
 'portfolio.events':1,
 'marketdata.registry.status':1,
 'marketdata.registry.search':1,
 'marketdata.registry.list':1,
 'marketdata.registry.asset':1,
 'marketdata.registry.query':1,
 'marketdata.financial.snapshot':1,
 'marketdata.financial.history':1,
 'marketdata.financial.storage':1
};
function communicationUiRead(req,res){
 readJsonBody(req,65536,function(e,b){
  if(e)return sendJson(res,400,{ok:false,error:e.message});
  b=b&&typeof b==='object'?b:{};
  var target=String(b.target||'').toLowerCase(),action=String(b.action||'');
  if(!UI_READ_ACTIONS[action]||(['strategy','marketdata','portfolio'].indexOf(target)<0))return sendJson(res,403,{ok:false,error:'UI_WRITE_DENY',caller:{type:'UI',role:'READ_ONLY'}});
  var args=b.arguments&&typeof b.arguments==='object'&&!Array.isArray(b.arguments)?b.arguments:{};
  if(target==='strategy'&&Object.keys(args).length)return sendJson(res,403,{ok:false,error:'UI_ARGUMENTS_DENY',caller:{type:'UI',role:'READ_ONLY'}});if(target==='portfolio'){var pa={'portfolio.positions':{},'portfolio.statistics':{},'portfolio.position.health':{tradeId:1,walletId:1,symbol:1,exchange:1},'portfolio.trades':{limit:1},'portfolio.trade.detail':{tradeId:1,id:1},'portfolio.history':{range:1},'portfolio.events':{limit:1,since:1}}[action]||{},pks=Object.keys(args);for(var pi=0;pi<pks.length;pi++)if(!pa[pks[pi]])return sendJson(res,403,{ok:false,error:'UI_ARGUMENTS_DENY',caller:{type:'UI',role:'READ_ONLY'}});}
  var q=CP.makeRequest(target,action,args,'summary');q.caller={type:'UI',role:'READ_ONLY'};
  COMM.route(q,function(er,o){if(er)return sendJson(res,400,{ok:false,error:er.message,protocol:CP.PROTOCOL,caller:{type:'UI',role:'READ_ONLY'}});sendJson(res,200,o);});
 });
}

function communicationRequest(req,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});readJsonBody(req,COMM_MAX_BODY,function(e,b){if(e)return sendJson(res,400,{ok:false,error:e.message});COMM.route(b,function(er,o){if(er)return sendJson(res,400,{ok:false,error:er.message,protocol:CP.PROTOCOL});sendJson(res,200,o);});});}
function communicationEvent(req,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});readJsonBody(req,COMM_MAX_BODY,function(e,b){if(e)return sendJson(res,400,{ok:false,error:e.message});try{var ev=COMM.publishEvent(b);sendJson(res,200,{ok:true,protocol:CP.PROTOCOL,event_id:ev.event_id,accepted:true});}catch(er){sendJson(res,400,{ok:false,error:er.message,protocol:CP.PROTOCOL});}});}
function communicationEvents(req,u,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});sendJson(res,200,COMM.listEvents({since:+u.searchParams.get('since')||0,limit:+u.searchParams.get('limit')||50,source:u.searchParams.get('source')||''}));}

function communicationCapabilities(req,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});sendJson(res,200,COMM.capabilities());}
function communicationRegistry(req,res,id){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});if(id){var x=COMM.protocolRegistry.get(id);return x?sendJson(res,200,{ok:true,schema:'iatb.protocol-registry/2.0',object:x}):sendJson(res,404,{ok:false,error:'PROTOCOL_REGISTRY_OBJECT_NOT_FOUND'});}sendJson(res,200,COMM.protocolRegistrySnapshot());}
function communicationPlanClient(req,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});readJsonBody(req,131072,function(e,b){if(e)return sendJson(res,400,{ok:false,error:e.message});try{sendJson(res,200,{ok:true,action:COMM.planClientAction(b.action,b.arguments||{},b.meta||{})});}catch(er){sendJson(res,400,{ok:false,error:er.message});}});}
function communicationAckClient(req,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});readJsonBody(req,131072,function(e,b){if(e)return sendJson(res,400,{ok:false,error:e.message});try{sendJson(res,200,{ok:true,ack:COMM.ackClientAction(b)});}catch(er){sendJson(res,400,{ok:false,error:er.message});}});}
function communicationRuntime(req,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!COMM.verifyToken(token))return sendJson(res,403,{ok:false,error:'CP_AUTH_FAILED'});sendJson(res,200,{ok:true,protocol:CP.PROTOCOL,runtime:COMM.runtimeSnapshot()});}
function communicationTest(res){var q=CP.makeRequest('indicator','indicator.list_capabilities',{},'summary');COMM.route(q,function(e,o){if(e)return sendJson(res,503,{ok:false,protocol:CP.PROTOCOL,error:e.message});sendJson(res,200,{ok:true,protocol:CP.PROTOCOL,message:'Communication Router -> Indicator Engine : OK',request_id:q.request_id,response:o});});}
function proxyError(res,label,err){if(res.headersSent){try{res.end();}catch(e){}return;}sendJson(res,503,{ok:false,service:label,error:label+' indisponible',detail:String(err&&err.message||err||'connexion impossible')});}
function copyHeaders(src){var h={};Object.keys(src||{}).forEach(function(k){if(k.toLowerCase()==='host'||k.toLowerCase()==='connection')return;h[k]=src[k];});return h;}
function responseHeaders(h){var out={};Object.keys(h||{}).forEach(function(k){var l=k.toLowerCase();if(l==='connection'||l==='transfer-encoding'||l==='content-length')return;out[k]=h[k];});return out;}
function injectKrakenLink(html){return html;}
function proxy(req,res,targetHost,targetPort,targetPath,opts){opts=opts||{};var headers=copyHeaders(req.headers);headers.host=targetHost+':'+targetPort;var p=http.request({host:targetHost,port:targetPort,path:targetPath,method:req.method,headers:headers,timeout:15000},function(pr){var ct=String(pr.headers['content-type']||'');if(opts.injectHtml&&req.method==='GET'&&ct.indexOf('text/html')>=0){var chunks=[];pr.on('data',function(c){chunks.push(c);});pr.on('end',function(){var body=Buffer.concat(chunks).toString('utf8');body=injectKrakenLink(body);var rh=responseHeaders(pr.headers);rh['Content-Length']=Buffer.byteLength(body);res.writeHead(pr.statusCode||200,rh);res.end(body);});return;}var rh=responseHeaders(pr.headers);res.writeHead(pr.statusCode||200,rh);pr.pipe(res);});p.on('timeout',function(){p.destroy(new Error('timeout'));});p.on('error',function(e){proxyError(res,opts.label||'Service',e);});req.pipe(p);}
function internalJson(port,pathname,cb){var req=http.get({host:'127.0.0.1',port:port,path:pathname,timeout:12000},function(pr){var chunks=[];pr.on('data',function(c){chunks.push(c)});pr.on('end',function(){var txt=Buffer.concat(chunks).toString('utf8'),obj=null;try{obj=JSON.parse(txt)}catch(e){return cb(new Error('JSON interne invalide'))}if((pr.statusCode||500)>=400)return cb(new Error(obj.error||('HTTP '+pr.statusCode)));cb(null,obj)});});req.on('timeout',function(){req.destroy(new Error('timeout'))});req.on('error',cb)}
function krakenPair(sym){sym=String(sym||'XBTEUR').toUpperCase();var map={BTCEUR:'XBTEUR',BTCUSD:'XBTUSD',XBTEUR:'XBTEUR',XBTUSD:'XBTUSD',ETHEUR:'ETHEUR',ETHUSD:'ETHUSD',SOLEUR:'SOLEUR',SOLUSD:'SOLUSD'};return map[sym]||sym}
function krakenMinutes(tf){return {'1m':1,'5m':5,'15m':15,'30m':30,'1h':60,'4h':240,'1d':1440,'1w':10080}[String(tf||'1h')]||60}
function firstDataKey(o){var ks=Object.keys(o||{});for(var i=0;i<ks.length;i++)if(ks[i]!=='last'&&Array.isArray(o[ks[i]]))return ks[i];return''}
function krakenVolumeFromRow(x){if(!Array.isArray(x))return 0;var v;if(x.length>=7)v=+x[6];else if(x.length>=6)v=+x[5];else v=0;return isFinite(v)&&v>0?v:0}
function candleMs(x){var t=Array.isArray(x)?+x[0]:0;if(t>0&&t<1000000000000)t*=1000;return isFinite(t)?Math.round(t):0}
function bucketKey(ts,mins){var span=Math.max(1,+mins||1)*60000;return String(Math.floor(ts/span))}
function exchangeTicker(req,u,res){var ex=String(u.searchParams.get('exchange')||'GMX').toUpperCase(),sym=String(u.searchParams.get('symbol')||'BTCUSD').toUpperCase();if(ex!=='KRAKEN')return proxy(req,res,CORE_HOST,CORE_PORT,'/api/gmx/ticker?symbol='+encodeURIComponent(sym),{label:'GMX'});var pair=krakenPair(sym);internalJson(KRAKEN_PORT,'/ticker?pair='+encodeURIComponent(pair),function(e,o){if(e)return proxyError(res,'Kraken Add-On',e);var k=Object.keys(o||{})[0],t=k&&o[k],px=t&&t.c&&+t.c[0];if(!isFinite(px)||px<=0)return sendJson(res,502,{ok:false,error:'Ticker Kraken invalide'});sendJson(res,200,{ok:true,exchange:'KRAKEN',symbol:sym,pair:pair,price:px,rawPair:k})})}
function exchangeKlines(req,u,res){
 var ex=String(u.searchParams.get('exchange')||'GMX').toUpperCase(),
     sym=String(u.searchParams.get('symbol')||'BTCUSD').toUpperCase(),
     tf=String(u.searchParams.get('interval')||'1h'),
     limit=Math.max(20,Math.min(720,+u.searchParams.get('limit')||100));
 if(ex==='KRAKEN'){
   var pair=krakenPair(sym),mins=krakenMinutes(tf);
   return internalJson(KRAKEN_PORT,'/ohlc?pair='+encodeURIComponent(pair)+'&interval='+mins,function(e,o){
     if(e)return proxyError(res,'Kraken Add-On',e);
     var key=firstDataKey(o),rows=key?o[key]:[],byTime={},candles=[],positive=0;
     if(!Array.isArray(rows))rows=[];
     for(var i=0;i<rows.length;i++){
       var x=rows[i];if(!Array.isArray(x)||x.length<5)continue;
       var ts=candleMs(x),op=+x[1],hi=+x[2],lo=+x[3],cl=+x[4],vol=krakenVolumeFromRow(x);
       if(!ts||!isFinite(op)||!isFinite(hi)||!isFinite(lo)||!isFinite(cl))continue;
       if(vol>0)positive++;
       byTime[String(ts)]=[ts,op,hi,lo,cl,vol];
     }
     Object.keys(byTime).sort(function(a,b){return(+a)-(+b)}).forEach(function(k){candles.push(byTime[k])});
     if(candles.length>limit)candles=candles.slice(candles.length-limit);
     sendJson(res,200,{ok:true,exchange:'KRAKEN',symbol:sym,pair:pair,interval:tf,candles:candles,volumeAvailable:positive>0,volumeSource:'KRAKEN_NATIVE',volumePositiveRows:positive,timestampUnit:'ms'});
   });
 }
 /* GMX: conserve strictement les donnees natives du marche. Aucun proxy volume
    provenant d'un autre exchange n'est injecte. */
 var corePath='/api/market/klines?source=GMX&symbol='+encodeURIComponent(sym)+'&interval='+encodeURIComponent(tf)+'&limit='+limit;
 internalJson(CORE_PORT,corePath,function(e,g){
   if(e)return proxyError(res,'GMX',e);
   var gc=g&&Array.isArray(g.candles)?g.candles:[];
   sendJson(res,200,{ok:true,exchange:'GMX',source:'GMX',symbol:sym,interval:tf,candles:gc,volumeAvailable:!!(g&&g.volumeAvailable),volumeSource:g&&g.volumeSource||'NONE',priceSource:'GMX'});
 });
}
function probe(port,pathname,cb){var done=false,req=http.get({host:'127.0.0.1',port:port,path:pathname,timeout:1000},function(r){r.resume();r.on('end',function(){if(done)return;done=true;cb(null,r.statusCode);});});req.on('timeout',function(){req.destroy();});req.on('error',function(e){if(done)return;done=true;cb(e);});}
function routerHealth(res){
 var specs=[['core',CORE_PORT,'/api/health'],['kraken',KRAKEN_PORT,'/health'],['indicators',INDICATOR_PORT,'/health'],['marketData',MARKET_DATA_PORT,'/health'],['liquidity',LIQUIDITY_PORT,'/health'],['fundamental',FUNDAMENTAL_PORT,'/health'],['trading',TRADING_ENGINE_PORT,'/health'],['strategy',STRATEGY_PORT,'/health'],['portfolio',PORTFOLIO_PORT,'/health']],out={},left=specs.length,finished=false;
 function finish(){if(finished)return;finished=true;sendJson(res,200,{ok:true,router:true,version:'1.9.3',communicationProtocol:'CP/1',pid:process.pid,host:HOST,port:PORT,core:out.core||{ok:false,port:CORE_PORT,status:0,error:'pending'},kraken:out.kraken||{ok:false,port:KRAKEN_PORT,status:0,error:'pending'},indicators:out.indicators||{ok:false,port:INDICATOR_PORT,status:0,error:'pending'},marketData:out.marketData||{ok:false,port:MARKET_DATA_PORT,status:0,error:'pending'},liquidity:out.liquidity||{ok:false,port:LIQUIDITY_PORT,status:0,error:'pending'},fundamental:out.fundamental||{ok:false,port:FUNDAMENTAL_PORT,status:0,error:'pending'},trading:out.trading||{ok:false,port:TRADING_ENGINE_PORT,status:0,error:'pending'},strategy:out.strategy||{ok:false,port:STRATEGY_PORT,status:0,error:'pending'},portfolio:out.portfolio||{ok:false,port:PORTFOLIO_PORT,status:0,error:'pending'},dependencies:out});}
 specs.forEach(function(sp){probe(sp[1],sp[2],function(e,code){out[sp[0]]={ok:!e&&code===200,port:sp[1],status:code||0,error:e?e.message:''};if(--left===0)finish();});});
 setTimeout(finish,850);
}

var server=http.createServer(function(req,res){var u=new URL(req.url,'http://'+HOST+':'+PORT),p=u.pathname;
 if(p==='/router-health')return routerHealth(res);
 if(req.method==='GET'&&p==='/communication-health')return COMM.health(function(e,o){if(e)return sendJson(res,503,{ok:false,error:e.message});sendJson(res,200,o);});
 if(req.method==='POST'&&p==='/communication-test')return communicationTest(res);
 if(req.method==='POST'&&p==='/communication/v1/register')return communicationRegister(req,res);
 if(req.method==='POST'&&p==='/communication/v1/request')return communicationRequest(req,res);
 if(req.method==='POST'&&p==='/communication/v1/ui/read')return communicationUiRead(req,res);
 if(req.method==='POST'&&p==='/communication/v1/event')return communicationEvent(req,res);
 if(req.method==='GET'&&p==='/communication/v1/events')return communicationEvents(req,u,res);
 if(req.method==='GET'&&p==='/communication/v1/capabilities')return communicationCapabilities(req,res);
 if(req.method==='GET'&&p==='/communication/v1/registry')return communicationRegistry(req,res,'');
 if(req.method==='GET'&&p.indexOf('/communication/v1/registry/')===0)return communicationRegistry(req,res,decodeURIComponent(p.slice('/communication/v1/registry/'.length)));
 if(req.method==='POST'&&p==='/communication/v1/client/plan')return communicationPlanClient(req,res);
 if(req.method==='POST'&&p==='/communication/v1/client/ack')return communicationAckClient(req,res);
 if(req.method==='GET'&&p==='/communication/v1/runtime')return communicationRuntime(req,res);
 if((req.method==='GET'||req.method==='HEAD')&&p==='/kraken'){res.writeHead(302,{'Location':'/trading?exchange=KRAKEN','Cache-Control':'no-store'});return res.end();}
 if(req.method==='GET'&&p==='/router-api/exchange/ticker')return exchangeTicker(req,u,res);
 if(req.method==='GET'&&p==='/router-api/exchange/klines')return exchangeKlines(req,u,res);
 if(p.indexOf('/kraken-api/')===0){var sub=p.slice('/kraken-api'.length)||'/';return proxy(req,res,KRAKEN_HOST,KRAKEN_PORT,sub+u.search,{label:'Kraken Add-On'});}
 if(p==='/indicator-api'||p.indexOf('/indicator-api/')===0){var isub=p.slice('/indicator-api'.length)||'/';return proxy(req,res,INDICATOR_HOST,INDICATOR_PORT,isub+u.search,{label:'Indicator Engine'});}
 if(req.method==='GET'&&p==='/firewall-events')return proxy(req,res,'127.0.0.1',FIREWALL_PORT,'/api/events'+u.search,{label:'Firewall Event Feed'});
 if(p==='/market-data'||p.indexOf('/market-data/')===0){var msub=p.slice('/market-data'.length)||'/';return proxy(req,res,MARKET_DATA_HOST,MARKET_DATA_PORT,msub+u.search,{label:'Market Data · firewall validated at ingestion'});}
 if(p==='/fundamental-api'||p.indexOf('/fundamental-api/')===0){var fsub=p.slice('/fundamental-api'.length)||'/';return proxy(req,res,FUNDAMENTAL_HOST,FUNDAMENTAL_PORT,fsub+u.search,{label:'Fundamental Engine'});}
 if(p==='/liquidity-data'||p.indexOf('/liquidity-data/')===0){var lsub=p.slice('/liquidity-data'.length)||'/';return proxy(req,res,LIQUIDITY_HOST,LIQUIDITY_PORT,lsub+u.search,{label:'Liquidity Engine'});}
 if(p==='/portfolio-api'||p.indexOf('/portfolio-api/')===0){var psub=p.slice('/portfolio-api'.length)||'/';return proxy(req,res,PORTFOLIO_HOST,PORTFOLIO_PORT,psub+u.search,{label:'Portfolio Engine'});}
 return proxy(req,res,CORE_HOST,CORE_PORT,u.pathname+u.search,{label:'TradingBot Core',injectHtml:true});
});
server.on('error',function(e){console.error('TradingBot Router bind error:',e&&e.message||e);process.exit(13);});server.listen(PORT,HOST,function(){console.log('TradingBot Communication Router v1.8.5 : http://'+HOST+':'+PORT);
console.log('Communication Protocol: CP/1 (canal Supervisor authentifie)');console.log('Core interne      : http://'+CORE_HOST+':'+CORE_PORT);console.log('Kraken interne    : http://'+KRAKEN_HOST+':'+KRAKEN_PORT);console.log('Indicator Engine  : http://'+INDICATOR_HOST+':'+INDICATOR_PORT);console.log('Market Data       : http://'+MARKET_DATA_HOST+':'+MARKET_DATA_PORT);console.log('Liquidity Engine  : http://'+LIQUIDITY_HOST+':'+LIQUIDITY_PORT);
console.log('Fundamental Engine: http://'+FUNDAMENTAL_HOST+':'+FUNDAMENTAL_PORT);console.log('Trading Engine    : http://'+TRADING_ENGINE_HOST+':'+TRADING_ENGINE_PORT);console.log('Strategy Engine   : http://'+STRATEGY_HOST+':'+STRATEGY_PORT);console.log('Portfolio Engine  : http://'+PORTFOLIO_HOST+':'+PORTFOLIO_PORT);});
function stop(){server.close(function(){process.exit(0);});setTimeout(function(){process.exit(0);},1200);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
