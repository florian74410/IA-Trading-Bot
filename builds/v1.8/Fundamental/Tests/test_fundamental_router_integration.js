'use strict';
var assert=require('assert'),fs=require('fs'),http=require('http'),os=require('os'),path=require('path');
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-fund-router-')),port=18015;process.env.IATB_FUNDAMENTAL_PORT=String(port);
var CP=require('../../Core/Communication/communication_protocol_v1'),Router=require('../../Core/Communication/communication_router_v1'),CPRuntime=require('../Engine/fundamental_cp');
var storage={summary:function(){return{rawItems:3};},domainCoverage:function(){return[];},context:function(q){return{q:q};},rawItems:function(){return[];},getRawItem:function(id){return{id:id};},listSources:function(){return[];},providerDashboard:function(){return{total:0,counts:{},types:[],providers:[]};}};
var collector={running:false,lastRun:null,collect:function(o,cb){cb(null,{finishedAt:Date.now(),collected:0,errors:0});}};
function send(res,code,obj){var b=Buffer.from(JSON.stringify(obj));res.writeHead(code,{'Content-Type':'application/json','Content-Length':b.length});res.end(b);}
function body(req,cb){var a=[];req.on('data',function(c){a.push(c);});req.on('end',function(){try{cb(null,JSON.parse(Buffer.concat(a).toString('utf8')||'{}'));}catch(e){cb(e);}});req.on('error',cb);}
var rt=CPRuntime.create({storage:storage,collector:collector,appRoot:tmp,port:port,routerPort:19999,send:send,readBody:body,version:'1.7.9'}),server=http.createServer(function(req,res){if(req.method==='POST'&&req.url==='/cp/v1')return rt.handle(req,res);send(res,404,{ok:false,error:'NOT_FOUND'});});
function route(router,message){return new Promise(function(resolve,reject){router.route(message,function(e,r){if(e)reject(e);else resolve(r);});});}
server.listen(port,'127.0.0.1',async function(){try{
 var router=new Router(tmp),registered=router.register(rt.descriptor());assert.strictEqual(registered.id,'fundamental');
 var q=CP.makeRequest('fundamental','fundamental.summary',{},'analysis'),r=await route(router,q);assert.strictEqual(r.protocol,'CP/1');assert.strictEqual(r.engine,'fundamental');assert.strictEqual(r.status,'OK');assert.strictEqual(r.data.schema,'fundamental.summary/1.0');assert.strictEqual(r.data.summary.rawItems,3);assert.strictEqual(CP.validateResponse(r,q).ok,true);
 var bad=CP.makeRequest('fundamental','fundamental.summary',{unexpected:true},'analysis'),rejected=false;try{await route(router,bad);}catch(e){rejected=/CP_ARGUMENT_UNEXPECTED/.test(e.message);}assert.strictEqual(rejected,true);
 var ev=CP.makeEvent('fundamental','fundamental.collection.updated',{collected:1},{schema:'fundamental.event/1.0',severity:'NOTICE'}),stored=router.publishEvent(ev);assert.strictEqual(stored.type,'fundamental.collection.updated');assert.strictEqual(router.listEvents({source:'fundamental'}).count,1);
 console.log('Fundamental Router CP/1 integration: PASS');
 }catch(e){console.error(e&&e.stack||e);process.exitCode=1;}finally{server.close(function(){try{fs.rmSync(tmp,{recursive:true,force:true});}catch(_){};});}});
