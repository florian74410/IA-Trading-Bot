'use strict';
var fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
function ensureDir(p){if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true});}
function tokenPath(){return process.env.IATB_USERDATA_TOKEN_FILE||path.join(os.homedir(),'.ia-trading-bot','userdata_server.token');}
function token(){var p=tokenPath();try{var v=String(fs.readFileSync(p,'utf8')||'').trim();if(/^[a-f0-9]{64}$/i.test(v))return v;}catch(e){}ensureDir(path.dirname(p));var v=crypto.randomBytes(32).toString('hex');fs.writeFileSync(p,v+'\n',{encoding:'utf8',mode:0o600});try{fs.chmodSync(p,0o600);}catch(e){}return v;}
module.exports={token:token,tokenPath:tokenPath};
