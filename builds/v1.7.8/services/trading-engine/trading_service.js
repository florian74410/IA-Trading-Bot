'use strict';
/* IA-TB Trading Engine runtime v1.7.7
   Local execution service. Internal traffic speaks CP/1; exchange-native formats
   remain isolated inside Exchange Executors/Adapters.
   Live execution is OFF by default and still requires risk_approval_id.
*/
var http=require('http'),path=require('path');
var CP=require('../../Core/Communication/communication_protocol_v1');
var Trading=require('./trading-engine'),Registry=require('./registry'),Http=require('./http-transport'),Secrets=require('./secret-provider');

var HOST='127.0.0.1',PORT=+(process.env.IATB_TRADING_ENGINE_PORT||8016),VERSION='1.7.7';
var LIVE=String(process.env.IATB_TRADING_LIVE||'0')==='1';
var SERVICE_ENABLED=String(process.env.IATB_TRADING_ENGINE_ENABLED||'1')!=='0';
var ROOT=path.resolve(__dirname,'../..');
var engine=Registry.registerDefaultExecutors(new Trading.TradingEngine({secretProvider:new Secrets.SecretProvider(),transport:Http.requestJson,liveExecutionEnabled:LIVE}));
var startedAt=Date.now(),lastExecution=null,requestCount=0;
var ACTIONS={'trading.health':1,'trading.capabilities':1,'trading.execute':1};

function send(res,code,obj){var b=JSON.stringify(obj);res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(b),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(b);}
function body(req,cb){var a=[],n=0,done=false;req.on('data',function(c){if(done)return;n+=c.length;if(n>256*1024){done=true;return cb(new Error('BODY_TOO_LARGE'));}a.push(c);});req.on('end',function(){if(done)return;try{cb(null,JSON.parse(Buffer.concat(a).toString('utf8')||'{}'));}catch(e){cb(new Error('JSON_INVALID'));}});req.on('error',function(e){if(!done)cb(e);});}
function capabilities(){var out={};['BINANCE','OKX','KRAKEN','GMX'].forEach(function(x){out[x]=engine.capabilities(x);});return out;}
function health(){var h=engine.health();return{ok:true,name:'IA-TB Trading Engine',version:VERSION,engine:h.engine,engineVersion:h.engine_version,contractVersion:h.contract_version,pid:process.pid,host:HOST,port:PORT,serviceEnabled:SERVICE_ENABLED,liveExecutionEnabled:LIVE,mode:LIVE?'LIVE':'SAFE',riskApprovalRequired:true,communicationProtocol:CP.PROTOCOL,registeredExchanges:h.exchanges,registeredExchangeCount:h.exchanges.length,lastExecution:lastExecution,requestCount:requestCount,uptimeSec:Math.round((Date.now()-startedAt)/1000)};}
function cpResponse(req,status,data,warnings){return CP.makeResponse(req,status,data,{engine:'trading',action:req.action,schema:'trading.response/1.0',warnings:warnings||[]});}
function validateArgs(action,args){args=args&&typeof args==='object'&&!Array.isArray(args)?args:{};if(action==='trading.health')return null;if(action==='trading.capabilities'){if(args.exchange!=null&&!/^(BINANCE|OKX|KRAKEN|GMX)$/i.test(String(args.exchange)))return 'TRADING_EXCHANGE_INVALID';return null;}if(action==='trading.execute'){var allowed={risk_approval_id:1,exchange:1,market_type:1,symbol:1,side:1,order_type:1,quantity:1,quote_quantity:1,price:1,stop_price:1,leverage:1,reduce_only:1,time_in_force:1,client_order_id:1,position_side:1,chain:1,account:1,slippage_bps:1,metadata:1};var ks=Object.keys(args);for(var i=0;i<ks.length;i++)if(!allowed[ks[i]])return 'TRADING_ARGUMENT_UNEXPECTED:'+ks[i];if(!args.risk_approval_id)return 'TRADING_RISK_APPROVAL_REQUIRED';if(!args.exchange)return 'TRADING_EXCHANGE_REQUIRED';if(!args.symbol)return 'TRADING_SYMBOL_REQUIRED';if(!args.side)return 'TRADING_SIDE_REQUIRED';if(args.quantity==null&&args.quote_quantity==null)return 'TRADING_QUANTITY_REQUIRED';return null;}return 'TRADING_ACTION_INVALID';}
function handleCp(req,res,msg){var token=String(req.headers['x-iatb-cp-token']||'');if(!CP.verifyToken(ROOT,token))return send(res,403,{ok:false,error:'CP_AUTH_INVALID'});var v=CP.validateRequest(msg,ACTIONS,Date.now());if(!v.ok)return send(res,400,{ok:false,error:v.errors[0],errors:v.errors});var ae=validateArgs(v.action,v.arguments);if(ae)return send(res,400,cpResponse(msg,'ERROR',{error:ae}));requestCount++;
 if(v.action==='trading.health')return send(res,200,cpResponse(msg,'OK',health()));
 if(v.action==='trading.capabilities'){var ex=String(v.arguments.exchange||'').toUpperCase();return send(res,200,cpResponse(msg,'OK',ex?{exchange:ex,capabilities:engine.capabilities(ex)}:{exchanges:capabilities()}));}
 if(!SERVICE_ENABLED)return send(res,409,cpResponse(msg,'OFFLINE',{error:'TRADING_ENGINE_DISABLED'}));
 engine.execute(Object.assign({},v.arguments,{request_id:v.request_id})).then(function(r){lastExecution={request_id:r.request_id,risk_approval_id:r.risk_approval_id,exchange:r.exchange,symbol:r.symbol,status:r.status,ok:r.ok,timestamp:r.timestamp,error:r.error||null};send(res,r.ok?200:409,cpResponse(msg,r.ok?'OK':'PROTECTION',r));}).catch(function(e){lastExecution={request_id:v.request_id,risk_approval_id:v.arguments.risk_approval_id||null,exchange:String(v.arguments.exchange||'').toUpperCase(),symbol:String(v.arguments.symbol||'').toUpperCase(),status:'ERROR',ok:false,timestamp:Date.now(),error:String(e&&e.message||e)};send(res,409,cpResponse(msg,'PROTECTION',{error:String(e&&e.message||e),liveExecutionEnabled:LIVE}));});
}

var server=http.createServer(function(req,res){var u=new URL(req.url,'http://'+HOST+':'+PORT),p=u.pathname;
 if(req.method==='GET'&&p==='/health')return send(res,200,health());
 if(req.method==='GET'&&p==='/api/status')return send(res,200,health());
 if(req.method==='GET'&&p==='/api/capabilities')return send(res,200,{ok:true,version:VERSION,exchanges:capabilities()});
 if(req.method==='GET'&&p==='/api/last-execution')return send(res,200,{ok:true,lastExecution:lastExecution});
 if(req.method==='POST'&&p==='/cp/v1')return body(req,function(e,m){if(e)return send(res,400,{ok:false,error:e.message});handleCp(req,res,m);});
 send(res,404,{ok:false,error:'NOT_FOUND'});
});
server.on('error',function(e){console.error('IA-TB Trading Engine bind error:',e&&e.message||e);process.exit(13);});
server.listen(PORT,HOST,function(){console.log('IA-TB Trading Engine v'+VERSION+' : http://'+HOST+':'+PORT);console.log('Communication Protocol: '+CP.PROTOCOL);console.log('Execution LIVE: '+(LIVE?'ENABLED':'DISABLED'));console.log('Risk approval: REQUIRED');console.log('Exchanges: BINANCE / OKX / KRAKEN / GMX');});
function stop(){server.close(function(){process.exit(0);});setTimeout(function(){process.exit(0);},1200);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
