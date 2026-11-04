'use strict';
// firewall ActionBlock: call publish(send, brokerId) AFTER this service starts.
const path=require('node:path');
const {publishOnStartup}=require(path.resolve(__dirname,'../../FunctionRegistry/publisher'));
const manifestPath=path.join(__dirname,'Functions.json');
const publish=(send,brokerId=null)=>publishOnStartup({manifestPath,send,brokerId});
module.exports={publish,manifestPath};
