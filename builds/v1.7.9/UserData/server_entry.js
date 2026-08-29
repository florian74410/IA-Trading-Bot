'use strict';
var path=require('path'),bootstrap=require('./runtime_bootstrap'),hooks=require('./runtime_hooks');
(async function(){
 try{
  var ctx=await bootstrap.bootstrapRuntime(),root=path.resolve(ctx.root),raw=String(process.argv[2]||'').trim();
  if(!raw)throw new Error('SERVER_ENTRY_MISSING');
  var serverPath=path.resolve(root,raw);
  if(serverPath!==root&&serverPath.indexOf(root+path.sep)!==0)throw new Error('SERVER_ENTRY_OUTSIDE_ROOT');
  hooks.install(ctx);
  console.log('[UserData] SQLite runtime active user='+ctx.username+' db='+String(ctx.dbLocation||'remote'));
  require(serverPath);
 }catch(e){console.error('[UserData] SERVER ENTRY ERROR:',e&&e.stack||e);process.exit(78);}
})();
