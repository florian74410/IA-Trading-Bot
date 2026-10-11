'use strict';
var http=require('http'),assert=require('assert'),path=require('path');
var ROOT=path.resolve(__dirname,'../..');
var Provider=require(path.join(ROOT,'MarketData/Provider/reference_provider'));
var Registry=require(path.join(ROOT,'Core/Admin/service_registry'));
function listen(server){return new Promise(function(resolve,reject){server.listen(0,'127.0.0.1',function(){resolve(server.address().port)});server.on('error',reject);});}
function close(server){return new Promise(function(resolve){server.close(function(){resolve()});});}
function getCandles(provider,tf){return new Promise(function(resolve,reject){provider.getCandles('BTCUSD',tf,'GMX',function(e,o){if(e)reject(e);else resolve(o)});});}
function probe(reg,id){return new Promise(function(resolve,reject){reg.probe(id,function(e,o){if(e)reject(e);else resolve(o)});});}
(async function(){
 var tf='1h',base=1700000000000;
 var core=http.createServer(function(req,res){var rows=[];for(var i=0;i<8;i++)rows.push([base+i*3600000,100+i,102+i,99+i,101+i,0]);var body=JSON.stringify({interval:'1h',candles:rows});res.writeHead(200,{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)});res.end(body);});
 var corePort=await listen(core),provider=new Provider({corePort:corePort,krakenPort:65534});
 var ok=await getCandles(provider,tf);assert.strictEqual(ok.timeframe,'1h');assert.strictEqual(ok.timeframeValidated,true);assert.strictEqual(ok.observedSpacingMs,3600000);await close(core);
 var bad=http.createServer(function(req,res){var rows=[];for(var i=0;i<8;i++)rows.push([base+i*60000,100+i,102+i,99+i,101+i,0]);var body=JSON.stringify({interval:'1h',candles:rows});res.writeHead(200,{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)});res.end(body);});
 var badPort=await listen(bad),providerBad=new Provider({corePort:badPort,krakenPort:65534}),rejected=false;try{await getCandles(providerBad,'1h')}catch(e){rejected=/TIMEFRAME_MISMATCH/.test(e.message)}assert(rejected,'wrong 1m spacing must be rejected for 1h');await close(bad);
 var health=http.createServer(function(req,res){setTimeout(function(){var body=JSON.stringify({ok:true,name:'Slow Engine',version:'test',pid:1234});res.writeHead(200,{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)});res.end(body)},1500)});
 var hp=await listen(health),reg=new Registry(ROOT);reg.spec=function(){return{id:'indicators',label:'Slow Engine',type:'ENGINE',installed:true,enabled:true,port:hp,path:'/health',marker:'Slow Engine',restartable:true,dependencies:[],optionalDependencies:[]};};var pr=await probe(reg,'indicators');assert.strictEqual(pr.online,true);assert(pr.latencyMs>=1400);await close(health);
 console.log('[TIMEFRAME-HEALTH] OK requested=1h observed=1h mismatch_rejected=true delayed_probe_online=true');
})().catch(function(e){console.error(e&&e.stack||e);process.exit(1)});
