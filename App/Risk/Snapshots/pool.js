'use strict';
const {Worker}=require('node:worker_threads');
class Pool{
 constructor({size=2,maxQueue=32,timeout=1500}={}){this.size=size;this.maxQueue=maxQueue;this.timeout=timeout;this.slots=[];this.queue=[];this.id=0;this.closed=false;}
 spawn(){const slot={worker:new Worker(require.resolve('./worker')),job:null};this.slots.push(slot);
  slot.worker.on('message',m=>{if(!slot.job||m.id!==slot.job.id)return;const j=slot.job;slot.job=null;clearTimeout(j.timer);j.cleanup();m.error?j.reject(Error(m.error)):j.resolve(m.value);this.drain();});
  slot.worker.on('error',()=>this.retire(slot,'RISK_WORKER_FAILED'));
  slot.worker.on('exit',()=>{if(this.slots.includes(slot))this.retire(slot,'RISK_WORKER_EXIT');});return slot;}
 retire(slot,code){this.slots=this.slots.filter(s=>s!==slot);const j=slot.job;slot.job=null;if(j){clearTimeout(j.timer);j.cleanup();j.reject(Error(code));}slot.worker.terminate();if(!this.closed)this.drain();}
 run(task,data,signal){if(this.closed)return Promise.reject(Error('RISK_POOL_CLOSED'));if(signal?.aborted)return Promise.reject(Error('RISK_CANCELLED'));if(this.queue.length>=this.maxQueue)return Promise.reject(Error('RISK_OVERLOADED'));
  return new Promise((resolve,reject)=>{const j={id:++this.id,task,data,resolve,reject,signal};
   const cancel=()=>{const s=this.slots.find(s=>s.job===j);if(s)this.retire(s,'RISK_CANCELLED');else{this.queue=this.queue.filter(x=>x!==j);j.cleanup();reject(Error('RISK_CANCELLED'));}};
   j.cleanup=()=>signal?.removeEventListener('abort',cancel);signal?.addEventListener('abort',cancel,{once:true});this.queue.push(j);this.drain();});}
 drain(){while(!this.closed&&this.queue.length){let s=this.slots.find(s=>!s.job);if(!s){if(this.slots.length>=this.size)return;s=this.spawn();}const j=this.queue.shift();s.job=j;j.timer=setTimeout(()=>this.retire(s,'RISK_CALCULATION_TIMEOUT'),this.timeout);s.worker.postMessage({id:j.id,task:j.task,data:j.data});}}
 async close(){this.closed=true;for(const j of this.queue.splice(0)){j.cleanup();j.reject(Error('RISK_POOL_CLOSED'));}await Promise.all([...this.slots].map(s=>{this.retire(s,'RISK_POOL_CLOSED');return s.worker.terminate();}));}
}
module.exports={Pool};
