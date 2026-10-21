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
var RiskPolicy=require('./risk_policy_v25'),R1=require('./r1_management_v25'),R2=require('./r2_monitor_v25');
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
var RISK_GATE=new RiskGate({secret:CP.ensureSecret(APP_ROOT),getSettings:riskSettings,ttlMs:30000,requirePreflight:true});
var DEFAULT_SETTINGS={enabled:true,defaultTimeframe:'1h',marketSamples:500,thresholds:{capitalRiskWarningPct:3,grossExposureWarningPct:100,leverageWarning:5,volatilityWarningPct:100,drawdownWarningPct:20,var95WarningPct:5},scoreWeights:{capitalAtRisk:8,grossExposure:0.20,leverage:5,volatility:0.20,drawdown:0.50}};
function riskSettings(){var x=SETTINGS_DB.get('risk','settings',null)||{};var o=JSON.parse(JSON.stringify(DEFAULT_SETTINGS));Object.keys(x).forEach(function(k){if(k==='thresholds'||k==='scoreWeights')Object.assign(o[k],x[k]||{});else o[k]=x[k];});return Object.assign(o,RiskPolicy.sanitize(RiskPolicy.DEFAULT,x));}
function saveRiskSettings(patch){var o=riskSettings();patch=patch||{};if(typeof patch.enabled==='boolean')o.enabled=patch.enabled;if(patch.defaultTimeframe)o.defaultTimeframe=String(patch.defaultTimeframe);if(+patch.marketSamples>=50&&+patch.marketSamples<=2000)o.marketSamples=Math.round(+patch.marketSamples);if(patch.thresholds)Object.keys(o.thresholds).forEach(function(k){if(isFinite(+patch.thresholds[k]))o.thresholds[k]=+patch.thresholds[k];});o=RiskPolicy.sanitize(o,patch);SETTINGS_DB.set('risk','settings',o);return o;}

var CAPABILITIES=[
  'risk.list_capabilities',
  'risk.position.analyze',
  'risk.portfolio.analyze',
  'risk.strategy.analyze',
  'risk.snapshot',
  'risk.settings.get',
  'risk.settings.set',
  'risk.gate.evaluate',
  'risk.gate.verify',
  'risk.r1.evaluate','risk.r2.refresh','risk.r2.alerts.get'
];
var EVENTS=['risk.r2.limit_exceeded','risk.r2.limit_recovered'];
var R2_STATE={last:null,alerts:[],at:0},R2_INFLIGHT=false;

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

function receiveR2(raw){
 var cfg=riskSettings(),now=Date.now(),data=R2.analyze(raw,RiskPolicy.mergeLimits(cfg,'r2'),now);
 var previous=Object.create(null);R2_STATE.alerts.forEach(function(x){previous[x.module+':'+x.metric]=x;});
 var next=Object.create(null);data.alerts.forEach(function(x){next[x.module+':'+x.metric]=x;});
 if(cfg.enabled&&cfg.r2.enabled&&cfg.r2.alertsEnabled){
  data.alerts.forEach(function(a){var key=a.module+':'+a.metric,p=previous[key];if(!p||p.code!==a.code||Math.abs(p.current-a.current)>Math.max(0.5,Math.abs(a.limit||0)*0.1)){
   CP_CLIENT.publish('risk','risk.r2.limit_exceeded',{schema:'risk.r2.alert/1.0',module:a.module,metric:a.metric,code:a.code,severity:a.severity,current:a.current,limit:a.limit,at:data.asOf},{});}});
  R2_STATE.alerts.forEach(function(a){if(!next[a.module+':'+a.metric])CP_CLIENT.publish('risk','risk.r2.limit_recovered',{schema:'risk.r2.alert/1.0',module:a.module,metric:a.metric,at:data.asOf},{});});
 }
 R2_STATE={last:data,alerts:data.alerts,at:now};
 return data;
}
function refreshR2(cb){
 var cfg=riskSettings();if(!cfg.enabled||!cfg.r2.enabled)return cb(null,{schema:'risk.r2.monitor/1.0',status:'DISABLED',alerts:[]});
 requestPortfolio(function(e,d){if(e)return cb(null,{schema:'risk.r2.monitor/1.0',status:'UNAVAILABLE',alerts:[{code:'PORTFOLIO_UNAVAILABLE',severity:'CRITICAL'}]});
  cb(null,receiveR2(d&&d.snapshot||d));});
}
function checkTradeIntent(raw,cb){
 var cfg=riskSettings(),i=require('./risk_gate').normalize(raw);
 if(!cfg.enabled)return cb(null,RISK_GATE.evaluate(raw,{authorized:false,summary:{status:'RISK_ENGINE_DISABLED'}}));
 if(!cfg.r1.enabled&&!cfg.r2.enabled)return cb(null,RISK_GATE.evaluate(raw,{authorized:true,summary:{status:'LEGACY_GUARDS_ONLY'}}));
 requestPortfolio(function(e,p){
  if(e)return cb(null,RISK_GATE.evaluate(raw,{authorized:false,summary:{status:'PORTFOLIO_UNAVAILABLE'}}));
  var snap=p&&p.snapshot||p||{},blocking=false,summary={};
  function donePrice(px){
   if(cfg.r1.enabled){
    var r1=R1.analyze({action:i.action,quantity:i.size,price:px,stopLoss:i.stopLoss,equity:snap.risk_equity_verified},RiskPolicy.mergeLimits(cfg,'r1'));
    summary.r1={status:r1.status,decision:r1.decision,metrics:r1.metrics,reasons:r1.reasons,proposal:r1.proposal};
    if(r1.decision!=='ACCEPT')blocking=true;
   }
   if(cfg.r2.enabled){
    var r2=R2.analyze(snap,RiskPolicy.mergeLimits(cfg,'r2'));
    summary.r2={status:r2.status,alerts:r2.alerts};
    if(r2.alerts.length||r2.status==='DEGRADED'||(r2.modules.equity&&r2.modules.equity.status==='INSUFFICIENT_DATA')||(r2.modules.margin&&r2.modules.margin.status==='INSUFFICIENT_DATA')||(r2.modules.integrity&&r2.modules.integrity.status==='INSUFFICIENT_DATA'))blocking=true;
   }
   // Never convert advisory-only analysis to a trade approval when required inputs are unverified.
   cb(null,RISK_GATE.evaluate(raw,{authorized:!blocking,summary:summary}));
  }
  if(!cfg.r1.enabled)return donePrice(null);
  CP_CLIENT.request('marketdata','marketdata.asset.price',{symbol:i.symbol},'analysis',function(er,d){
   if(er)return donePrice(null);
   var px=d&&(+d.price||+d.last||+(d.data&&d.data.price)||+(d.value&&d.value.price));
   donePrice(Number.isFinite(px)&&px>0?px:null);
  });
 });
}

function cpAction(m,cb){
  var a=m.arguments||{};
  if(m.action==='risk.gate.evaluate'){try{return checkTradeIntent(a.intent||a,cb);}catch(e){return cb(e);}}
  if(m.action==='risk.gate.verify'){try{return cb(null,RISK_GATE.verify(a.risk_approval_id,a.intent||{},a.consume===true));}catch(e){return cb(e);}}
  if(m.action==='risk.r1.evaluate')return cb(null,R1.analyze(a.intent||a,RiskPolicy.mergeLimits(riskSettings(),'r1')));
  if(m.action==='risk.r2.refresh')return refreshR2(cb);
  if(m.action==='risk.r2.alerts.get')return cb(null,{schema:'risk.r2.alerts/1.0',at:R2_STATE.at,alerts:R2_STATE.alerts.slice(0,20),status:R2_STATE.last&&R2_STATE.last.status||'NOT_REFRESHED'});
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

var srv=require('../../Core/Clients/auth21_engine_ingress').createServer(function(req,res){
  var u=new URL(req.url,'http://'+HOST+':'+PORT);
  if(require('../../Core/Clients/auth21_service_boundary').decision(process.env,'engine',req.method,u.pathname).intercept)return json(res,404,{error:'NOT_FOUND'});
  if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{
    ok:true,service:'IA-TB Risk Engine',engine:'risk',version:VERSION,
    protocol:'CP/1',analyticalOnly:true,pid:process.pid,host:HOST,port:PORT,
    routerPort:ROUTER_PORT,capabilities:CAPABILITIES,events:EVENTS,settings:riskSettings(),r2State:{at:R2_STATE.at,alertCount:R2_STATE.alerts.length},settingsStorage:SETTINGS_DB.status()
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
var R2_LAST_POLL=0;var R2_TIMER=setInterval(function(){if(R2_INFLIGHT)return;var c=riskSettings();if(!c.enabled||!c.r2.enabled)return;var now=Date.now();if(now-R2_LAST_POLL<Math.max(10,Math.min(3600,+c.r2.monitorIntervalSec||30))*1000)return;R2_LAST_POLL=now;R2_INFLIGHT=true;refreshR2(function(){R2_INFLIGHT=false;});},10000);if(R2_TIMER.unref)R2_TIMER.unref();
function stop(){clearInterval(R2_TIMER);if(registrationHandle)registrationHandle.stop();srv.close(function(){process.exit(0);});setTimeout(function(){process.exit(0);},1200);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
