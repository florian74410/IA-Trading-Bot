'use strict';
const {parentPort}=require('node:worker_threads'),math=require('./math');
parentPort.on('message',({id,task,data})=>{try{parentPort.postMessage({id,value:math[task](data)});}catch(e){parentPort.postMessage({id,error:'RISK_CALCULATION_FAILED'});}});
