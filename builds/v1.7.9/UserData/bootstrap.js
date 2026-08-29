'use strict';
var fs=require('fs'),path=require('path'),UserDataService=require('./user_data_service');
var root=path.resolve(__dirname,'..'),userFile=path.join(__dirname,'local_username.dat');
function resolveUsername(){var env=String(process.env.IATB_USERNAME||'').trim();if(env)return env;try{var saved=String(fs.readFileSync(userFile,'utf8')||'').trim();if(saved)return saved;}catch(e){}try{var legacy=JSON.parse(fs.readFileSync(path.join(root,'user.dat'),'utf8'));var base=String(legacy.username||legacy.displayName||legacy.email||'').trim();if(base)return base.indexOf('@')>0?base.split('@')[0]:base;}catch(e){}return'default';}
var svc=new UserDataService(root,{username:resolveUsername()});
try{var s=svc.bootstrap();try{fs.writeFileSync(userFile,s.username+'\n','utf8');}catch(e){}console.log('[UserData] READY user='+s.username+' db='+s.dbPath+' remote='+s.remotePath);svc.close(true);process.exit(0);}catch(e){console.error('[UserData] BOOTSTRAP ERROR:',e&&e.message||e);try{svc.close(false);}catch(x){}process.exit(1);}
