'use strict';
/* Optional DEBUG-only HTTP boundary for UI/Router/Engine processes.
 * No network request can opt itself into this policy via headers.
 * Unknown operations fail closed, including all CP/1 and Trading LIVE.
 */
const AUTH_PATHS=new Set(['/auth21/login','/auth21/me','/auth21/logout','/auth21/unlock','/auth21/activity','/auth21/preferences']);
function active(env){
 return !!(env&&env.IATB_AUTH21_CORE_AUTH_TRIAL==='1'&&
   env.IATB_AUTH21_LOCAL_SNAPSHOT_TRIAL==='1'&&env.IATB_DEBUG_MODE==='1');
}
function decision(env,service,method,path){
 if(!active(env))return {intercept:false};
 if(service==='gateway'&&AUTH_PATHS.has(path))
  return {intercept:true,forwardToCore:true};
 return {intercept:true,forwardToCore:false};
}
module.exports={active,decision};
