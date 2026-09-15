'use strict';
/* IA-TB SQLite Settings Store v1.5
   Canonical application settings live in the per-user SQLite database.
   Factory defaults are seeded from Config/Defaults/app_settings.json.
*/
var fs=require('fs'),path=require('path'),os=require('os'),child=require('child_process');
function b64(v){return Buffer.from(String(v==null?'':v),'utf8').toString('base64');}
function unb64(v){try{return Buffer.from(String(v||''),'base64').toString('utf8');}catch(e){return'';}}
function q(s){return "'"+String(s).replace(/'/g,"''")+"'";}
function Store(root,opts){opts=opts||{};this.root=path.resolve(root);this.username=String(opts.username||process.env.IATB_USERDATA_USER||'default').replace(/[^A-Za-z0-9._-]/g,'_');this.dbPath=path.resolve(opts.dbPath||process.env.IATB_USER_DB||path.join(os.homedir(),'IA-TB-UserData-Server','User Data',this.username,'user_data.db'));this.sqlite=process.env.IATB_SQLITE_BIN||'sqlite3';this.ready=false;this.lastError=null;this.table='iatb_settings_v2';this.init();}
Store.prototype.run=function(sql,read){var dir=path.dirname(this.dbPath);try{fs.mkdirSync(dir,{recursive:true});}catch(e){}var a=read?['-batch','-noheader','-separator','\t',this.dbPath]:['-batch',this.dbPath];var r=child.spawnSync(this.sqlite,a,{input:String(sql||''),encoding:'utf8',timeout:5000,maxBuffer:1024*1024});if(r.error)throw r.error;if(r.status!==0)throw new Error(String(r.stderr||'SQLITE_ERROR').trim());return String(r.stdout||'');};
Store.prototype.init=function(){try{this.run('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS '+this.table+'(scope TEXT NOT NULL,key TEXT NOT NULL,value_b64 TEXT NOT NULL DEFAULT \'\',value_type TEXT NOT NULL DEFAULT \'json\',updated_at TEXT NOT NULL DEFAULT \'\',PRIMARY KEY(scope,key)); CREATE TABLE IF NOT EXISTS iatb_settings_migrations_v2(id TEXT PRIMARY KEY,applied_at TEXT NOT NULL,details_b64 TEXT NOT NULL DEFAULT \'\');');this.ready=true;this.lastError=null;}catch(e){this.ready=false;this.lastError=e.message;}};
Store.prototype.getRaw=function(scope,key){if(!this.ready)return null;try{var out=this.run('SELECT value_b64 FROM '+this.table+' WHERE scope='+q(scope)+' AND key='+q(key)+' LIMIT 1;',true).trim();return out?unb64(out):null;}catch(e){this.lastError=e.message;return null;}};
Store.prototype.setRaw=function(scope,key,value,type){if(!this.ready)throw new Error('SETTINGS_SQLITE_UNAVAILABLE: '+(this.lastError||''));var now=new Date().toISOString();this.run('INSERT OR REPLACE INTO '+this.table+'(scope,key,value_b64,value_type,updated_at) VALUES('+q(scope)+','+q(key)+','+q(b64(value))+','+q(type||'json')+','+q(now)+');');return true;};
Store.prototype.get=function(scope,key,def){var x=this.getRaw(scope,key);if(x==null)return def;try{return JSON.parse(x);}catch(e){return x;}};
Store.prototype.set=function(scope,key,value){return this.setRaw(scope,key,JSON.stringify(value),'json');};
Store.prototype.listKeys=function(scope){if(!this.ready)return[];try{return this.run('SELECT key FROM '+this.table+' WHERE scope='+q(scope)+' ORDER BY key;',true).split(/\r?\n/).filter(Boolean);}catch(e){this.lastError=e.message;return[];}};
Store.prototype.hasMigration=function(id){if(!this.ready)return false;try{return !!this.run('SELECT id FROM iatb_settings_migrations_v2 WHERE id='+q(id)+' LIMIT 1;',true).trim();}catch(e){return false;}};
Store.prototype.markMigration=function(id,details){if(!this.ready)return;this.run('INSERT OR REPLACE INTO iatb_settings_migrations_v2(id,applied_at,details_b64) VALUES('+q(id)+','+q(new Date().toISOString())+','+q(b64(JSON.stringify(details||{})))+');');};
Store.prototype.seedCanonicalAppDefaults=function(){if(!this.ready||this.get('app_profile','DefaultAppSettings.dat',null))return false;var fp=path.join(this.root,'Config','Defaults','app_settings.json');try{var obj=JSON.parse(fs.readFileSync(fp,'utf8'));this.set('app_profile','DefaultAppSettings.dat',obj);if(!this.get('app_settings','active_file',null))this.set('app_settings','active_file','DefaultAppSettings.dat');return true;}catch(e){this.lastError='APP_DEFAULTS_UNAVAILABLE: '+String(e.message||e);return false;}};
/* Compatibility API retained for Core/Server during v1.12 cleanup. Legacy Parametres files are no longer read. */
Store.prototype.importLegacyAppSettings=function(){return{imported:[],active:null,backups:[],seededDefault:this.seedCanonicalAppDefaults(),legacyRetired:true};};
Store.prototype.status=function(){return{ready:this.ready,dbPath:this.dbPath,username:this.username,backend:'sqlite3-cli',schema:'iatb-settings-v2',lastError:this.lastError};};
module.exports=Store;
