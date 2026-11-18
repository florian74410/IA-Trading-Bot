'use strict';
const net=require('node:net');
async function unusedPort(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const p=server.address().port;await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));return p;}
// Closing a port-0 probe allows the OS to return it again before any child binds.
// Never assign the same endpoint to two services in one multi-process fixture.
function allocator(probe=unusedPort){const assigned=new Set();return async()=>{for(let i=0;i<200;i++){const p=await probe();if(!assigned.has(p)){assigned.add(p);return p;}}throw Error('TEST_PORT_ALLOCATION_EXHAUSTED');};}
module.exports={allocator};
