'use strict';
var get=require('./http_json');
function P(o){o=o||{};this.base=String(o.base||'https://api.coingecko.com/api/v3').replace(/\/$/,'');this.apiKey=String(o.apiKey||process.env.COINGECKO_API_KEY||'');this.id='COINGECKO';}
P.prototype._headers=function(){var h={};if(this.apiKey)h['x-cg-demo-api-key']=this.apiKey;return h;};
P.prototype.marketPage=function(page,perPage,vs,cb){var url=this.base+'/coins/markets?vs_currency='+encodeURIComponent(vs||'usd')+'&order=market_cap_desc&per_page='+Math.max(1,Math.min(250,+perPage||250))+'&page='+Math.max(1,+page||1)+'&sparkline=false&price_change_percentage=1h,24h,7d';get(url,{headers:this._headers(),timeout:15000},cb);};
P.prototype.coin=function(id,cb){var url=this.base+'/coins/'+encodeURIComponent(id)+'?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false';get(url,{headers:this._headers(),timeout:15000,maxBytes:12*1024*1024},cb);};
module.exports=P;
