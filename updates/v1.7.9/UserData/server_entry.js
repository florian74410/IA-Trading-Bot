'use strict';
var path=require('path'),bootstrap=require('./runtime_bootstrap'),hooks=require('./runtime_hooks'),authBackground=require('./auth_background_runtime'),credentials=require('./credential_runtime'),apiUi=require('./api_ui_runtime'),corePatch=require('./core_credential_patch');
(async function(){
 try{
  var ctx=await bootstrap.bootstrapRuntime(),root=path.resolve(ctx.root),raw=String(process.argv[2]||'').trim();
  if(!raw)throw new Error('SERVER_ENTRY_MISSING');
  var serverPath=path.resolve(root,raw);
  if(serverPath!==root&&serverPath.indexOf(root+path.sep)!==0)throw new Error('SERVER_ENTRY_OUTSIDE_ROOT');
  hooks.install(ctx);
  authBackground.install(ctx);
  apiUi.install(ctx);
  await credentials.initialize(ctx,hooks.queuePending);
  hooks.setCredentialRuntime(credentials.current());
  console.log('[UserData] SQLite runtime active user='+ctx.username+' db='+String(ctx.dbLocation||'remote')+' vault=AES-256-GCM authBackground=FULL_PAGE');
  corePatch.load(serverPath);
 }catch(e){console.error('[UserData] SERVER ENTRY ERROR:',e&&e.stack||e);process.exit(78);}
})();
