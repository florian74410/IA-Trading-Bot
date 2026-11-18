"use strict";
// Test-only network fence. Never imported by an application service/launcher.
if(process.env.IATB_QA_LOOPBACK_ONLY!=='1')throw Error('ISOLATED_QA_REQUIRED');
const net=require('node:net'),allowed=new Set(['127.0.0.1','localhost','::1','[::1]']);
function host(value){if(!allowed.has(String(value||'localhost'))&&!allowed.has(String(value||'localhost').replace(/:\d+$/,'')))throw Error('QA_EXTERNAL_NETWORK_DENIED');}
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const o=Array.isArray(args[0])?args[0][0]:net._normalizeArgs(args)[0];if(o.host)host(o.host);return connect.apply(this,args);};
function requestHost(value){if(typeof value==='string'||value instanceof URL)host(new URL(value).hostname);else host(value?.hostname||value?.host);}
for(const id of ['node:http','node:https']){const m=require(id);for(const key of ['request','get']){const original=m[key];m[key]=function(...args){requestHost(args[0]);return original.apply(this,args);};}}
const fetch=global.fetch;global.fetch=function(input,...args){requestHost(input?.url||input);return fetch(input,...args);};
