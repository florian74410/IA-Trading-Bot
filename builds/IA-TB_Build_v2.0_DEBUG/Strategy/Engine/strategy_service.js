'use strict';
/* IA-TB Strategy Engine v2 — service canonique v1.9.0
   Supervisor-ready, CP/1 only for machine-to-machine control.
   Security invariant: INTENTION_ONLY. No exchange adapter is imported here.
*/
var http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
var Adapter=require('../../Core/Communication/component_cp1_adapter'),PATHS=require('../../Core/Shared/paths');
var Registry=require('./strategy_registry_v2'),Core=require('./strategy_v2_core'),Stats=require('./strategy_stats_v2');
PATHS.ensureAppRuntimeDirs();
var ROOT=PATHS.ROOT,HOST='127.0.0.1',PORT=+(process.env.IATB_STRATEGY_PORT||8018),ROUTER_PORT=+(process.env.ROUTER_PORT||8021),VERSION='2.0.0',LOG=PATHS.RuntimeLogs.strategy;
var registry=new Registry(ROOT),stats=new Stats(ROOT),state={mode:'RUNNING',startedAt:Date.now(),lastEvaluation:null,lastSignal:null};
function log(tag,msg){try{fs.appendFileSync(LOG,'['+new Date().toISOString()+'] ['+tag+'] '+String(msg||'').replace(/[\r\n]+/g,' ').slice(0,900)+'\n','utf8');}catch(e){}}
function send(res,code,o){var b=Buffer.from(JSON.stringify(o));res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(b);}
function health(){return{ok:true,service:'IA-TB Strategy Engine v2',marker:'IA-TB Strategy Engine v2',version:VERSION,pid:process.pid,port:PORT,mode:state.mode,execution:'INTENTION_ONLY',supervisorReady:true,protocol:'CP/1',strategies:registry.items.length,uptimeSec:Math.round((Date.now()-state.startedAt)/1000),lastEvaluation:state.lastEvaluation,lastSignal:state.lastSignal};}
function publish(type,data){if(adapter)adapter.publish(type,data,{schema:'strategy.event/2.0',severity:'NOTICE'},function(){});}
function evaluate(a,msg){if(state.mode!=='RUNNING')return{ok:true,status:'PAUSED',aggregate:{action:'HOLD',confidence:0},signals:[],results:[]};a=a||{};var symbol=Core.cleanSymbol(a.symbol||a.market&&a.market.symbol||'BTCUSD'),tf=Core.timeframe(a.timeframe||a.market&&a.market.timeframe||'5m'),input={timestamp:a.timestamp||Date.now(),market:a.market||{},indicators:a.indicators||a.indicator||{},fundamental:a.fundamental||{},portfolio:a.portfolio||{}},selected=registry.select({strategy_ids:a.strategy_ids,symbol:symbol,timeframe:tf});if(!selected.length&&Array.isArray(a.strategies))selected=a.strategies.map(Core.normalizeLegacy);var results=selected.map(function(s){return Core.evaluateOne(s,input);}),agg=Core.aggregate(results,{min_confidence:a.min_confidence}),signals=[];if(agg.action!=='HOLD'){var candidates=results.filter(function(r){return r.matched&&r.side===agg.action;}).sort(function(x,y){return y.confidence-x.confidence;});if(candidates[0])signals.push(Core.buildSignal(candidates[0],{correlation_id:a.correlation_id||msg&&msg.request_id||''}));}stats.record(results,agg);state.lastEvaluation=new Date().toISOString();if(signals[0]){state.lastSignal=signals[0];publish('strategy.signal.generated',signals[0]);}publish('strategy.evaluation.completed',{symbol:symbol,timeframe:tf,aggregate:agg,signal_count:signals.length});return{ok:true,engine:'strategy-v2',schema:'strategy.evaluation/2.0',symbol:symbol,timeframe:tf,mode:state.mode,aggregate:agg,signals:signals,results:results,selected:results.length,execution:'INTENTION_ONLY'};}
var ACTIONS=['strategy.health','strategy.capabilities','strategy.catalog','strategy.validate','strategy.evaluate','strategy.dry_run','strategy.stats','strategy.state','strategy.reload','strategy.pause','strategy.resume','strategy.reset_stats'];
var EVENTS=['strategy.signal.generated','strategy.evaluation.completed'];
var adapter=new Adapter({root:ROOT,id:'strategy',label:'Strategy Engine v2',port:PORT,routerPort:ROUTER_PORT,version:VERSION,schema:'strategy.response/2.0',actions:ACTIONS,events:EVENTS,handlers:{
 'strategy.health':function(){return health();},
 'strategy.capabilities':function(){return{ok:true,actions:ACTIONS,events:EVENTS,execution:'INTENTION_ONLY',supervisorReady:true};},
 'strategy.catalog':function(){return{ok:true,catalog:registry.snapshot()};},
 'strategy.validate':function(a){var v=Core.validate(a.strategy||a);return{ok:v.ok,errors:v.errors||[],strategy:v.strategy||null};},
 'strategy.evaluate':function(a,m){return evaluate(a,m);},
 'strategy.dry_run':function(a,m){var r=evaluate(a,m);r.dry_run=true;r.execution='NEVER_EXECUTE';return r;},
 'strategy.stats':function(){return{ok:true,stats:stats.snapshot()};},
 'strategy.state':function(){return{ok:true,health:health(),registry:registry.snapshot(),stats:stats.snapshot()};},
 'strategy.reload':function(){return{ok:true,registry:registry.reload()};},
 'strategy.pause':function(){state.mode='PAUSED';return{ok:true,mode:state.mode};},
 'strategy.resume':function(){state.mode='RUNNING';return{ok:true,mode:state.mode};},
 'strategy.reset_stats':function(){return{ok:true,stats:stats.reset()};}
 }});
var server=http.createServer(function(req,res){if(adapter.handle(req,res))return;if(req.method==='GET'&&String(req.url).split('?')[0]==='/health')return send(res,200,health());if(req.method==='GET'&&String(req.url).split('?')[0]==='/api/catalog')return send(res,200,{ok:true,catalog:registry.snapshot()});return send(res,404,{ok:false,error:'NOT_FOUND'});});
server.on('error',function(e){log('FATAL',e.message);process.exit(12);});
server.listen(PORT,HOST,function(){log('START','Strategy Engine v2 port='+PORT+' protocol=CP/1 execution=INTENTION_ONLY');adapter.register(function(ok,e){if(!ok)log('CP_REGISTER',e&&e.message||'failed');});});
function stop(){log('STOP','signal received');server.close(function(){process.exit(0);});setTimeout(function(){process.exit(0);},1200);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
