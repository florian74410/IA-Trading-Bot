'use strict';
var fs=require('fs'),path=require('path');
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
  core:path.join(APP_RUNTIME_DIRS.logs,'core.log'),
  router:path.join(APP_RUNTIME_DIRS.logs,'router.log'),
  ui:path.join(APP_RUNTIME_DIRS.logs,'ui.log'),
  restart:path.join(APP_RUNTIME_DIRS.logs,'restart_all.log'),
  kraken:path.join(APP_RUNTIME_DIRS.logs,'kraken.log'),
  indicators:path.join(APP_RUNTIME_DIRS.logs,'indicators.log'),
  marketdata:path.join(APP_RUNTIME_DIRS.logs,'market_data.log'),
  liquidity:path.join(APP_RUNTIME_DIRS.logs,'liquidity.log'),
  fundamental:path.join(APP_RUNTIME_DIRS.logs,'fundamental.log'),
  fundamentalSqlite:path.join(APP_RUNTIME_DIRS.logs,'fundamental_sqlite_install.log'),
  trading:path.join(APP_RUNTIME_DIRS.logs,'trading.log'),
  firewall:path.join(APP_RUNTIME_DIRS.logs,'firewall.log'),
  strategy:path.join(APP_RUNTIME_DIRS.logs,'strategy.log'),
  risk:path.join(APP_RUNTIME_DIRS.logs,'risk.log'),
  portfolio:path.join(APP_RUNTIME_DIRS.logs,'portfolio.log')
};
function ensureAppRuntimeDirs(){
  Object.keys(APP_RUNTIME_DIRS).forEach(function(k){
    try{fs.mkdirSync(APP_RUNTIME_DIRS[k],{recursive:true});}catch(e){}
  });
  return APP_RUNTIME_DIRS;
}
module.exports={
  ROOT:ROOT,
  NodeRuntime:NODE_RUNTIME,
  AppRuntime:APP_RUNTIME_DIRS,
  RuntimeLogs:RUNTIME_LOG_FILES,
  ensureAppRuntimeDirs:ensureAppRuntimeDirs,
  Frontend:{
    app:path.join(ROOT,'Frontend','Pages','app_v1.0.html'),
    chartViewer:path.join(ROOT,'Frontend','Pages','chart_viewer_v1.0.html'),
    portfolio:path.join(ROOT,'Frontend','Pages','portfolio_v1.0.html'),
    fundamental:path.join(ROOT,'Frontend','Pages','fundamental_v1.0.html'),
    admin:path.join(ROOT,'Frontend','Pages','admin_v1.0.html'),
    assets:{
      chart:path.join(ROOT,'Frontend','JS','chart_controller_v2.8.js'),
      mosaic:path.join(ROOT,'Frontend','JS','mosaic_controller_v2.9.js'),
      customMosaic:path.join(ROOT,'Frontend','JS','custom_mosaic_v1.0.js'),
      updateUI:path.join(ROOT,'Frontend','JS','update_ui_v1.0.js'),
      mosaicCSS:path.join(ROOT,'Frontend','CSS','mosaic_v2.9.css'),
      aiProtocol:path.join(ROOT,'Frontend','Protocols','ai_command_protocol_v1.0.json'),
      adminJS:path.join(ROOT,'Frontend','JS','admin_controller_v1.0.js'),
      adminCSS:path.join(ROOT,'Frontend','CSS','admin_v1.0.css'),
      portfolioJS:path.join(ROOT,'Frontend','JS','portfolio_controller_v1.0.js'),
      portfolioCSS:path.join(ROOT,'Frontend','CSS','portfolio_v1.0.css'),
      fundamentalJS:path.join(ROOT,'Frontend','JS','fundamental_controller_v1.0.js'),
      fundamentalCSS:path.join(ROOT,'Frontend','CSS','fundamental_v1.0.css')
    }
  },
  Data:{
    config:path.join(ROOT,'config_v1.0.dat'),
    logs:path.join(ROOT,'logs.dat'),
    user:path.join(ROOT,'user.dat'),
    vault:path.join(ROOT,'secrets_v2.dat'),
    aiSettings:path.join(ROOT,'ai_settings_v2.dat')
  },
  Annexes:path.join(ROOT,'Annexes'),
  Strategies:path.join(ROOT,'Annexes','Strategies'),
  LegacyStrategies:path.join(ROOT,'strategies'),
  Parameters:path.join(ROOT,'Parametres'),
  ActiveAppSettings:path.join(ROOT,'Parametres','ActiveAppSettings.dat'),
  AIUpdateSettings:path.join(ROOT,'Parametres','AIUpdateSettings.dat'),
  Updates:path.join(ROOT,'Updates'),
  ReleasePointer:path.join(ROOT,'Updates','current_release.dat'),
  LauncherControl:path.join(ROOT,'Updates','launcher_control.dat'),
  Kraken:path.join(ROOT,'AddOns','Kraken')
};
