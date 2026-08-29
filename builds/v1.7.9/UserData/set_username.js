'use strict';
var fs=require('fs'),path=require('path'),UserDataService=require('./user_data_service'),cleanUser=require('./local_remote_store').cleanUser;
var root=path.resolve(__dirname,'..'),file=path.join(__dirname,'local_username.dat'),next=cleanUser(process.argv[2]||'');
if(!next||next==='default'&&!process.argv[2]){console.error('Usage: node UserData/set_username.js <username>');process.exit(2);}
var current='default';try{current=String(fs.readFileSync(file,'utf8')||'').trim()||'default';}catch(e){}
var svc=new UserDataService(root,{username:current});
try{svc.bootstrap();svc.renameUser(next);fs.writeFileSync(file,next+'\n','utf8');svc.audit('UserData','USERNAME_CHANGE',current+' -> '+next,'SUCCESS');svc.close(true);console.log('[UserData] username='+next);process.exit(0);}catch(e){console.error('[UserData] username change failed:',e.message);try{svc.close(false);}catch(x){}process.exit(1);}
