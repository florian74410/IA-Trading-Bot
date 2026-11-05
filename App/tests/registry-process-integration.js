'use strict';
// Real loopback HTTP transport test for Engine ActionBlock publishers.
// Runs separate Node processes for each registered component; no mocked CP/1 send.
const http=require('node:http');
const {fork}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {FunctionRegistryManager}=require('../Core/FunctionRegistry/manager');
const {receivePublication}=require('../Core/FunctionRegistry/receiver');
const {RegistryDiscovery}=require('../Core/FunctionRegistry/discovery');
const root=path.resolve(__dirname,'..');
const components={core:'Core',router:'Core/Router',supervisor:'Supervisor',marketdata:'MarketData',fundamental:'Fundamental',indicator:'Indicators',liquidity:'Liquidity',portfolio:'Portfolio',risk:'Risk',strategy:'Strategy',trading:'services/trading-engine',firewall:'Core/Firewall'};
async function main(){
 const manager=new FunctionRegistryManager(':memory:');
 const secret=require('node:crypto').randomBytes(32).toString('hex');
 const reports=[];
 const server=http.createServer(async(req,res)=>{
  const chunks=[];for await(const c of req)chunks.push(c);
  try{
   if(req.method!=='POST'||req.url!=='/cp/v1'||req.headers['x-registry-secret']!==secret)throw Error('UNAUTHORIZED');
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   const engineId=req.headers['x-engine-id'];
   if(!Object.hasOwn(components,engineId))throw Error('UNKNOWN_ENGINE');
   const result=receivePublication({manager,peer:{authenticated:true,engineId},request:body,allowedBrokers:(e,b)=>e==='trading'&&['binance','kraken','okx'].includes(b)});
   res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(result));
  }catch(e){res.writeHead(403,{'content-type':'application/json'});res.end(JSON.stringify({error:e.message}));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/cp/v1';
 try{
  for(const [engine,folder] of Object.entries(components)){
   const manifestPath=path.join(root,folder,'FunctionRegistry/Functions.json');
   if(!fs.existsSync(manifestPath)){reports.push({engine,status:'MISSING_MANIFEST'});continue;}
   const brokers=engine==='trading'?[null,'binance','kraken','okx']:[null];
   for(const broker of brokers){
    const child=fork(path.join(__dirname,'registry-engine-child.js'),[],{env:{...process.env,REGISTRY_URL:url,REGISTRY_SECRET:secret,ENGINE_ID:engine,BROKER_ID:broker||'',ACTION_BLOCK:path.join(root,folder,'FunctionRegistry/startup.js')},stdio:['ignore','pipe','pipe','ipc']});
    let stderr='';child.stderr.on('data',x=>stderr+=x);
    const result=await Promise.race([new Promise(resolve=>child.on('exit',(code)=>resolve({code}))),new Promise(resolve=>setTimeout(()=>{child.kill();resolve({code:124});},15000))]);
    const identity=broker?engine+'@'+broker:engine;
    const row=manager.db.prepare('SELECT COUNT(*) AS count FROM functions WHERE engine=?').get(identity);
    const expected=JSON.parse(fs.readFileSync(manifestPath,'utf8')).functions.length;
    const status=result.code===0&&row.count===expected?'PASS':'FAIL';
    reports.push({engine,broker,status,expected,received:row.count,exit:result.code,error:stderr.slice(-500)});
   }
  }
  const result={mode:'separate_processes_loopback_HTTP_CP1',note:'Engine ActionBlock startup adapters, not full production Engine boot',reports};
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/cp1-registry-report.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  assert.ok(reports.length>=12);
  assert.ok(reports.every(r=>r.status==='PASS'),'Registry communication failures');
 }finally{server.close();manager.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
