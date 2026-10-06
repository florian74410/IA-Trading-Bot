'use strict';
var path=require('path'),CPClient=require('../../Core/Communication/cp1_client');
var ROOT=path.resolve(__dirname,'../..'),cp=new CPClient({root:ROOT,routerPort:+process.env.ROUTER_PORT||8021,timeout:20000,maxBytes:4*1024*1024});
var failures=0,stats={requests:0,ok:0,errors:0,expectedExternal:0,byAction:{}};

function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function call(target,action,args,opt){
 opt=opt||{};stats.requests++;stats.byAction[action]=(stats.byAction[action]||0)+1;
 return new Promise(function(resolve){
  cp.request(target,action,args||{},'analysis',function(e,o){
   if(e){
    stats.errors++;
    var msg=String(e.message||e);
    var expected=(opt.allowErrors||[]).some(function(x){return msg.indexOf(x)>=0;});
    if(expected){stats.expectedExternal++;console.log('[WARN] '+action+' allowed external error: '+msg);return resolve({ok:false,expected:true,error:msg});}
    failures++;console.log('[FAIL] '+action+' '+JSON.stringify(args||{})+' -> '+msg);return resolve({ok:false,error:msg});
   }
   stats.ok++;console.log('[OK] '+action+' '+JSON.stringify(args||{}));resolve({ok:true,data:o});
  });
 });
}
function burst(label,jobs){
 console.log('\n=== BURST '+label+' ('+jobs.length+') ===');
 return Promise.all(jobs.map(function(j){return call(j.target||'marketdata',j.action,j.args,j.opt);}));
}

async function main(){
 console.log('IA-TB Shadow Runtime Workload Auto v1');
 console.log('Mode: realistic mixed workload; no intentional quota stress');

 await call('marketdata','marketdata.health',{});
 await call('marketdata','marketdata.financial.snapshot',{force:true});
 await sleep(800);

 var charts=[
  ['BTCUSD','1h','OKX'],['ETHUSD','1h','OKX'],['SOLUSD','4h','OKX'],
  ['BTCUSD','15m','KRAKEN'],['ETHUSD','1h','KRAKEN'],
  ['BTCUSD','1h','BYBIT'],['ETHUSD','4h','BYBIT'],
  ['BTCUSD','1h','HYPERLIQUID']
 ];
 for(var i=0;i<charts.length;i++){
  var x=charts[i];
  await call('marketdata','marketdata.candles',{symbol:x[0],timeframe:x[1],limit:120,force:true,source:x[2]},{allowErrors:['PROVIDER_HTTP_451','PROVIDER_HTTP_403','PROVIDER_HTTP_429','OHLCV_EMPTY','SYMBOL','UNAVAILABLE']});
  await sleep(350);
 }

 await call('marketdata','marketdata.candles',{symbol:'BTCUSD',timeframe:'1h',limit:120,force:true,source:'BINANCE'},{allowErrors:['PROVIDER_HTTP_451']});

 await burst('same-candles-multi-consumer',[
  {action:'marketdata.candles',args:{symbol:'BTCUSD',timeframe:'1h',limit:120,force:true,source:'OKX'}},
  {action:'marketdata.candles',args:{symbol:'BTCUSD',timeframe:'1h',limit:120,force:true,source:'OKX'}},
  {action:'marketdata.candles',args:{symbol:'BTCUSD',timeframe:'1h',limit:120,force:true,source:'OKX'}}
 ]);
 await sleep(700);

 await burst('financial-multi-consumer',[
  {action:'marketdata.financial.snapshot',args:{force:true}},
  {target:'indicator',action:'indicator.financial_context',args:{scope:'ALL'}},
  {target:'liquidity',action:'liquidity.financial',args:{scope:'ALL'}}
 ]);
 await sleep(900);

 for(i=0;i<3;i++){await call('marketdata','marketdata.financial.snapshot',{force:false});await sleep(250);}

 var micros=['OKX','BYBIT','HYPERLIQUID','KRAKEN'];
 for(i=0;i<micros.length;i++){
  await call('marketdata','marketdata.microstructure.snapshot',{symbol:'BTCUSD',source:micros[i],depth:20,force:true},{allowErrors:['PROVIDER_HTTP_451','PROVIDER_HTTP_403','PROVIDER_HTTP_429','EMPTY','UNAVAILABLE','UNSUPPORTED']});
  await sleep(400);
 }
 await call('marketdata','marketdata.derivatives.open_interest',{symbol:'BTCUSD',sources:['OKX','BYBIT','HYPERLIQUID']},{allowErrors:['PROVIDER_HTTP_451','PROVIDER_HTTP_403','PROVIDER_HTTP_429','EMPTY','UNAVAILABLE']});
 await sleep(500);

 await call('marketdata','marketdata.dex.liquidity.snapshot',{symbol:'BTCUSD',force:true},{allowErrors:['PROVIDER_HTTP_429','EMPTY','UNAVAILABLE']});
 await call('marketdata','marketdata.dex.liquidity.snapshot',{symbol:'BTCUSD',force:false},{allowErrors:['PROVIDER_HTTP_429','EMPTY','UNAVAILABLE']});

 var cycle2=[['BTCUSD','4h','OKX'],['ETHUSD','15m','OKX'],['SOLUSD','1h','KRAKEN'],['BTCUSD','15m','BYBIT']];
 for(i=0;i<cycle2.length;i++){
  x=cycle2[i];
  await call('marketdata','marketdata.candles',{symbol:x[0],timeframe:x[1],limit:80,force:true,source:x[2]},{allowErrors:['PROVIDER_HTTP_451','PROVIDER_HTTP_403','PROVIDER_HTTP_429','OHLCV_EMPTY','SYMBOL','UNAVAILABLE']});
  await sleep(300);
 }

 console.log('\n=== WORKLOAD SUMMARY ===');
 console.log(JSON.stringify(stats,null,2));
 console.log('Runtime Workload Auto: '+(failures?'FAIL':'PASS')+' ('+failures+' unexpected error(s))');
 process.exitCode=failures?1:0;
}
main().catch(function(e){console.error(e&&e.stack||e);process.exit(1);});
