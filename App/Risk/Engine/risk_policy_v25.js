'use strict';
// Configuration-only profile limits. Engine settings are never accepted from a TradeIntent.
const LEVELS={
 PRUDENT:{tradeRiskPct:0.5,portfolioStopRiskPct:3,drawdownPct:10,concentrationPct:25,marginPct:40,stressShockPct:15,stressLossPct:10,maxDataAgeMs:60000},
 BALANCED:{tradeRiskPct:1,portfolioStopRiskPct:5,drawdownPct:15,concentrationPct:40,marginPct:60,stressShockPct:15,stressLossPct:20,maxDataAgeMs:60000},
 DYNAMIC:{tradeRiskPct:1.5,portfolioStopRiskPct:8,drawdownPct:20,concentrationPct:55,marginPct:70,stressShockPct:20,stressLossPct:30,maxDataAgeMs:60000}
};
const DEFAULT={
 enabled:true,level:'BALANCED',r1:{enabled:true,modules:{capital:true,stop:true,budget:true,resize:true},quantityDecimals:6},
 r2:{enabled:true,modules:{equity:true,drawdown:true,concentration:true,correlation:true,margin:true,stress:true,stopRisk:true,integrity:true},monitorIntervalSec:30,alertsEnabled:true}
};
function sanitize(base,patch){
 const c=JSON.parse(JSON.stringify(base||DEFAULT));patch=patch&&typeof patch==='object'&&!Array.isArray(patch)?patch:{};
 if(typeof patch.enabled==='boolean')c.enabled=patch.enabled;
 if(Object.prototype.hasOwnProperty.call(LEVELS,patch.level))c.level=patch.level;
 for(const section of ['r1','r2']){
  if(!patch[section]||typeof patch[section]!=='object'||Array.isArray(patch[section]))continue;
  const data=patch[section],dest=c[section];
  if(typeof data.enabled==='boolean')dest.enabled=data.enabled;
  if(data.modules&&typeof data.modules==='object'&&!Array.isArray(data.modules))
   for(const k of Object.keys(dest.modules))if(typeof data.modules[k]==='boolean')dest.modules[k]=data.modules[k];
  if(section==='r1'&&Number.isInteger(data.quantityDecimals)&&data.quantityDecimals>=0&&data.quantityDecimals<=8)dest.quantityDecimals=data.quantityDecimals;
  if(section==='r2'){
   if(Number.isInteger(data.monitorIntervalSec)&&data.monitorIntervalSec>=10&&data.monitorIntervalSec<=3600)dest.monitorIntervalSec=data.monitorIntervalSec;
   if(typeof data.alertsEnabled==='boolean')dest.alertsEnabled=data.alertsEnabled;
  }
 }
 return c;
}
function mergeLimits(cfg,section){return Object.assign({},cfg&&cfg[section]||{}, {level:cfg.level||'BALANCED',levels:LEVELS[cfg.level]||LEVELS.BALANCED});}
module.exports={DEFAULT,LEVELS,sanitize,mergeLimits};
