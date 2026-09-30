'use strict';
/* Supervisor Promise facade over the canonical IA-TB CP/1 client.
   Kept as a compatibility boundary for Supervisor/Core consumers.
*/
var SharedClient=require('../../Core/Communication/cp1_client');
function Client(root,routerPort){this.client=new SharedClient({root:root,routerPort:+routerPort||8021,timeout:12000,maxBytes:2*1024*1024});}
Client.prototype.request=function(target,action,args,detail,timeoutMs){var self=this;return new Promise(function(resolve,reject){var old=self.client.timeout;if(+timeoutMs>0)self.client.timeout=Math.max(500,Math.min(60000,+timeoutMs));self.client.request(target,action,args||{},detail||'analysis',function(e,d){self.client.timeout=old;if(e)return reject(e);resolve(d);});});};
module.exports=Client;
