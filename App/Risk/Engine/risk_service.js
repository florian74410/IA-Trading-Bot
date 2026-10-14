'use strict';
/*
 IA-Trading-Bot - Risk Engine v2.0
 
 Architectural rules:
 - Risk Engine is analytical only.
 - Every inter-engine exchange uses CP/1 through the Router.
 - No direct HTTP call to Market Data, Indicator, Portfolio, exchanges or Trading Engine.
 - Node.js 16 compatible, zero npm dependencies.
*/
var http=require('http'),path=require('path'),URL=require('url').URL;
var CP=require('../../Core/Communication/communication_protocol_v1');
var CPClient=require('../../Core/Communication/cp1_client');
var Risk=require('./risk_engine');
var RiskGate=require('./risk_gate').RiskGate;
var SettingsStore=require('../../Core/Settings/sqlite_settings_store');
var BUILD=require('../../Core/Shared/build_info');

var APP_ROOT=path.resolve(__dirname,'../..');
var HOST='127.0.0.1';
var PORT=+(process.env.IATB_RISK_ENGINE_PORT||8019);
var ROUTER_PORT=+(process.env.ROUTER_PORT||8021);
var MAX_BODY=1024*1024;
var VERSION=BUILD.version;
var SETTINGS_DB=new SettingsStore(APP_ROOT);
var CP_CLIENT=new CPClient({root:APP_ROOT,routerPort:ROUTER_PORT,timeout:12000,maxBytes:4*1024*1024});
var RISK_GATE=new RiskGate({secret:CP.ensureSecret(APP_ROOT),getSettings:riskSettings,ttlMs:30000});
var DEFAULT_SETTINGS={enabled:true,defaultTimeframe:'1h',marketSamples:500,thresholds:{capitalRiskWarningPct:3,grossExposureWarningPct:100,leverageWarning:5,volatilityWarningPct:100,drawdownWarningPct:20,var95WarningPct:5},scoreWeights:{capitalAtRisk:8,grossExposure:0.20,leverage:5,volatility:0.20,drawdown:0.50}};
function riskSettings(){var x=SETTINGS_DB.get('risk','settings',null)||{};var o=JSON.parse(JSON.stringify(DEFAULT_SETTINGS));Object.keys(x).forEach(function(k){if(k==='thresholds'||k==='scoreWeights')Object.assign(o[k],x[k]||{});else o[k]=x[k];});return o;}
function saveRiskSettings(patch){var o=riskSettings();patch=patch||{};if(typeof patch.enabled==='boolean')o.enabled=patch.enabled;if(patch.defaultTimeframe)o.defaultTimeframe=String(patch.defaultTimeframe);if(+patch.marketSamples>=50&&+patch.marketSamples<=2000)o.marketSamples=Math.round(+patch.marketSamples);if(patch.thresholds)Object.keys(o.thresholds).forEach(function(k){if(isFinite(+patch.thresholds[k]))o.thresholds[k]=+patch.thresholds[k];});SETTINGS_DB.set('risk','settings',o);return o;}

var CAPABILITIES=[
  'risk.list_capabilities',
  'risk.position.analyze',
  'risk.portfolio.analyze',
  'risk.strategy.analyze',
  'risk.snapshot',
  'risk.settings.get',
  'risk.settings.set',
  'risk.gate.evaluate',
  'risk.gate.verify'
];
var EVENTS=[];

function json(res,code,obj){
  var b=Buffer.from(JSON.stringify(obj));
  res.writeHead(code,{
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':b.length,
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  });
  res.end(b);
}
function body(req,cb){
  var a=[],n=0,done=false;
  function fail(e){if(done)return;done=true;cb(e);}
  req.on('data',function(x){
    if(done)return;n+=x.length;
    if(n>MAX_BODY){try{req.destroy();}catch(_){ }return fail(new Error('RISK_PAYLOAD_TOO_LARGE'));}
    a.push(x);
  });
  req.on('end',function(){
    if(done)return;done=true;
    try{cb(null,JSON.parse(Buffer.concat(a).toString('utf8')||'{}'));}
    catch(e){cb(new Error('RISK_JSON_INVALID'));}
  });
  req.on('error',fail);
}
function routerRequest(message,cb){CP_CLIENT.requestMessage(message,cb);}
function requestMarket(symbol,timeframe,cb){
  CP_CLIENT.request('marketdata','marketdata.candles',{
    symbol:symbol,
    timeframe:timeframe,
    limit:riskSettings().marketSamples,
    force:false
  },'analysis',cb);
}
function requestIndicators(symbol,timeframe,cb){
  var q=CP.makeRequest('indicator','indicator.analyze',{
    symbol:symbol,timeframe:timeframe,force:false
  },'analysis');
  routerRequest(q,cb);
}
function requestPortfolio(cb){
  var q=CP.makeRequest('portfolio','portfolio.snapshot',{},'analysis');
  routerRequest(q,cb);
}
function parallel3(a,b,c,cb){
  var left=3,out=[null,null,null],errs=[null,null,null];
  function done(i,e,v){errs[i]=e||null;out[i]=v||null;if(--left===0)cb(errs,out);}
  a(function(e,v){done(0,e,v);});b(function(e,v){done(1,e,v);});c(function(e,v){done(2,e,v);});
}
function extractCandles(m){
  if(!m)return[];
  if(Array.isArray(m.candles))return m.candles;
  var d=m.data||{},c=d.candles||d.ohlcv;
  if(c&&c.status==='AVAILABLE'&&Array.isArray(c.value))return c.value;
  return[];
}
function buildAnalysis(args,detail,cb){
  args=args||{};
  var symbol=String(args.symbol||args.strategy&&args.strategy.symbol||args.position&&args.position.symbol||'BTCUSD').toUpperCase();
  var cfg=riskSettings();
  var timeframe=String(args.timeframe||cfg.defaultTimeframe||'1h').toLowerCase();
  parallel3(
    function(x){requestMarket(symbol,timeframe,x);},
    function(x){requestIndicators(symbol,timeframe,x);},
    function(x){requestPortfolio(x);},
    function(errs,values){
      var market=values[0]||{},indicators=values[1]||{},portfolio=values[2]||args.portfolio||{};
      var degraded=[];
      if(errs[0])degraded.push('MARKET_DATA_UNAVAILABLE:'+errs[0].message);
      if(errs[1])degraded.push('INDICATOR_UNAVAILABLE:'+errs[1].message);
      if(errs[2])degraded.push('PORTFOLIO_UNAVAILABLE:'+errs[2].message);
      if(errs[0])return cb(new Error('RISK_MARKET_DATA_REQUIRED'));
      var result=Risk.analyze({
        symbol:symbol,
        timeframe:timeframe,
        market:{symbol:symbol,timeframe:timeframe,candles:extractCandles(market)},
        indicators:indicators,
        portfolio:portfolio||{},
        position:args.position||null,
        strategy:args.strategy||null,
        settings:cfg
      });
      result.inputs={
        marketData:{available:!errs[0],via:'CP/1 Router'},
        indicators:{available:!errs[1],via:'CP/1 Router'},
        portfolio:{available:!errs[2],via:'CP/1 Router'}
      };
      result.indicatorContext=indicators&&indicators.summary?indicators.summary:null;
      result.warnings=(result.warnings||[]).concat(degraded);
      cb(null,result);
    }
  );
}
function cpAction(m,cb){
  var a=m.arguments||{};
  if(m.action==='risk.gate.evaluate'){try{return cb(null,RISK_GATE.evaluate(a.intent||a));}catch(e){return cb(e);}}
  if(m.action==='risk.gate.verify'){try{return cb(null,RISK_GATE.verify(a.risk_approval_id,a.intent||{},a.consume===true));}catch(e){return cb(e);}}
  if(m.action==='risk.settings.get')return cb(null,{schema:'risk.settings/1.0',settings:riskSettings(),storage:SETTINGS_DB.status()});
  if(m.action==='risk.settings.set'){try{return cb(null,{schema:'risk.settings/1.0',settings:saveRiskSettings(a),storage:SETTINGS_DB.status()});}catch(e){return cb(e);}}
  if(m.action==='risk.list_capabilities')
    return cb(null,{schema:'risk.capabilities/0.1',engine:'risk',protocol:'CP/1',capabilities:CAPABILITIES.slice(),events:EVENTS.slice(),analyticalOnly:true});
  if(m.action==='risk.position.analyze')
    return buildAnalysis({symbol:a.symbol,timeframe:a.timeframe,position:a.position,portfolio:a.portfolio},m.detail,cb);
  if(m.action==='risk.strategy.analyze')
    return buildAnalysis({symbol:a.symbol,timeframe:a.timeframe,strategy:a.strategy,portfolio:a.portfolio},m.detail,cb);
  if(m.action==='risk.portfolio.analyze')
    return buildAnalysis({symbol:a.symbol,timeframe:a.timeframe,portfolio:a.portfolio},m.detail,cb);
  if(m.action==='risk.snapshot')
    return buildAnalysis(a,m.detail,cb);
  cb(new Error('CP_ACTION_FORBIDDEN'));
}
function handleCP(req,res){
  var token=String(req.headers['x-iatb-cp-token']||'');
  if(!CP.verifyToken(APP_ROOT,token))return json(res,403,{ok:false,error:'CP_AUTH_FAILED'});
  body(req,function(e,m){
    if(e)return json(res,400,{ok:false,error:e.message});
    var allow=Object.create(null);CAPABILITIES.forEach(function(x){allow[x]=1;});
    var v=CP.validateRequest(m,allow);
    if(!v.ok)return json(res,400,{ok:false,error:v.errors[0],errors:v.errors});
    if(v.target!=='risk')return json(res,404,{ok:false,error:'CP_TARGET_INVALID'});
    var started=Date.now();
    cpAction(m,function(x,d){
      if(x)return json(res,400,CP.makeResponse(m,'ERROR',{error:String(x.message||x).slice(0,240)},{
        engine:'risk',action:m.action,schema:'cp.error/1.0',duration_ms:Date.now()-started
      }));
      var degraded=(d.warnings||[]).some(function(w){return /_UNAVAILABLE:/.test(w);});
      json(res,200,CP.makeResponse(m,degraded?'DEGRADED':'OK',d,{
        engine:'risk',action:m.action,schema:d.schema||'risk.analysis/1.0',
        duration_ms:Date.now()-started,warnings:d.warnings||[]
      }));
    });
  });
}
function registrationDescriptor(){return{
  id:'risk',label:'Risk Engine',host:'127.0.0.1',port:PORT,cpPath:'/cp/v1',healthPath:'/health',
  version:VERSION,schemaVersion:'risk.analysis/1.0',capabilities:CAPABILITIES,events:EVENTS
};}

var srv=http.createServer(function(req,res){
  var u=new URL(req.url,'http://'+HOST+':'+PORT);
  if(require('../../Core/Clients/auth21_service_boundary').decision(process.env,'engine',req.method,u.pathname).intercept)return json(res,404,{error:'NOT_FOUND'});
  if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{
    ok:true,service:'IA-TB Risk Engine',engine:'risk',version:VERSION,
    protocol:'CP/1',analyticalOnly:true,pid:process.pid,host:HOST,port:PORT,
    routerPort:ROUTER_PORT,capabilities:CAPABILITIES,events:EVENTS,settings:riskSettings(),settingsStorage:SETTINGS_DB.status()
  });
  if(req.method==='POST'&&u.pathname==='/cp/v1')return handleCP(req,res);
  return json(res,404,{ok:false,error:'NOT_FOUND'});
});
srv.on('error',function(e){console.error('Risk Engine bind error:',e&&e.message||e);process.exit(19);});
var registrationHandle=null;
srv.listen(PORT,HOST,function(){
  console.log('IA-TB Risk Engine v'+VERSION+' http://'+HOST+':'+PORT+' CP/1');
  registrationHandle=CP_CLIENT.maintainRegistration(registrationDescriptor(),{initialDelayMs:900});
});
function stop(){if(registrationHandle)registrationHandle.stop();srv.close(function(){process.exit(0);});setTimeout(function(){process.exit(0);},1200);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
