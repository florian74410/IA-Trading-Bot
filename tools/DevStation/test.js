'use strict';
const cp=require('child_process'),http=require('http'),path=require('path');
const child=cp.spawn(process.execPath,[path.join(__dirname,'server.js')],{env:Object.assign({},process.env,{DEVSTATION_PORT:'18765'}),stdio:['ignore','pipe','pipe']});
function get(p){return new Promise((ok,no)=>http.get('http://127.0.0.1:18765'+p,r=>{let a=[];r.on('data',c=>a.push(c));r.on('end',()=>ok({code:r.statusCode,body:Buffer.concat(a).toString()}))}).on('error',no));}
setTimeout(async()=>{let fail=0;for(const p of ['/api/health','/api/system','/api/projects','/api/projects/ia-tb/status','/api/screenshots']){try{const r=await get(p),pass=r.code===200;console.log((pass?'PASS ':'FAIL ')+p+' HTTP '+r.code);if(!pass)fail++;}catch(e){console.log('FAIL '+p+' '+e.message);fail++;}}child.kill('SIGTERM');process.exitCode=fail?1:0;},500);
setTimeout(()=>{try{child.kill('SIGKILL')}catch(_){}process.exit(2)},6000).unref();
