'use strict';
var assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),CPRuntime=require('../Engine/fundamental_cp'),Router=require('../../Core/Communication/communication_router_v1');
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-fundamental-cp-'));
var storage={
 summary:function(){return{rawItems:7,sources:2};},domainCoverage:function(){return[{domain:'crypto',count:7}];},
 context:function(q){return{query:q,items:2};},rawItems:function(o){return[{id:1,title:'BTC',limit:o.limit}];},getRawItem:function(id){return id===1?{id:1,title:'BTC'}:null;},
 listSources:function(o){return[{code:'TEST',enabled:o.enabled!==false}];},providerDashboard:function(){return{total:2,counts:{RSS:1,WEB:1},types:['RSS','WEB'],providers:[{type:'RSS'},{type:'WEB'}]};}
};
var collector={running:false,lastRun:null,collect:function(o,cb){this.lastRun={finishedAt:Date.now(),all:o.all};cb(null,{finishedAt:this.lastRun.finishedAt,collected:o.all?4:2,errors:0});}};
function noopSend(){}function noopBody(){}
var rt=CPRuntime.create({storage:storage,collector:collector,appRoot:tmp,port:8015,routerPort:8000,send:noopSend,readBody:noopBody,version:'1.7.9'});
function act(action,args){return new Promise(function(resolve,reject){rt.action({action:action,arguments:args||{}},function(e,d){if(e)reject(e);else resolve(d);});});}
(async function(){
 assert.strictEqual(rt.descriptor().id,'fundamental');
 assert.strictEqual(rt.descriptor().cpPath,'/cp/v1');
 assert.strictEqual(rt.descriptor().schemaVersion,'fundamental.response/1.0');
 assert(rt.capabilities.indexOf('fundamental.summary')>=0);
 assert(rt.capabilities.indexOf('fundamental.collect')>=0);
 assert.strictEqual(rt.capabilities.some(function(x){return x.indexOf('trading.')===0;}),false);
 assert.deepStrictEqual(rt.events,['fundamental.collection.updated']);
 var c=await act('fundamental.capabilities');assert.strictEqual(c.protocol,'CP/1');assert.strictEqual(c.mode,'INFORMATION_ONLY');
 var s=await act('fundamental.summary');assert.strictEqual(s.schema,'fundamental.summary/1.0');assert.strictEqual(s.summary.rawItems,7);
 var x=await act('fundamental.context',{q:'BTC'});assert.strictEqual(x.context.query,'BTC');
 var items=await act('fundamental.items',{limit:12});assert.strictEqual(items.items[0].limit,12);
 var item=await act('fundamental.item',{id:1});assert.strictEqual(item.item.id,1);
 var sources=await act('fundamental.sources',{enabled:true});assert.strictEqual(sources.sources.length,1);
 var providers=await act('fundamental.providers');assert.strictEqual(providers.summary.total,2);
 var col=await act('fundamental.collect',{all:true});assert.strictEqual(col.result.collected,4);
 var notFound=false;try{await act('fundamental.item',{id:99});}catch(e){notFound=/RAW_ITEM_NOT_FOUND/.test(e.message);}assert.strictEqual(notFound,true);
 var router=new Router(tmp);var caps=router.capabilities();var f=caps.engines.filter(function(e){return e.id==='fundamental';})[0];assert(f);assert(f.capabilities.indexOf('fundamental.summary')>=0);assert(f.events.indexOf('fundamental.collection.updated')>=0);
 var registered=router.register(rt.descriptor());assert.strictEqual(registered.id,'fundamental');assert.strictEqual(registered.dynamic,true);
 console.log('Fundamental CP/1 contract tests: PASS');
})().catch(function(e){console.error(e&&e.stack||e);process.exitCode=1;}).then(function(){try{fs.rmSync(tmp,{recursive:true,force:true});}catch(_){};});
