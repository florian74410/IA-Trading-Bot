'use strict';
var fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
var ROOT=path.resolve(__dirname,'../..');
var NODE_RUNTIME=path.join(ROOT,'NodeRuntime');
var APP_RUNTIME=path.join(ROOT,'.runtime');
var APP_RUNTIME_DIRS={
  root:APP_RUNTIME,
  logs:path.join(APP_RUNTIME,'logs'),
  state:path.join(APP_RUNTIME,'state'),
  database:path.join(APP_RUNTIME,'database'),
  cache:path.join(APP_RUNTIME,'cache'),
  config:path.join(APP_RUNTIME,'config'),
  pids:path.join(APP_RUNTIME,'pids'),
  updates:path.join(APP_RUNTIME,'updates')
};
var RUNTIME_LOG_FILES={
  core:path.join(APP_RUNTIME_DIRS.logs,'core.log'),router:path.join(APP_RUNTIME_DIRS.logs,'router.log'),ui:path.join(APP_RUNTIME_DIRS.logs,'ui.log'),restart:path.join(APP_RUNTIME_DIRS.logs,'restart_all.log'),kraken:path.join(APP_RUNTIME_DIRS.logs,'kraken.log'),indicators:path.join(APP_RUNTIME_DIRS.logs,'indicators.log'),marketdata:path.join(APP_RUNTIME_DIRS.logs,'market_data.log'),liquidity:path.join(APP_RUNTIME_DIRS.logs,'liquidity.log'),fundamental:path.join(APP_RUNTIME_DIRS.logs,'fundamental.log'),fundamentalSqlite:path.join(APP_RUNTIME_DIRS.logs,'fundamental_sqlite_install.log'),trading:path.join(APP_RUNTIME_DIRS.logs,'trading.log'),firewall:path.join(APP_RUNTIME_DIRS.logs,'firewall.log'),strategy:path.join(APP_RUNTIME_DIRS.logs,'strategy.log'),risk:path.join(APP_RUNTIME_DIRS.logs,'risk.log'),portfolio:path.join(APP_RUNTIME_DIRS.logs,'portfolio.log')
};
var RUNTIME_STATE_FILES={strategyStats:path.join(APP_RUNTIME_DIRS.state,'strategy','strategy_stats.json')};
var RUNTIME_LAUNCHER_DIR=path.join(APP_RUNTIME_DIRS.state,'launcher');
var RUNTIME_LAUNCHER_FILES={pending:path.join(RUNTIME_LAUNCHER_DIR,'pending_activation.dat'),state:path.join(RUNTIME_LAUNCHER_DIR,'launcher_state.dat'),control:path.join(RUNTIME_LAUNCHER_DIR,'launcher_control.dat')};
var RUNTIME_UPDATE_DIRS={root:APP_RUNTIME_DIRS.updates,inbox:path.join(APP_RUNTIME_DIRS.updates,'Inbox'),staging:path.join(APP_RUNTIME_DIRS.updates,'Staging'),backups:path.join(APP_RUNTIME_DIRS.updates,'Backups')};
var RUNTIME_SECURITY_DIR=path.join(APP_RUNTIME_DIRS.state,'security');
var RUNTIME_SECRET_FILES={internalServiceKey:path.join(RUNTIME_SECURITY_DIR,'internal_service_key.dat'),communicationProtocolKey:path.join(RUNTIME_SECURITY_DIR,'communication_protocol_key.dat')};
var DEFAULT_CONFIG={appSettings:path.join(ROOT,'Config','Defaults','app_settings.json')};

var PERSISTENT_ROOT=process.env.IATB_DATA_ROOT||path.join(os.homedir(),'IA-TB-UserData-Server');
var SHARED_DATA=path.join(PERSISTENT_ROOT,'Shared Data'),FUNDAMENTAL_DATA=path.join(SHARED_DATA,'Fundamental');
var PERSISTENT_DATA={root:PERSISTENT_ROOT,shared:SHARED_DATA,fundamental:FUNDAMENTAL_DATA,fundamentalDb:path.join(FUNDAMENTAL_DATA,'fundamental.db')};
function ensureAppRuntimeDirs(){
  Object.keys(APP_RUNTIME_DIRS).forEach(function(k){try{fs.mkdirSync(APP_RUNTIME_DIRS[k],{recursive:true});}catch(e){}});
  try{fs.mkdirSync(RUNTIME_LAUNCHER_DIR,{recursive:true});}catch(e){}
  try{fs.mkdirSync(RUNTIME_SECURITY_DIR,{recursive:true});}catch(e){}
  Object.keys(RUNTIME_UPDATE_DIRS).forEach(function(k){try{fs.mkdirSync(RUNTIME_UPDATE_DIRS[k],{recursive:true});}catch(e){}});
  return APP_RUNTIME_DIRS;
}
function copyTree(src,dst){
  fs.readdirSync(src).forEach(function(name){var a=path.join(src,name),b=path.join(dst,name),st=fs.lstatSync(a);if(st.isDirectory()){if(!fs.existsSync(b))fs.mkdirSync(b,{recursive:true});copyTree(a,b);try{fs.rmdirSync(a);}catch(e){}}else if(!fs.existsSync(b)){try{fs.renameSync(a,b);}catch(e){fs.copyFileSync(a,b);fs.unlinkSync(a);}}});
}
function ensureUpdateRuntimeDirs(){
  fs.mkdirSync(RUNTIME_UPDATE_DIRS.root,{recursive:true});
  fs.mkdirSync(RUNTIME_UPDATE_DIRS.inbox,{recursive:true});
  fs.mkdirSync(RUNTIME_UPDATE_DIRS.staging,{recursive:true});
  fs.mkdirSync(RUNTIME_UPDATE_DIRS.backups,{recursive:true});
}
function validSecretFile(file){try{return /^[a-f0-9]{64}$/i.test(String(fs.readFileSync(file,'utf8')||'').trim());}catch(e){return false;}}
function ensureRuntimeSecret(target,legacy,errorCode,compatibilityLink){
  ensureAppRuntimeDirs();
  if(!validSecretFile(target)&&legacy&&validSecretFile(legacy)){try{fs.renameSync(legacy,target);}catch(e){try{fs.copyFileSync(legacy,target);fs.unlinkSync(legacy);}catch(x){}}}
  if(!validSecretFile(target)){var value=crypto.randomBytes(32).toString('hex');try{fs.writeFileSync(target,value,{encoding:'utf8',mode:384,flag:'wx'});}catch(e){}if(!validSecretFile(target))throw new Error(errorCode);}
  try{fs.chmodSync(target,384);}catch(e){}
  if(legacy&&compatibilityLink){try{if(fs.existsSync(legacy)||fs.lstatSync(legacy).isSymbolicLink())fs.unlinkSync(legacy);}catch(e){}try{fs.mkdirSync(path.dirname(legacy),{recursive:true});fs.symlinkSync(path.relative(path.dirname(legacy),target),legacy);}catch(e){}}
  return target;
}
function ensureInternalServiceRuntimeKey(){return ensureRuntimeSecret(RUNTIME_SECRET_FILES.internalServiceKey,null,'INTERNAL_SERVICE_KEY_UNAVAILABLE',false);}
function ensureCommunicationProtocolRuntimeKey(){return ensureRuntimeSecret(RUNTIME_SECRET_FILES.communicationProtocolKey,null,'CP_SECRET_UNAVAILABLE',false);}
ensureAppRuntimeDirs();ensureUpdateRuntimeDirs();ensureInternalServiceRuntimeKey();ensureCommunicationProtocolRuntimeKey();
module.exports={
  ROOT:ROOT,NodeRuntime:NODE_RUNTIME,AppRuntime:APP_RUNTIME_DIRS,RuntimeLogs:RUNTIME_LOG_FILES,RuntimeState:RUNTIME_STATE_FILES,RuntimeLauncher:RUNTIME_LAUNCHER_FILES,RuntimeUpdates:RUNTIME_UPDATE_DIRS,RuntimeSecrets:RUNTIME_SECRET_FILES,Defaults:DEFAULT_CONFIG,PersistentData:PERSISTENT_DATA,ensureAppRuntimeDirs:ensureAppRuntimeDirs,ensureUpdateRuntimeDirs:ensureUpdateRuntimeDirs,ensureInternalServiceRuntimeKey:ensureInternalServiceRuntimeKey,ensureCommunicationProtocolRuntimeKey:ensureCommunicationProtocolRuntimeKey,
  Frontend:{app:path.join(ROOT,'Frontend','Pages','app_v1.0.html'),chartViewer:path.join(ROOT,'Frontend','Pages','chart_viewer_v1.0.html'),portfolio:path.join(ROOT,'Frontend','Pages','portfolio_v1.0.html'),bank:path.join(ROOT,'Frontend','Pages','bank_v1.0.html'),adminVaults:path.join(ROOT,'Frontend','Pages','admin_vaults_v1.0.html'),fundamental:path.join(ROOT,'Frontend','Pages','fundamental_v3.html'),admin:path.join(ROOT,'Frontend','Pages','admin_v1.0.html'),assets:{chart:path.join(ROOT,'Frontend','JS','chart_controller_v2.8.js'),mosaic:path.join(ROOT,'Frontend','JS','mosaic_controller_v2.9.js'),customMosaic:path.join(ROOT,'Frontend','JS','custom_mosaic_v1.0.js'),updateUI:path.join(ROOT,'Frontend','JS','update_ui_v1.0.js'),mosaicCSS:path.join(ROOT,'Frontend','CSS','mosaic_v2.9.css'),aiProtocol:path.join(ROOT,'Frontend','Protocols','ai_command_protocol_v1.0.json'),adminJS:path.join(ROOT,'Frontend','JS','admin_controller_v1.0.js'),adminCSS:path.join(ROOT,'Frontend','CSS','admin_v1.0.css'),portfolioJS:path.join(ROOT,'Frontend','JS','portfolio_controller_v1.0.js'),portfolioCSS:path.join(ROOT,'Frontend','CSS','portfolio_v1.0.css'),fundamentalJS:path.join(ROOT,'Frontend','JS','fundamental_controller_v3.js'),fundamentalCSS:path.join(ROOT,'Frontend','CSS','fundamental_v3.css')}},
  Data:{config:path.join(ROOT,'config_v1.0.dat'),logs:RUNTIME_LOG_FILES.core,user:path.join(ROOT,'user.dat'),vault:path.join(ROOT,'secrets_v2.dat'),aiSettings:path.join(ROOT,'ai_settings_v2.dat')},Annexes:path.join(ROOT,'Annexes'),Strategies:path.join(ROOT,'Annexes','Strategies'),Updates:path.join(ROOT,'Updates'),ReleasePointer:path.join(ROOT,'Updates','current_release.dat'),LauncherControl:RUNTIME_LAUNCHER_FILES.control,Kraken:path.join(ROOT,'AddOns','Kraken')
};
