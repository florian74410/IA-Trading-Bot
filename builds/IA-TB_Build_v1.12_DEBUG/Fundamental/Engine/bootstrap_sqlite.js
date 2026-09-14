'use strict';
/* IA-TB Fundamental Engine v1.6.1 - deterministic SQLite bootstrap.
   Fixed dependency only; no arbitrary package/shell input. Node 16 compatible. */
var fs=require('fs'),path=require('path'),child=require('child_process'),PATHS=require('../../Core/Shared/paths');
var FUND=path.resolve(__dirname,'..'),ROOT=path.resolve(FUND,'..');
var NODE=process.execPath;
var NPM=path.join(ROOT,'.node','lib','node_modules','npm','bin','npm-cli.js');
var MOD=path.join(FUND,'node_modules','better-sqlite3');
var PKG=path.join(MOD,'package.json');
var LOG=PATHS.RuntimeLogs.fundamentalSqlite;
var REQUIRED='8.7.0';
function stamp(){return new Date().toISOString();}
function append(s){try{fs.appendFileSync(LOG,'['+stamp()+'] '+String(s||'')+'\n','utf8');}catch(e){}}
function validate(){
 try{
  var p=JSON.parse(fs.readFileSync(PKG,'utf8'));
  if(String(p.version)!==REQUIRED)throw new Error('VERSION '+p.version+' != '+REQUIRED);
  delete require.cache[require.resolve(MOD)];
  var Database=require(MOD),d=new Database(':memory:');
  var v=d.prepare('select sqlite_version() v').get().v;d.close();
  return{ok:true,moduleVersion:REQUIRED,sqliteVersion:String(v)};
 }catch(e){return{ok:false,error:String(e&&e.message||e)}}
}
function install(){
 if(!fs.existsSync(NPM))throw new Error('NPM_LOCAL_INTRouvable: '+NPM);
 append('BOOTSTRAP installation better-sqlite3@'+REQUIRED+' node='+process.version+' abi='+process.versions.modules);
 var args=[NPM,'install','--prefix',FUND,'--no-audit','--no-fund','--no-package-lock','--save-exact','better-sqlite3@'+REQUIRED];
 var env=Object.assign({},process.env,{NO_UPDATE_NOTIFIER:'1',npm_config_update_notifier:'false',npm_config_audit:'false',npm_config_fund:'false'});
 var r=child.spawnSync(NODE,args,{cwd:ROOT,env:env,encoding:'utf8',maxBuffer:12*1024*1024});
 if(r.stdout)append('npm stdout: '+String(r.stdout).trim().slice(-12000));
 if(r.stderr)append('npm stderr: '+String(r.stderr).trim().slice(-12000));
 if(r.error)throw r.error;
 if(r.status!==0)throw new Error('NPM_INSTALL_FAILED rc='+r.status);
}
exports.validate=validate;
exports.ensureSync=function(){
 var v=validate();if(v.ok)return{ok:true,installed:false,moduleVersion:v.moduleVersion,sqliteVersion:v.sqliteVersion};
 append('BOOTSTRAP module absent/invalide: '+v.error);
 install();
 var after=validate();
 if(!after.ok){append('BOOTSTRAP validation ECHEC: '+after.error);throw new Error('SQLITE_BOOTSTRAP_FAILED: '+after.error);}
 append('BOOTSTRAP OK better-sqlite3='+after.moduleVersion+' sqlite='+after.sqliteVersion);
 return{ok:true,installed:true,moduleVersion:after.moduleVersion,sqliteVersion:after.sqliteVersion};
};
