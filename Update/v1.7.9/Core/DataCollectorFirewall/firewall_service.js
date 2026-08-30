'use strict';

const http = require('http');
const crypto = require('crypto');
const DataCollectorFirewall = require('./data_collector_firewall');

const HOST = process.env.IATB_DATA_FIREWALL_HOST || '127.0.0.1';
const PORT = Number(process.env.IATB_DATA_FIREWALL_PORT || 8018);
const INTERNAL_KEY = String(process.env.IATB_INTERNAL_SERVICE_KEY || '');

const firewall = new DataCollectorFirewall({
  enabled: process.env.IATB_DATA_FIREWALL_ENABLED !== '0',
  mode: process.env.IATB_DATA_FIREWALL_MODE || 'PROTECTION'
});

function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')); const bb=Buffer.from(String(b||''));
  return aa.length===bb.length && aa.length>0 && crypto.timingSafeEqual(aa,bb);
}
function authorized(req){
  if (!INTERNAL_KEY) return true; // local development compatibility; production should provide the internal key.
  return safeEqual(req.headers['x-ia-tb-internal-key'], INTERNAL_KEY);
}
function send(res,code,obj){
  const body=JSON.stringify(obj);
  res.writeHead(code,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body)});
  res.end(body);
}
function readJson(req,cb){
  let raw=''; let stopped=false;
  req.on('data',chunk=>{
    if (stopped) return;
    raw+=chunk;
    if (raw.length > firewall.maxPayloadBytes*2) { stopped=true; cb(new Error('REQUEST_TOO_LARGE')); req.destroy(); }
  });
  req.on('end',()=>{
    if (stopped) return;
    try { cb(null, raw ? JSON.parse(raw) : {}); } catch(e){ cb(new Error('INVALID_JSON')); }
  });
}

const server=http.createServer((req,res)=>{
  if (!authorized(req)) return send(res,401,{ok:false,error:'UNAUTHORIZED_INTERNAL_CALL'});
  const path=String(req.url||'').split('?')[0];

  if (req.method==='GET' && path==='/health') return send(res,200,{ok:true,service:'DATA_COLLECTOR_FIREWALL',host:HOST,port:PORT});
  if (req.method==='GET' && path==='/status') return send(res,200,{ok:true,firewall:firewall.status()});

  if (req.method==='POST' && path==='/configure') return readJson(req,(err,body)=>{
    if (err) return send(res,400,{ok:false,error:err.message});
    try { return send(res,200,{ok:true,firewall:firewall.configure(body)}); }
    catch(e){ return send(res,400,{ok:false,error:'INVALID_CONFIGURATION',detail:e.message}); }
  });

  if (req.method==='POST' && path==='/inspect') return readJson(req,(err,body)=>{
    if (err) return send(res,400,{ok:false,error:err.message});
    const result=firewall.inspect(body && body.message ? body.message : body);
    return send(res,result.decision==='REJECT'?422:200,result);
  });

  return send(res,404,{ok:false,error:'NOT_FOUND'});
});

server.listen(PORT,HOST,()=>{
  console.log('[DataCollectorFirewall] listening on http://'+HOST+':'+PORT+' mode='+firewall.mode);
});

module.exports={server,firewall};
