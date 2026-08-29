'use strict';
var path=require('path'),UserDataService=require('./user_data_service');
var root=path.resolve(__dirname,'..'),svc=new UserDataService(root,{});
try{var s=svc.bootstrap();console.log('[UserData] READY user='+s.username+' db='+s.dbPath+' remote='+s.remotePath);svc.close(true);process.exit(0);}catch(e){console.error('[UserData] BOOTSTRAP ERROR:',e&&e.message||e);try{svc.close(false);}catch(x){}process.exit(1);}
