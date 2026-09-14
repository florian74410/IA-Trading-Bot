'use strict';
/* IA-TB v1.4.3 — Global Restart Helper.
   Aucun argument utilisateur. Le Launcher Supervisor reste vivant et relance le Core.
*/
var fs=require('fs'),path=require('path'),child=require('child_process'),Registry=require('./service_registry'),PATHS=require('../Shared/paths');
var ROOT=PATHS.ROOT;
PATHS.ensureAppRuntimeDirs();
var RESTART_LOG=PATHS.RuntimeLogs.restart,LEGACY_RESTART_LOG=path.join(ROOT,'Core','Admin','restart_all.log');
/* Compatibility cleanup: server.js may still open the historical path before this
   helper starts. On macOS the open descriptor stays valid after unlink, while the
   canonical persistent copy is written below. This prevents a second log file. */
try{if(fs.existsSync(LEGACY_RESTART_LOG))fs.unlinkSync(LEGACY_RESTART_LOG);}catch(e){}
var P={
 router:+(process.env.ROUTER_PORT||8021),
 core:+(process.env.IATB_PUBLIC_PORT||process.env.CORE_PUBLIC_PORT||8001),
 kraken:+(process.env.KRAKEN_ADDON_PORT||8011),
 indicators:+(process.env.IATB_INDICATOR_PORT||8012),
 marketdata:+(process.env.IATB_MARKET_DATA_PORT||8013),
 liquidity:+(process.env.IATB_LIQUIDITY_PORT||8014),
 fundamental:+(process.env.IATB_FUNDAMENTAL_PORT||8015),
 trading:+(process.env.IATB_TRADING_ENGINE_PORT||8016),
 firewall:+(process.env.IATB_FIREWALL_PORT||process.env.IATB_TRADING_FIREWALL_PORT||8017),
 strategy:+(process.env.IATB_STRATEGY_PORT||8018),
 risk:+(process.env.IATB_RISK_ENGINE_PORT||8019),
 portfolio:+(process.env.IATB_PORTFOLIO_PORT||8020)
};
var reg=new Registry(ROOT,{ports:P}),errors=[];
function now(){return new Date().toISOString();}
function log(s){var line=now()+' '+s;try{fs.appendFileSync(RESTART_LOG,line+'\n','utf8');}catch(e){}console.log(line);}
function safeRoot(rel){var p=path.resolve(ROOT,rel);if(p.indexOf(ROOT+path.sep)!==0)throw new Error('PATH_REJECTED');return p;}
function waitRouter(want,deadline,cb){
 if(Date.now()>deadline)return cb(new Error('ROUTER_TIMEOUT'));
 reg.probe('router',function(e,x){
  if(!e&&!!x.online===!!want)return cb(null,x);
  setTimeout(function(){waitRouter(want,deadline,cb)},180);
 });
}
function spawnRouter(cb){
 var script=safeRoot('Core/Router/router.js'),logPath=PATHS.RuntimeLogs.router;
 if(!fs.existsSync(script))return cb(new Error('ROUTER_SCRIPT_INVALID'));
 var fd;try{fd=fs.openSync(logPath,'a')}catch(e){return cb(e)}
 var env=Object.assign({},process.env,{
  CORE_PUBLIC_PORT:String(P.core),KRAKEN_ADDON_PORT:String(P.kraken),
  IATB_INDICATOR_PORT:String(P.indicators),IATB_MARKET_DATA_PORT:String(P.marketdata),
  IATB_LIQUIDITY_PORT:String(P.liquidity),IATB_FUNDAMENTAL_PORT:String(P.fundamental),IATB_TRADING_ENGINE_PORT:String(P.trading),IATB_FIREWALL_PORT:String(P.firewall),IATB_TRADING_FIREWALL_PORT:String(P.firewall),IATB_STRATEGY_PORT:String(P.strategy),IATB_RISK_ENGINE_PORT:String(P.risk),IATB_PORTFOLIO_PORT:String(P.portfolio),ROUTER_PORT:String(P.router)
 });
 var proc;
 try{proc=child.spawn(process.execPath,[script],{cwd:ROOT,env:env,stdio:['ignore',fd,fd],detached:true});}
 catch(e){try{fs.closeSync(fd)}catch(x){}return cb(e)}
 try{fs.closeSync(fd)}catch(x){}
 proc.unref();
 waitRouter(true,Date.now()+9000,function(e,x){if(e)return cb(e);cb(null,x);});
}
function restartRouter(cb){
 reg.probe('router',function(e,x){
  if(e)return cb(e);
  function launch(){spawnRouter(cb);}
  if(!x.online)return launch();
  if(!x.pid||x.pid===process.pid)return cb(new Error('ROUTER_PID_UNSAFE'));
  try{process.kill(x.pid,'SIGTERM')}catch(k){return cb(k)}
  waitRouter(false,Date.now()+3500,function(downErr){
   if(!downErr)return launch();
   try{process.kill(x.pid,'SIGKILL')}catch(ignore){}
   waitRouter(false,Date.now()+1800,function(){launch();});
  });
 });
}
function next(list,i,cb){
 if(i>=list.length)return cb();
 var id=list[i];log('Restart '+id+'...');
 reg.restart(id,function(e,x){
  if(e){errors.push(id+': '+e.message);log('ERREUR '+id+' : '+e.message);}
  else log('OK '+id+' PID '+(x.pid||'?'));
  next(list,i+1,cb);
 });
}
log('=== REDÉMARRAGE GLOBAL IA-TB ===');
next(['kraken','indicators','marketdata','liquidity','fundamental','portfolio','trading','firewall','strategy','risk'],0,function(){
 log('Restart router...');
 restartRouter(function(e,x){
  if(e){errors.push('router: '+e.message);log('ERREUR router : '+e.message);}
  else log('OK router PID '+(x.pid||'?'));
  if(errors.length){log('FIN AVEC ERREURS : '+errors.join(' | '));process.exitCode=2;}
  else log('FIN OK — services externes relancés. Core géré par Launcher Supervisor.');
  setTimeout(function(){process.exit();},100);
 });
});
