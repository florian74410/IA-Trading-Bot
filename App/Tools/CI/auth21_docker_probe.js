'use strict';
// Executed inside the isolated network namespace, never against a VPS URL.
const https=require('node:https'),http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
const origin='https://localhost:8000',password='FICTIONAL_Docker_Qualification_2026!',ca=fs.readFileSync(process.env.IATB_AUTH_TLS_CERT);
function request(port,route,{method='GET',body=null,headers={},tls=false}={}){return new Promise((resolve,reject)=>{const raw=body===null?'':JSON.stringify(body),q=(tls?https:http).request({host:'127.0.0.1',port,servername:'localhost',ca,path:route,method,timeout:3000,headers:{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),...headers}},r=>{let text='';r.on('data',b=>text+=b);r.on('end',()=>{let data;try{data=JSON.parse(text);}catch(_){}resolve({status:r.statusCode,data,cookie:r.headers['set-cookie']?.[0]});});});q.on('error',reject);q.on('timeout',()=>q.destroy(Error('TIMEOUT')));q.end(raw);});}
const api=(route,options)=>request(8000,route,{...options,tls:true});
async function main(){
 for(const port of [8001,8021,8017,8013,8012,8014,8018,8019,8020,3000,8015]){let ok=false;for(let i=0;i<90;i++){try{const r=await request(port,port===8001?'/api/health':'/health',{tls:port===8001});if(r.status===200){ok=true;break;}}catch(_){}await new Promise(r=>setTimeout(r,500));}assert(ok,'SERVICE_HEALTH_FAILED_'+port);}
 assert(fs.statSync('/fixture/runtime/ssh-ui.sock').isSocket());assert.equal((await api('/api/settings')).status,401);
 async function login(name){const r=await api('/auth21/login',{method:'POST',body:{email:name+'@example.invalid',password}});assert.equal(r.status,200);return {Cookie:r.cookie.split(';')[0],'X-IATB-CSRF':r.data.csrfToken};}
 const a=await login('alice'),b=await login('bobby');
 if(process.argv[2]==='restart'){assert((await api('/api/mosaics',{headers:a})).data.items.some(x=>x.moduleId==='moz:alice-only'));assert((await api('/auth21/sessions',{headers:b})).data.items.length>=2);}
 assert.equal((await api('/api/settings/language',{method:'POST',body:{language:'en'},headers:a})).status,200);assert.equal((await api('/api/settings',{headers:b})).data.language,'fr');
 assert.equal((await api('/api/mosaics/create',{method:'POST',body:{definition:{id:'alice-only',title:'Alice',items:[{source:'literal.text',value:'ALICE_ONLY'}]}},headers:a})).status,200);assert.equal((await api('/api/mosaics',{headers:b})).data.items.length,0);
 const cp=(target,action,args,headers)=>api('/communication/v1/ui/read',{method:'POST',body:{target,action,arguments:args},headers});
 assert.equal((await cp('strategy','strategy.catalog',{},a)).status,200);assert.equal((await cp('portfolio','portfolio.overview',{},a)).status,200);
 assert.equal((await api('/api/settings/language',{method:'POST',body:{language:'fr',clientId:'CLVictim'},headers:a})).status,400);
 assert.equal((await api('/auth21/logout',{method:'POST',body:{},headers:a})).status,200);assert.equal((await api('/api/settings',{headers:a})).status,401);
 console.log(JSON.stringify({ok:true,services:13,sshSocket:true,authenticated:true,ownerIsolation:true,tradingStarted:false,network:'internal-only',data:'fictional'}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
