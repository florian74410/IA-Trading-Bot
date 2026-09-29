'use strict';
var get=require('./http_json');
function P(o){o=o||{};this.base=String(o.base||'https://api.llama.fi').replace(/\/$/,'');this.stableBase=String(o.stableBase||'https://stablecoins.llama.fi').replace(/\/$/,'');this.id='DEFILLAMA';this._cache={};}
P.prototype._cached=function(key,ttl,loader,cb){var h=this._cache[key],now=Date.now();if(h&&now-h.at<ttl)return cb(null,h.data);var self=this;loader(function(e,o){if(!e)self._cache[key]={at:Date.now(),data:o};cb(e,o);});};
P.prototype.protocols=function(cb){get(this.base+'/protocols',{timeout:18000,maxBytes:16*1024*1024},cb);};
P.prototype.chains=function(cb){get(this.base+'/v2/chains',{timeout:15000,maxBytes:8*1024*1024},cb);};
P.prototype.dexOverview=function(cb){get(this.base+'/overview/dexs?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true&dataType=dailyVolume',{timeout:18000,maxBytes:16*1024*1024},cb);};
P.prototype.yieldPools=function(cb){var self=this;this._cached('yieldPools',600000,function(done){get(self.base+'/pools',{timeout:22000,maxBytes:24*1024*1024},done);},cb);};
P.prototype.feesOverview=function(cb){var self=this;this._cached('feesOverview',300000,function(done){get(self.base+'/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees',{timeout:18000,maxBytes:16*1024*1024},done);},cb);};
P.prototype.stablecoins=function(cb){get(this.stableBase+'/stablecoins?includePrices=true',{timeout:18000,maxBytes:16*1024*1024},cb);};
module.exports=P;
