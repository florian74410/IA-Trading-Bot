'use strict';
async function handle({runtime,req,res,token,read,reply,cookies}){const p=new URL(req.url,'https://localhost').pathname;
 if(p==='/auth21/internal/cp1-control'){
  if(req.method!=='POST'||req.socket.encrypted!==true)return reply(res,403,{error:'CONTROL_AUTH_REQUIRED'});
  try{return reply(res,200,await runtime.machine(await read(req),req.headers));}catch(e){return reply(res,403,{error:/^[A-Z0-9_]{1,96}$/.test(String(e.message).split(':')[0])?String(e.message).split(':')[0]:'CONTROL_REFUSED'});}
 }
 if(!p.startsWith('/auth21/cp1/'))return false;
 try{const principal=runtime.sessions.verifySession(token);if(!principal||!['ADMIN','USER'].includes(principal.role))throw Error('OWNER_REQUIRED');if(req.method!=='POST'||!cookies.originAllowed(req)||!cookies.validate(req,token))throw Error('CSRF_REQUIRED');const body=await read(req);if(!body||typeof body.operation!=='string'||Object.keys(body).some(k=>!['operation','data'].includes(k)))throw Error('CONTROL_ARGUMENT_INVALID');return reply(res,200,await runtime.browser(token,body.operation,body.data||{}));}catch(e){return reply(res,403,{error:/^[A-Z0-9_]+$/.test(e.message)?e.message:'CONTROL_REFUSED'});}
}
module.exports={handle};
