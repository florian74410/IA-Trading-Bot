'use strict';
var fs=require('fs'),path=require('path'),UserDataService=require('./user_data_service'),bridge=require('./legacy_bridge');
var root=path.resolve(__dirname,'..'),userFile=path.join(__dirname,'local_username.dat'),pidFile=path.join(__dirname,'sync_agent.pid'),interval=+(process.env.IATB_USERDATA_SYNC_MS||3000);
function readUser(){try{return String(fs.readFileSync(userFile,'utf8')||'').trim()||'default';}catch(e){return process.env.IATB_USERNAME||'default';}}
function alive(pid){try{process.kill(+pid,0);return true;}catch(e){return false;}}
try{if(fs.existsSync(pidFile)){var old=String(fs.readFileSync(pidFile,'utf8')||'').trim();if(old&&alive(old)&&+old!==process.pid)process.exit(0);}}catch(e){}
try{fs.writeFileSync(pidFile,String(process.pid)+'\n','utf8');}catch(e){}
var svc=new UserDataService(root,{username:readUser()});
try{svc.bootstrap();bridge.restoreOrImport(svc);}catch(e){console.error('[UserDataSync] init:',e.message);process.exit(1);}
var timer=setInterval(function(){try{bridge.syncFromDisk(svc);}catch(e){console.error('[UserDataSync] sync:',e.message);}},Math.max(1000,interval));
function stop(){try{clearInterval(timer);}catch(e){}try{bridge.syncFromDisk(svc);}catch(e){}try{svc.close(true);}catch(e){}try{fs.unlinkSync(pidFile);}catch(e){}process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('exit',function(){try{fs.unlinkSync(pidFile);}catch(e){}});
