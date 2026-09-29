'use strict';
var wt=require('worker_threads'),path=require('path');

function Manager(o){
 o=o||{};this.collector=o.collector;this.enabled=o.enabled!==false;this.providers=o.providers||{BINANCE_FUTURES:true,OKX:true};this.workers=Object.create(null);this.states=Object.create(null);this.accepted=0;this.rejected=0;this.startedAt=0;
}
Manager.prototype._spawn=function(id,file){
 var self=this,w=new wt.Worker(path.resolve(__dirname,'../Workers',file),{env:process.env});self.workers[id]=w;self.states[id]={provider:id,state:'STARTING',events:0,lastEventAt:null,lastError:null};
 w.on('message',function(m){if(!m)return;if(m.type==='status'){self.states[id]=Object.assign({},self.states[id],m);return;}if(m.type==='liquidation'&&m.event){self.collector.acceptLiquidation(m.event,function(e){if(e){self.rejected++;self.states[id].lastError=e.message;}else self.accepted++;});}});
 w.on('error',function(e){self.states[id]=Object.assign({},self.states[id],{state:'ERROR',lastError:e.message});});
 w.on('exit',function(code){self.states[id]=Object.assign({},self.states[id],{state:self.enabled?'EXITED':'STOPPED',exitCode:code});delete self.workers[id];});
};
Manager.prototype.start=function(){
 if(!this.enabled||this.startedAt)return this.status();this.startedAt=Date.now();
 if(this.providers.BINANCE_FUTURES!==false)this._spawn('BINANCE_FUTURES','binance_liquidations_worker.js');
 if(this.providers.OKX!==false)this._spawn('OKX','okx_liquidations_worker.js');
 return this.status();
};
Manager.prototype.stop=function(){
 this.enabled=false;Object.keys(this.workers).forEach(function(k){try{this.workers[k].postMessage({op:'stop'});}catch(e){}},this);return this.status();
};
Manager.prototype.status=function(){return{ok:true,enabled:this.enabled,mode:'WORKER_PER_PROVIDER',startedAt:this.startedAt||null,accepted:this.accepted,rejected:this.rejected,providers:Object.keys(this.states).map(function(k){return this.states[k];},this)};};
module.exports=Manager;
