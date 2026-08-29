'use strict';
var fs=require('fs'),path=require('path'),Client=require('./memory_client');
var root=path.resolve(__dirname,'..'),userFile=path.join(__dirname,'local_username.dat');
function resolveUsername(){var env=String(process.env.IATB_USERNAME||'').trim();if(env)return env;try{var saved=String(fs.readFileSync(userFile,'utf8')||'').trim();if(saved)return saved;}catch(e){}try{var legacy=JSON.parse(fs.readFileSync(path.join(root,'user.dat'),'utf8'));var base=String(legacy.username||legacy.displayName||legacy.email||'').trim();if(base)return base.indexOf('@')>0?base.split('@')[0]:base;}catch(e){}return'default';}
var username=resolveUsername(),client=new Client({username:username});
client.load(function(e,cache){if(e){console.error('[UserData] MEMORY BOOTSTRAP ERROR:',e&&e.message||e);process.exit(1);}try{fs.writeFileSync(userFile,username+'\n','utf8');}catch(x){}console.log('[UserData] MEMORY READY user='+username+' db='+String(cache.dbLocation||'remote')+' settings='+Object.keys(cache.settings).length+' strategies='+Object.keys(cache.strategies).length+' credentials='+Object.keys(cache.credentials).length);process.exit(0);});
