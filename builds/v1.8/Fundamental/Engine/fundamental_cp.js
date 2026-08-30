'use strict';
/* IA-TB v1.7.9 - Fundamental Engine CP/1 boundary.
   INFORMATION_ONLY: exposes normalized read/collection capabilities to the
   Application Router. It never executes trading actions and never talks to
   another Engine directly. */
var http=require('http'),CP=require('../../Core/Communication/communication_protocol_v1');
var CAPABILITIES=['fundamental.summary','fundamental.context','fundamental.items','fundamental.item','fundamental.sources','fundamental.providers','fundamental.collect','fundamental.capabilities'];
var EVENTS=['fundamental.collection.updated'];
function clip(v,n){v=String(v==null?'':v);return v.length>n?v.slice(0,n):v;}
function limit(v,d,max){v=Math.round(+v||d);return Math.max(1,Math.min(max,v));}
function create(opt){
 opt=opt||{};var storage=opt.storage,collector=opt.collector,APP_ROOT=opt.appRoot,PORT=+opt.port,ROUTER_PORT=+opt.routerPort||8000,send=opt.send,readBody=opt.readBody,version=String(opt.version||'1.7.9');
 if(!storage||!collector||!APP_ROOT||!PORT||typeof send!=='function'||typeof readBody!=='function')throw new Error('FUNDAMENTAL_CP_OPTIONS_INVALID');
 function providerPayload(){var pd=storage.providerDashboard();return{schema:'fundamental.providers/1.0',summary:{total:pd.total,counts:pd.counts,types:pd.types},providers:pd.providers||[]};}
 function action(m,cb){var a=m.arguments||{};
  try{
   if(m.action==='fundamental.capabilities')return cb(null,{schema:'fundamental.capabilities/1.0',engine:'fundamental',mode:'INFORMATION_ONLY',protocol:'CP/1',capabilities:CAPABILITIES.slice(),events:EVENTS.slice()});
   if(m.action==='fundamental.summary')return cb(null,{schema:'fundamental.summary/1.0',mode:'INFORMATION_ONLY',summary:storage.summary(),domains:storage.domainCoverage(),collector:{running:!!collector.running,lastRun:collector.lastRun||null}});
   if(m.action==='fundamental.context')return cb(null,{schema:'fundamental.context/1.0',mode:'INFORMATION_ONLY',query:clip(a.q,256),context:storage.context(clip(a.q,256))});
   if(m.action==='fundamental.items')return cb(null,{schema:'fundamental.items/1.0',mode:'INFORMATION_ONLY',items:storage.rawItems({source:clip(a.source,96),feed:clip(a.feed,96),q:clip(a.q,256),since:clip(a.since,64),limit:limit(a.limit,50,200)})});
   if(m.action==='fundamental.item'){var it=storage.getRawItem(Math.round(+a.id));if(!it)return cb(new Error('RAW_ITEM_NOT_FOUND'));return cb(null,{schema:'fundamental.item/1.0',mode:'INFORMATION_ONLY',item:it});}
   if(m.action==='fundamental.sources')return cb(null,{schema:'fundamental.sources/1.0',mode:'INFORMATION_ONLY',sources:storage.listSources({q:clip(a.q,256),domain:clip(a.domain,96),enabled:typeof a.enabled==='boolean'?a.enabled:undefined,limit:limit(a.limit,100,200)})});
   if(m.action==='fundamental.providers')return cb(null,providerPayload());
   if(m.action==='fundamental.collect')return collector.collect({all:a.all===true},function(e,r){if(e)return cb(e);publishCollectionEvent(r);cb(null,{schema:'fundamental.collection/1.0',mode:'INFORMATION_ONLY',result:r||{}});});
   return cb(new Error('CP_ACTION_FORBIDDEN'));
  }catch(e){cb(e);}
 }
 function handle(req,res){var token=String(req.headers['x-iatb-cp-token']||'');if(!CP.verifyToken(APP_ROOT,token))return send(res,403,{ok:false,error:'CP_AUTH_FAILED'});readBody(req,function(e,m){if(e)return send(res,400,{ok:false,error:String(e.message||e)});var allow=Object.create(null);CAPABILITIES.forEach(function(x){allow[x]=1;});var v=CP.validateRequest(m,allow);if(!v.ok)return send(res,400,{ok:false,error:v.errors[0],errors:v.errors});if(v.target!=='fundamental')return send(res,404,{ok:false,error:'CP_TARGET_INVALID'});var started=Date.now();action(m,function(x,d){if(x)return send(res,400,CP.makeResponse(m,'ERROR',{error:String(x.message||x).slice(0,240)},{engine:'fundamental',action:m.action,schema:'cp.error/1.0',duration_ms:Date.now()-started}));send(res,200,CP.makeResponse(m,'OK',d,{engine:'fundamental',action:m.action,schema:d&&d.schema||'fundamental.response/1.0',duration_ms:Date.now()-started}));});});}
 function postRouter(path,obj,timeout,cb){var token;try{token=CP.ensureSecret(APP_ROOT);}catch(e){if(cb)cb(false,e);return;}var b=Buffer.from(JSON.stringify(obj)),done=false,q=http.request({host:'127.0.0.1',port:ROUTER_PORT,path:path,method:'POST',timeout:timeout||1800,headers:{'Content-Type':'application/json','Content-Length':b.length,'X-IATB-CP-Token':token}},function(r){r.resume();r.on('end',function(){if(done)return;done=true;if(cb)cb((r.statusCode||500)<300,null,r.statusCode);});});q.on('timeout',function(){q.destroy(new Error('timeout'));});q.on('error',function(e){if(done)return;done=true;if(cb)cb(false,e);});q.end(b);}
 function descriptor(){return{id:'fundamental',label:'Fundamental Engine',host:'127.0.0.1',port:PORT,cpPath:'/cp/v1',healthPath:'/health',version:version,schemaVersion:'fundamental.response/1.0',capabilities:CAPABILITIES.slice(),events:EVENTS.slice()};}
 function registerWithRouter(cb){postRouter('/communication/v1/register',descriptor(),1800,function(ok){if(cb)cb(!!ok);});}
 function publishCollectionEvent(result){var data={mode:'INFORMATION_ONLY',finishedAt:result&&result.finishedAt||Date.now(),collected:+(result&&result.collected||result&&result.items||0),errors:+(result&&result.errors||0)},ev=CP.makeEvent('fundamental','fundamental.collection.updated',data,{schema:'fundamental.event/1.0',severity:data.errors?'WARNING':'NOTICE'});postRouter('/communication/v1/event',ev,1800);}
 return{handle:handle,action:action,registerWithRouter:registerWithRouter,publishCollectionEvent:publishCollectionEvent,descriptor:descriptor,capabilities:CAPABILITIES.slice(),events:EVENTS.slice()};
}
module.exports={create:create,CAPABILITIES:CAPABILITIES,EVENTS:EVENTS};
