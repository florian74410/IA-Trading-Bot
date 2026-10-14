'use strict';
/* Auth21 ADMIN CLI dispatcher, no shell/network/HTTP and no DB opening.
 * Must be called ONLY from a locally authenticated OS/TTY entrypoint.
 * The AdminStore independently rechecks local UID/TTY plus ADMIN bearer.
 * No passwords or bearer tokens are accepted in command arguments.
 */
const ID=/^CL[A-Za-z0-9_-]{1,64}$/;
const ACTIONS=Object.freeze({
 'list':0,'admin-count':0,'set-role':2,'set-enabled':2,
 'set-status':2,'remove-login':1
});
function dispatchLocalAdmin({adminStore,adminToken,command,args=[]}={}){
 if(!adminStore||typeof adminStore.listAccounts!=='function')throw Error('AUTH21_CLI_STORE_REQUIRED');
 if(typeof adminToken!=='string'||adminToken.length!==43)throw Error('AUTH21_CLI_SESSION_REQUIRED');
 if(!Object.hasOwn(ACTIONS,command)||!Array.isArray(args)||args.length!==ACTIONS[command])
  throw Error('AUTH21_CLI_COMMAND_INVALID');
 if(args.some(x=>typeof x!=='string'||x.length>64))throw Error('AUTH21_CLI_ARGUMENT_INVALID');
 if(args.length && !ID.test(args[0]))throw Error('AUTH21_CLI_CLIENT_ID_INVALID');
 switch(command){
  case 'list':return adminStore.listAccounts(adminToken);
  case 'admin-count':return {activeAdmins:adminStore.activeAdminCount(adminToken)};
  case 'set-role':
   if(!['ADMIN','USER','GUEST'].includes(args[1]))throw Error('AUTH21_CLI_ROLE_INVALID');
   return adminStore.changeRole(adminToken,args[0],args[1]);
  case 'set-enabled':
   if(!['true','false'].includes(args[1]))throw Error('AUTH21_CLI_BOOLEAN_INVALID');
   return adminStore.setEnabled(adminToken,args[0],args[1]==='true');
  case 'set-status':
   if(!['ACTIVE','DISABLED'].includes(args[1]))throw Error('AUTH21_CLI_STATUS_INVALID');
   return adminStore.setClientStatus(adminToken,args[0],args[1]);
  case 'remove-login':return adminStore.removeLogin(adminToken,args[0]);
 }
 throw Error('AUTH21_CLI_COMMAND_INVALID');
}
module.exports={dispatchLocalAdmin,ACTIONS};
