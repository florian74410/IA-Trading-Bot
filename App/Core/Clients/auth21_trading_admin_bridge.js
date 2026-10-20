'use strict';
// P3.1: authenticated Core ADMIN -> signed proof -> local Firewall CP/1.
// Never accept role or proofs supplied by the browser. Commands remain disabled by Engine P3.
const http=require('node:http'),crypto=require('node:crypto');
const CP=require('../Communication/communication_protocol_v1');
const {proofCodec}=require('./auth21_ipc_proof');
const {loadTradingAdminKey}=require('./auth21_trading_key_provider');
const {issueTradingAdminProof}=require('./auth21_trading_admin_issuer');
const TOKEN=/^Bearer ([A-Za-z0-9_-]{43})$/;
function createTradingAdminBridge({sessions,env=process.env,browserSessions=null,port=8017}={}){
 if(!sessions||typeof sessions.verifySession!=='function'||env.IATB_AUTH21_TRADING_ADMIN_BRIDGE!=='1')return null;
 const codec=proofCodec({secret:loadTradingAdminKey({env})});
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('TRADING_ADMIN_FIREWALL_PORT_INVALID');
 const send=(res,status,body)=>{if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 return function handler(req,res){
  if(req.method!=='POST'||new URL(req.url,'http://localhost').pathname!=='/auth21/admin/trading/command'||req.headers['x-iatb-auth21-proof'])
   return send(res,404,{error:'NOT_FOUND'});
  let token;
  if(browserSessions){
   if(!browserSessions.originAllowed(req)||req.headers.authorization)return send(res,403,{error:'ORIGIN_DENIED'});
   token=browserSessions.parse(req);
   if(!token||!browserSessions.validate(req,token))return send(res,403,{error:'CSRF_DENIED'});
  }else{
   if(req.headers.cookie||req.headers.origin)return send(res,403,{error:'CREDENTIALS_DENIED'});
   const match=TOKEN.exec(String(req.headers.authorization||''));token=match&&match[1];
  }
  if(!token)return send(res,401,{error:'UNAUTHORIZED'});
  const type=String(req.headers['content-type']||'');
  if(!/^application\/json(?:;|$)/i.test(type))return send(res,400,{error:'CONTENT_TYPE_INVALID'});
  let n=0,parts=[];
  req.on('data',chunk=>{n+=chunk.length;if(n>2048){req.destroy();return;}parts.push(chunk);});
  req.on('end',()=>{
   if(n===0||n>2048)return send(res,400,{error:'BODY_INVALID'});
   let payload;try{payload=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch(_){return send(res,400,{error:'JSON_INVALID'});}
   if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).sort().join(',')!=='command,command_id,confirmed,timestamp')
     return send(res,400,{error:'ARGUMENTS_INVALID'});
   const proof=issueTradingAdminProof({sessions,token,codec,payload});
   if(!proof)return send(res,403,{error:'ADMIN_PERMISSION_DENIED'});
   const msg=CP.makeRequest('trading','trading.admin.command',{...payload,proof},'summary');
   const raw=Buffer.from(JSON.stringify(msg));
   const machine=CP.ensureSecret('');
   const signature=crypto.createHmac('sha256',machine).update(raw).digest('hex');
   const request=http.request({hostname:'127.0.0.1',port,path:'/cp/v1',method:'POST',timeout:5000,agent:false,headers:{'Content-Type':'application/json','Content-Length':raw.length,'X-IATB-CP-Token':machine,'X-IATB-FW-Signature':signature}},upstream=>{
     let bytes=0,arr=[];upstream.on('data',b=>{bytes+=b.length;if(bytes>32768){request.destroy();return;}arr.push(b);});
     upstream.on('end',()=>{let answer;try{answer=JSON.parse(Buffer.concat(arr).toString('utf8'));}catch(_){return send(res,502,{error:'FIREWALL_RESPONSE_INVALID'});}send(res,[200,400,403,409,503].includes(upstream.statusCode)?upstream.statusCode:502,answer);});
   });
   request.on('timeout',()=>request.destroy(Error('TIMEOUT')));
   request.on('error',()=>send(res,502,{error:'TRADING_ADMIN_FIREWALL_UNAVAILABLE'}));
   request.end(raw);
  });
 };
}
module.exports={createTradingAdminBridge};
