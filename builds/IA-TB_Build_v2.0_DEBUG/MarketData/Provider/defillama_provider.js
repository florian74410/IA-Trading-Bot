'use strict';
var get=require('./http_json');
function P(o){o=o||{};this.base=String(o.base||'https://api.llama.fi').replace(/\/$/,'');this.stableBase=String(o.stableBase||'https://stablecoins.llama.fi').replace(/\/$/,'');this.id='DEFILLAMA';}
P.prototype.protocols=function(cb){get(this.base+'/protocols',{timeout:18000,maxBytes:16*1024*1024},cb);};
P.prototype.chains=function(cb){get(this.base+'/v2/chains',{timeout:15000,maxBytes:8*1024*1024},cb);};
P.prototype.dexOverview=function(cb){get(this.base+'/overview/dexs?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume',{timeout:18000,maxBytes:16*1024*1024},cb);};
P.prototype.yieldPools=function(cb){get(this.base+'/pools',{timeout:22000,maxBytes:24*1024*1024},cb);};
P.prototype.feesOverview=function(cb){get(this.base+'/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees',{timeout:18000,maxBytes:16*1024*1024},cb);};
P.prototype.stablecoins=function(cb){get(this.stableBase+'/stablecoins?includePrices=true',{timeout:18000,maxBytes:16*1024*1024},cb);};
module.exports=P;
