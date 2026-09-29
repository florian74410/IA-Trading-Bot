'use strict';
var get=require('./http_json');

function P(o){
 o=o||{};
 this.base=String(o.base||'https://api.coingecko.com/api/v3').replace(/\/$/,'');
 this.apiKey=String(o.apiKey||process.env.COINGECKO_API_KEY||'');
 this.id='COINGECKO';
 this.minIntervalMs=Math.max(300,+o.minIntervalMs||+process.env.IATB_COINGECKO_MIN_INTERVAL_MS||1200);
 this.maxRetries=Math.max(0,Math.min(4,+o.maxRetries||+process.env.IATB_COINGECKO_MAX_RETRIES||2));
 this.queue=[];
 this.busy=false;
 this.lastStartAt=0;
}
P.prototype._headers=function(){var h={};if(this.apiKey)h['x-cg-demo-api-key']=this.apiKey;return h;};
P.prototype._enqueue=function(url,opts,cb){
 this.queue.push({url:url,opts:opts||{},cb:cb,attempt:0});
 this._drain();
};
P.prototype._drain=function(){
 var self=this;if(self.busy||!self.queue.length)return;
 var wait=Math.max(0,self.minIntervalMs-(Date.now()-self.lastStartAt));
 setTimeout(function(){
  if(self.busy||!self.queue.length)return;
  var task=self.queue.shift();self.busy=true;self.lastStartAt=Date.now();self._run(task);
 },wait);
};
P.prototype._run=function(task){
 var self=this;
 get(task.url,task.opts,function(e,o){
  if(e&&(e.statusCode===429||e.statusCode>=500)&&task.attempt<self.maxRetries){
   task.attempt++;
   var delay=e.statusCode===429?Math.min(12000,2500*task.attempt):Math.min(6000,1200*task.attempt);
   return setTimeout(function(){self.lastStartAt=0;self._run(task);},delay);
  }
  self.busy=false;
  try{task.cb(e,o);}finally{self._drain();}
 });
};
P.prototype.marketPage=function(page,perPage,vs,cb){
 var url=this.base+'/coins/markets?vs_currency='+encodeURIComponent(vs||'usd')+'&order=market_cap_desc&per_page='+Math.max(1,Math.min(250,+perPage||250))+'&page='+Math.max(1,+page||1)+'&sparkline=false&price_change_percentage=1h,24h,7d';
 this._enqueue(url,{headers:this._headers(),timeout:15000},cb);
};
P.prototype.coin=function(id,cb){
 var url=this.base+'/coins/'+encodeURIComponent(id)+'?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false';
 this._enqueue(url,{headers:this._headers(),timeout:15000,maxBytes:12*1024*1024},cb);
};
P.prototype.global=function(cb){
 this._enqueue(this.base+'/global',{headers:this._headers(),timeout:15000},cb);
};
P.prototype.simplePrice=function(ids,vs,cb){
 var list=Array.isArray(ids)?ids.join(','):String(ids||'bitcoin');
 var url=this.base+'/simple/price?ids='+encodeURIComponent(list)+'&vs_currencies='+encodeURIComponent(vs||'usd');
 this._enqueue(url,{headers:this._headers(),timeout:15000},cb);
};
P.prototype.exchanges=function(page,perPage,cb){
 var url=this.base+'/exchanges?per_page='+Math.max(1,Math.min(250,+perPage||50))+'&page='+Math.max(1,+page||1);
 this._enqueue(url,{headers:this._headers(),timeout:15000,maxBytes:8*1024*1024},cb);
};
P.prototype.status=function(){return{id:this.id,queued:this.queue.length,busy:this.busy,minIntervalMs:this.minIntervalMs,maxRetries:this.maxRetries,lastStartAt:this.lastStartAt||null};};
module.exports=P;
