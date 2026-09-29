'use strict';
var http=require('http'),fail=0,pending=0;
function get(port,path,cb){pending++;var q=http.get({host:'127.0.0.1',port:port,path:path,timeout:12000,headers:{Accept:'application/json'}},function(r){var a=[];r.on('data',function(c){a.push(c)});r.on('end',function(){pending--;var o;try{o=JSON.parse(Buffer.concat(a).toString('utf8')||'{}')}catch(e){return cb(new Error('JSON_INVALID '+port+path))}if((r.statusCode||500)>=400)return cb(new Error((o&&o.error)||('HTTP_'+r.statusCode)));cb(null,o)});});q.on('timeout',function(){q.destroy(new Error('TIMEOUT '+port+path))});q.on('error',function(e){pending--;cb(e)});}
function ok(v,m){console.log((v?'[OK]   ':'[FAIL] ')+m);if(!v)fail++;}
function done(){setTimeout(function(){if(pending)return done();console.log('\nMarket Data Collector V2.0 runtime audit: '+(fail?'FAIL':'PASS')+' ('+fail+' error(s))');process.exitCode=fail?1:0;},30);}
get(8013,'/health',function(e,o){ok(!e&&o&&o.ok&&String(o.version)==='2.0.0','Collector 8013 identifies as V2.0.0');});
get(8013,'/audit',function(e,o){ok(!e&&o&&o.ok&&o.status!=='FAIL','Collector self-audit is PASS/WARN');ok(!e&&o&&o.routing&&o.routing.distribution==='ROUTER_CP1','Financial distribution is Router CP/1');});
get(8013,'/financial/snapshot?force=1',function(e,o){
 ok(!e&&o&&o.cefi&&o.cefi.provider==='COINGECKO','CoinGecko CeFi snapshot collected');
 ok(!e&&o&&o.defi&&o.defi.provider==='DEFILLAMA','DeFiLlama DeFi snapshot collected');
 ok(!e&&o&&o.meta&&o.meta.quality&&o.meta.quality.ok===true,'Financial snapshot passed V2 quality gate');
 ok(!e&&o&&o.cefi&&o.cefi.cexCoverage&&o.cefi.cexCoverage.complete===false,'CEX sampled volume is explicitly marked partial');
 ok(!e&&o&&o.defi&&o.defi.tvlAggregateSource,'DeFi TVL aggregate provenance present');
});
get(8021,'/market-data/financial/snapshot',function(e,o){ok(!e&&o&&o.cefi&&o.defi,'Router exposes financial snapshot through Market Data route');});
get(8014,'/financial?scope=ALL',function(e,o){ok(!e&&o&&o.source==='MARKET_DATA_VIA_ROUTER','Liquidity consumes financial data through Router');});
get(8012,'/api/financial-context?scope=ALL',function(e,o){ok(!e&&o&&o.source==='MARKET_DATA_VIA_ROUTER','Indicator Engine consumes financial data through Router');});
get(8013,'/candles?symbol=BTCUSD&interval=1h&limit=100&source=BINANCE',function(e,o){
 var a=o&&o.candles||[],valid=a.length>10&&a.every(function(x){return Array.isArray(x)&&x.length>=6&&x.slice(0,6).every(function(v){return isFinite(+v)})&&+x[1]>0&&+x[2]>=Math.max(+x[1],+x[4])&&+x[3]<=Math.min(+x[1],+x[4])&&+x[5]>=0;});
 ok(!e&&valid,'BINANCE OHLCV values satisfy price/volume invariants');
});
done();