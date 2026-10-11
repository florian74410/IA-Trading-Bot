'use strict';
var fs=require('fs'),path=require('path'),os=require('os');
function H(root,opt){opt=opt||{};var user=String(opt.username||process.env.IATB_USERDATA_USER||'default').replace(/[^A-Za-z0-9._-]/g,'_');this.file=path.resolve(opt.file||process.env.IATB_TRADING_HISTORY||path.join(os.homedir(),'IA-TB-UserData-Server','User Data',user,'trading_history.jsonl'));fs.mkdirSync(path.dirname(this.file),{recursive:true});}
H.prototype.append=function(x){fs.appendFileSync(this.file,JSON.stringify(x)+'\n','utf8');};
H.prototype.list=function(opt){opt=opt||{};var limit=Math.max(1,Math.min(2000,+opt.limit||200)),since=+opt.since||0,a=[];try{var lines=fs.readFileSync(this.file,'utf8').split(/\r?\n/);for(var i=0;i<lines.length;i++){if(!lines[i])continue;try{var o=JSON.parse(lines[i]);if((+o.timestamp||0)>=since)a.push(o);}catch(e){}}}catch(e){if(e.code!=='ENOENT')throw e;}return a.slice(Math.max(0,a.length-limit));};
module.exports=H;
