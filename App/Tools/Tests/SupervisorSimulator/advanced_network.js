'use strict';
// Only external provider boundary is replaced. Real HTTP OKX fixture, loopback only.
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const root=path.resolve(__dirname,'../../..'),dir=process.env.IATB_DATA_ROOT||'';
if(process.env.IATB_ADVANCED_SIMULATOR!=='1'||!path.basename(path.dirname(dir)).startsWith('iatb-advanced-')||!/^\d+$/.test(process.env.IATB_OKX_FIXTURE_PORT||''))throw Error('ISOLATED_ADVANCED_SIMULATOR_REQUIRED');
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){let a=Array.isArray(args[0])?args[0][0]:net._normalizeArgs(args)[0];if(a.host&&!['127.0.0.1','localhost','::1'].includes(a.host)){fs.appendFileSync(process.env.IATB_SIMULATOR_EXTERNAL_LOG,JSON.stringify({kind:'NETWORK_DENIED',host:a.host})+'\n');throw Error('SIMULATOR_EXTERNAL_NETWORK_DENIED');}return connect.apply(this,args);};
process.env.IATB_SIMULATOR_EXTERNAL_FIXTURES='1';
require('./external_fixtures');
require("../../../Engines/Trading/http-transport").requestJson=async request=>{
 if(request.method==='POST'&&process.env.IATB_OKX_BEFORE_SEND_PAUSE&&fs.existsSync(process.env.IATB_OKX_BEFORE_SEND_PAUSE)){fs.writeFileSync(process.env.IATB_OKX_BEFORE_SEND_PAUSE+'.entered','reserved before HTTP send');await new Promise(()=>{});}
 const u=new URL(request.url);if(!['eea.okx.com','www.okx.com','us.okx.com'].includes(u.hostname))throw Error('SIMULATOR_UNKNOWN_PROVIDER');
 return new Promise((resolve,reject)=>{const q=require('node:http').request({host:'127.0.0.1',port:Number(process.env.IATB_OKX_FIXTURE_PORT),method:request.method||'GET',path:u.pathname+u.search,headers:{...request.headers,'x-fixture-original-host':u.host,...(request.body?{'content-length':Buffer.byteLength(request.body)}:{})},timeout:1000},r=>{let text='';r.on('data',x=>text+=x);r.on('end',()=>{try{resolve({statusCode:r.statusCode,body:JSON.parse(text)})}catch(e){reject(e)}})});q.on('error',reject);q.on('timeout',()=>q.destroy(Error('SIMULATED_BROKER_TIMEOUT')));q.end(request.body);});
};
// Higher-level fences also block traffic sent through a local HTTP proxy.
function check(input){const host=typeof input==='string'||input instanceof URL?new URL(input).hostname:input?.hostname||input?.host||'localhost';if(!['127.0.0.1','localhost','::1','[::1]'].includes(String(host).replace(/:\d+$/,'')))throw Error('SIMULATOR_EXTERNAL_NETWORK_DENIED');}
for(const id of ['node:http','node:https']){const mod=require(id),request=mod.request;mod.request=function(...args){check(args[0]);return request.apply(this,args);};const get=mod.get;mod.get=function(...args){check(args[0]);return get.apply(this,args);};}
const fetch=global.fetch;global.fetch=function(input,options){check(input?.url||input);return fetch(input,options);};
