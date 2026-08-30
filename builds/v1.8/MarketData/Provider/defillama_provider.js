'use strict';
/* IA-Trading-Bot v1.7.9 - DefiLlama complementary analytics provider.
   Free public endpoints only. No API key required.
   DefiLlama is NOT treated as an exchange OHLCV feed; it exposes DeFi metrics and token/market analytics.
*/
var https=require('https'),URL=require('url').URL;
function enc(v){return encodeURIComponent(String(v==null?'':v).trim());}
function qs(o){var a=[];Object.keys(o||{}).forEach(function(k){var v=o[k];if(v==null||v==='')return;a.push(enc(k)+'='+enc(v));});return a.length?'?'+a.join('&'):'';}
function getJson(url,cb){var u=new URL(url),done=false,q=https.get({hostname:u.hostname,path:u.pathname+u.search,timeout:15000,headers:{Accept:'application/json','User-Agent':'IA-Trading-Bot/1.7.9'}},function(r){var a=[],n=0;r.on('data',function(c){n+=c.length;if(n<=8*1024*1024)a.push(c);});r.on('end',function(){if(done)return;done=true;var text=Buffer.concat(a).toString('utf8'),o;try{o=JSON.parse(text||'null');}catch(e){return cb(new Error('DEFILLAMA_JSON_INVALID'));}if((r.statusCode||500)>=400)return cb(new Error('DEFILLAMA_HTTP_'+r.statusCode));cb(null,o);});});q.on('timeout',function(){q.destroy(new Error('DEFILLAMA_TIMEOUT'));});q.on('error',function(e){if(done)return;done=true;cb(e);});}
function P(){this.name='DEFILLAMA';this.type='API';this.lastOkAt=0;this.lastError='';this.lastCommand='';}
P.prototype.status=function(){return{connected:this.lastOkAt>0,lastOkAt:this.lastOkAt||null,lastError:this.lastError||'',lastCommand:this.lastCommand||null,authentication:'PUBLIC_NO_KEY',complementary:true,nativeExchangeData:false};};
P.prototype.getCandles=function(symbol,tf,cb){cb(new Error('DEFILLAMA_CANDLES_NOT_SUPPORTED'));};
P.prototype.capabilities=function(){return[
 {command:'defillama.protocols.list',scope:'TVL',implemented:true,auth:'NONE'},
 {command:'defillama.protocol.get',scope:'TVL',implemented:true,auth:'NONE'},
 {command:'defillama.protocol.tvl',scope:'TVL',implemented:true,auth:'NONE'},
 {command:'defillama.chains.list',scope:'TVL',implemented:true,auth:'NONE'},
 {command:'defillama.chain.history',scope:'TVL',implemented:true,auth:'NONE'},
 {command:'defillama.prices.current',scope:'TOKEN_PRICES',implemented:true,auth:'NONE'},
 {command:'defillama.prices.historical',scope:'TOKEN_PRICES',implemented:true,auth:'NONE'},
 {command:'defillama.prices.chart',scope:'TOKEN_PRICES',implemented:true,auth:'NONE'},
 {command:'defillama.prices.percentage',scope:'TOKEN_PRICES',implemented:true,auth:'NONE'},
 {command:'defillama.prices.first',scope:'TOKEN_PRICES',implemented:true,auth:'NONE'},
 {command:'defillama.block.by_timestamp',scope:'CHAIN',implemented:true,auth:'NONE'},
 {command:'defillama.stablecoins.list',scope:'STABLECOINS',implemented:true,auth:'NONE'},
 {command:'defillama.stablecoins.history_all',scope:'STABLECOINS',implemented:true,auth:'NONE'},
 {command:'defillama.stablecoins.history_chain',scope:'STABLECOINS',implemented:true,auth:'NONE'},
 {command:'defillama.stablecoin.get',scope:'STABLECOINS',implemented:true,auth:'NONE'},
 {command:'defillama.stablecoins.chains',scope:'STABLECOINS',implemented:true,auth:'NONE'},
 {command:'defillama.stablecoins.prices',scope:'STABLECOINS',implemented:true,auth:'NONE'},
 {command:'defillama.yields.pools',scope:'YIELDS',implemented:true,auth:'NONE'},
 {command:'defillama.yields.chart',scope:'YIELDS',implemented:true,auth:'NONE'},
 {command:'defillama.dex.overview',scope:'DEX_VOLUME',implemented:true,auth:'NONE'},
 {command:'defillama.dex.overview_chain',scope:'DEX_VOLUME',implemented:true,auth:'NONE'},
 {command:'defillama.dex.summary',scope:'DEX_VOLUME',implemented:true,auth:'NONE'},
 {command:'defillama.options.overview',scope:'OPTIONS_VOLUME',implemented:true,auth:'NONE'},
 {command:'defillama.options.overview_chain',scope:'OPTIONS_VOLUME',implemented:true,auth:'NONE'},
 {command:'defillama.options.summary',scope:'OPTIONS_VOLUME',implemented:true,auth:'NONE'},
 {command:'defillama.open_interest.overview',scope:'OPEN_INTEREST',implemented:true,auth:'NONE'},
 {command:'defillama.fees.overview',scope:'FEES_REVENUE',implemented:true,auth:'NONE'},
 {command:'defillama.fees.overview_chain',scope:'FEES_REVENUE',implemented:true,auth:'NONE'},
 {command:'defillama.fees.summary',scope:'FEES_REVENUE',implemented:true,auth:'NONE'}
 ];};
P.prototype.executeCommand=function(command,args,cb){var self=this,c=String(command||''),a=args&&typeof args==='object'?args:{},url='';
 switch(c){
 case'defillama.protocols.list':url='https://api.llama.fi/protocols';break;
 case'defillama.protocol.get':if(!a.protocol)return cb(new Error('DEFILLAMA_PROTOCOL_REQUIRED'));url='https://api.llama.fi/protocol/'+enc(a.protocol);break;
 case'defillama.protocol.tvl':if(!a.protocol)return cb(new Error('DEFILLAMA_PROTOCOL_REQUIRED'));url='https://api.llama.fi/tvl/'+enc(a.protocol);break;
 case'defillama.chains.list':url='https://api.llama.fi/v2/chains';break;
 case'defillama.chain.history':url='https://api.llama.fi/v2/historicalChainTvl'+(a.chain?'/'+enc(a.chain):'');break;
 case'defillama.prices.current':if(!a.coins)return cb(new Error('DEFILLAMA_COINS_REQUIRED'));url='https://coins.llama.fi/prices/current/'+enc(a.coins);break;
 case'defillama.prices.historical':if(!a.timestamp||!a.coins)return cb(new Error('DEFILLAMA_TIMESTAMP_COINS_REQUIRED'));url='https://coins.llama.fi/prices/historical/'+enc(a.timestamp)+'/'+enc(a.coins);break;
 case'defillama.prices.chart':if(!a.coins)return cb(new Error('DEFILLAMA_COINS_REQUIRED'));url='https://coins.llama.fi/chart/'+enc(a.coins)+qs({start:a.start,span:a.span,period:a.period,searchWidth:a.searchWidth});break;
 case'defillama.prices.percentage':if(!a.coins)return cb(new Error('DEFILLAMA_COINS_REQUIRED'));url='https://coins.llama.fi/percentage/'+enc(a.coins)+qs({timestamp:a.timestamp,lookForward:a.lookForward,period:a.period});break;
 case'defillama.prices.first':if(!a.coins)return cb(new Error('DEFILLAMA_COINS_REQUIRED'));url='https://coins.llama.fi/prices/first/'+enc(a.coins);break;
 case'defillama.block.by_timestamp':if(!a.chain||!a.timestamp)return cb(new Error('DEFILLAMA_CHAIN_TIMESTAMP_REQUIRED'));url='https://coins.llama.fi/block/'+enc(a.chain)+'/'+enc(a.timestamp);break;
 case'defillama.stablecoins.list':url='https://stablecoins.llama.fi/stablecoins'+qs({includePrices:a.includePrices===false?'false':'true'});break;
 case'defillama.stablecoins.history_all':url='https://stablecoins.llama.fi/stablecoincharts/all';break;
 case'defillama.stablecoins.history_chain':if(!a.chain)return cb(new Error('DEFILLAMA_CHAIN_REQUIRED'));url='https://stablecoins.llama.fi/stablecoincharts/'+enc(a.chain);break;
 case'defillama.stablecoin.get':if(!a.asset)return cb(new Error('DEFILLAMA_ASSET_REQUIRED'));url='https://stablecoins.llama.fi/stablecoin/'+enc(a.asset);break;
 case'defillama.stablecoins.chains':url='https://stablecoins.llama.fi/stablecoinchains';break;
 case'defillama.stablecoins.prices':url='https://stablecoins.llama.fi/stablecoinprices';break;
 case'defillama.yields.pools':url='https://yields.llama.fi/pools';break;
 case'defillama.yields.chart':if(!a.pool)return cb(new Error('DEFILLAMA_POOL_REQUIRED'));url='https://yields.llama.fi/chart/'+enc(a.pool);break;
 case'defillama.dex.overview':url='https://api.llama.fi/overview/dexs'+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown,dataType:a.dataType});break;
 case'defillama.dex.overview_chain':if(!a.chain)return cb(new Error('DEFILLAMA_CHAIN_REQUIRED'));url='https://api.llama.fi/overview/dexs/'+enc(a.chain)+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown,dataType:a.dataType});break;
 case'defillama.dex.summary':if(!a.protocol)return cb(new Error('DEFILLAMA_PROTOCOL_REQUIRED'));url='https://api.llama.fi/summary/dexs/'+enc(a.protocol)+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown});break;
 case'defillama.options.overview':url='https://api.llama.fi/overview/options'+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown,dataType:a.dataType});break;
 case'defillama.options.overview_chain':if(!a.chain)return cb(new Error('DEFILLAMA_CHAIN_REQUIRED'));url='https://api.llama.fi/overview/options/'+enc(a.chain)+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown,dataType:a.dataType});break;
 case'defillama.options.summary':if(!a.protocol)return cb(new Error('DEFILLAMA_PROTOCOL_REQUIRED'));url='https://api.llama.fi/summary/options/'+enc(a.protocol)+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown});break;
 case'defillama.open_interest.overview':url='https://api.llama.fi/overview/open-interest';break;
 case'defillama.fees.overview':url='https://api.llama.fi/overview/fees'+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown,dataType:a.dataType});break;
 case'defillama.fees.overview_chain':if(!a.chain)return cb(new Error('DEFILLAMA_CHAIN_REQUIRED'));url='https://api.llama.fi/overview/fees/'+enc(a.chain)+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown,dataType:a.dataType});break;
 case'defillama.fees.summary':if(!a.protocol)return cb(new Error('DEFILLAMA_PROTOCOL_REQUIRED'));url='https://api.llama.fi/summary/fees/'+enc(a.protocol)+qs({excludeTotalDataChart:a.excludeTotalDataChart,excludeTotalDataChartBreakdown:a.excludeTotalDataChartBreakdown,dataType:a.dataType});break;
 default:return cb(new Error('DEFILLAMA_COMMAND_UNSUPPORTED:'+c));
 }
 self.lastCommand=c;getJson(url,function(e,o){if(e){self.lastError=e.message;return cb(e);}self.lastOkAt=Date.now();self.lastError='';cb(null,{ok:true,provider:'DEFILLAMA',command:c,source:'DEFILLAMA_PUBLIC_API',complementary:true,nativeExchangeData:false,data:o});});
};
module.exports=P;
