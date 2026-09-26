'use strict';
var http=require('http'),fs=require('fs'),path=require('path');
var Adapter=require('../Core/Communication/component_cp1_adapter'),PATHS=require('../Core/Shared/paths'),SupervisorCore=require('./Core/supervisor_core');
PATHS.ensureAppRuntimeDirs();
var ROOT=PATHS.ROOT,HOST='127.0.0.1',PORT=+(process.env.IATB_SUPERVISOR_PORT||3000),ROUTER_PORT=+(process.env.ROUTER_PORT||8021),VERSION='0.1.0';
var LOG=path.join(ROOT,'.runtime','logs','supervisor.log'),core=new SupervisorCore(ROOT);
var ACTIONS=['supervisor.health','supervisor.capabilities','supervisor.status','supervisor.reload','supervisor.extensions','supervisor.llm.health','supervisor.reason'];
var EVENTS=['supervisor.reasoning.completed','supervisor.extension.loaded'];
function log(tag,msg){try{fs.appendFileSync(LOG,'['+new Date().toISOString()+'] ['+tag+'] '+String(msg||'').replace(/[\r\n]+/g,' ').slice(0,1000)+'\n');}catch(e){}}
function send(res,code,o){var b=Buffer.from(JSON.stringify(o));res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(b);}
function health(){var s=core.status();return{ok:true,service:'IA-TB Supervisor',marker:'IA-TB Supervisor',version:VERSION,pid:process.pid,host:HOST,port:PORT,routerPort:ROUTER_PORT,protocol:'CP/1',role:'ORCHESTRATOR',execution:'INTENTION_ONLY',llm:s.llm,extensions:s.extensions.length,autonomousTrading:s.autonomousTrading,uptimeSec:s.uptimeSec};}
var adapter=new Adapter({root:ROOT,id:'supervisor',label:'IA Supervisor',port:PORT,routerPort:ROUTER_PORT,version:VERSION,schema:'supervisor.response/1.0',actions:ACTIONS,events:EVENTS,handlers:{
 'supervisor.health':function(){return health();},
 'supervisor.capabilities':function(){return{ok:true,actions:ACTIONS,events:EVENTS,execution:'INTENTION_ONLY'};},
 'supervisor.status':function(){return core.status();},
 'supervisor.reload':function(){var x=core.reload();log('RELOAD','provider='+x.llm.provider);return x;},
 'supervisor.extensions':function(){return{ok:true,extensions:core.extensions.snapshot()};},
 'supervisor.llm.health':function(a){return core.llm.health(a&&a.provider).then(function(x){return{ok:true,health:x};});},
 'supervisor.reason':function(a){if(!a||!String(a.prompt||'').trim())throw new Error('SUPERVISOR_PROMPT_REQUIRED');return core.reason(a).then(function(x){log('REASON','provider='+x.response.provider+' latency='+x.response.latencyMs+'ms');return x;});}
}});
var server=http.createServer(function(req,res){var p=String(req.url||'').split('?')[0];if(adapter.handle(req,res))return;if(req.method==='GET'&&p==='/health')return send(res,200,health());if(req.method==='GET'&&p==='/api/status')return send(res,200,{ok:true,status:core.status()});return send(res,404,{ok:false,error:'NOT_FOUND'});});
server.on('error',function(e){log('FATAL',e.message);console.error('Supervisor bind error:',e.message);process.exit(30);});
server.listen(PORT,HOST,function(){log('START','port='+PORT+' protocol=CP/1 execution=INTENTION_ONLY provider='+core.llm.status().provider);adapter.register(function(ok,e){log('CP_REGISTER',ok?'OK':String(e&&e.message||'failed'));});});
function stop(){log('STOP','signal received');server.close(function(){process.exit(0);});setTimeout(function(){process.exit(0);},1500);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
