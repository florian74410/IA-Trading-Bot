'use strict';
/* Optional DEBUG-only HTTP boundary for UI/Router/Engine processes.
 * No network request can opt itself into this policy via headers.
 * Unknown operations fail closed, including all CP/1 and Trading LIVE.
 */
const AUTH_METHODS=Object.freeze({
 '/auth21/login':['POST'], '/auth21/me':['GET'], '/auth21/logout':['POST'],
 '/auth21/unlock':['POST'], '/auth21/activity':['POST'],
 '/auth21/preferences':['GET','PUT','DELETE']
});
function active(env){
 return !!(env&&env.IATB_AUTH21_CORE_AUTH_TRIAL==='1'&&
   env.IATB_AUTH21_LOCAL_SNAPSHOT_TRIAL==='1'&&env.IATB_DEBUG_MODE==='1');
}
function decision(env,service,method,path){
 if(!active(env))return {intercept:false};
 if(service==='gateway'&&env.IATB_AUTH21_BUSINESS_TRIAL==='1'&&
    env.IATB_AUTH21_IPC_PROBE_TRIAL==='1'&&method==='POST'&&
    require('./auth21_business_actions').contract(path))return {intercept:true,forwardToCore:true};
 if(service==='gateway'&&Object.hasOwn(AUTH_METHODS,path)&&AUTH_METHODS[path].includes(method))
  return {intercept:true,forwardToCore:true};
 return {intercept:true,forwardToCore:false};
}
module.exports={active,decision};
