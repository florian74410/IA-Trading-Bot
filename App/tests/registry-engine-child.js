'use strict';
const http=require('node:http');
const {publish}=require(process.env.ACTION_BLOCK);
const engine=process.env.ENGINE_ID,broker=process.env.BROKER_ID||null;
async function send(message){
 const url=new URL(process.env.REGISTRY_URL);
 return new Promise((resolve,reject)=>{
  const req=http.request(url,{method:'POST',headers:{'content-type':'application/json','x-registry-secret':process.env.REGISTRY_SECRET,'x-engine-id':engine}},res=>{
   let body='';res.on('data',x=>body+=x);res.on('end',()=>{try{if(res.statusCode!==200)throw Error('HTTP_'+res.statusCode+': '+body);resolve(JSON.parse(body))}catch(e){reject(e)}});
  });
  req.on('error',reject);req.end(JSON.stringify(message));
 });
}
publish(send,broker).then(x=>{console.log(JSON.stringify(x));process.exit(0)}).catch(e=>{console.error(e);process.exit(1)});
