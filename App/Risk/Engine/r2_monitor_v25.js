'use strict';
// IA-TB 2.5 — R2 monitoring and neutral what-if scenarios. No order generation.
const names=['equity','drawdown','concentration','correlation','margin','stress','stopRisk','integrity'];
function n(x){return x!==null&&x!==undefined&&x!==''&&Number.isFinite(+x)?+x:null;}
function p(x){const y=n(x);return y!==null&&y>0?y:null;}
function round(x){return x==null?null:Math.round(x*10000)/10000;}
function analyze(raw,settings,now){
 const cfg=settings||{},mods=cfg.modules||{},lim=cfg.levels||{},s=raw&&raw.snapshot||raw||{},positions=Array.isArray(s.positions)?s.positions:[],equity=p(s.risk_equity_verified),at=now||Date.now();
 // 'equity' in historical Portfolio Engine is trading PnL, NOT account NAV; it is never trusted as risk capital.
 const out={schema:'risk.r2.monitor/1.0',status:'OK',risk_level:String(cfg.level||'BALANCED'),asOf:new Date(at).toISOString(),
   positionCount:positions.length,metrics:{},modules:{},alerts:[],scenarios:[],execution_eligible:false};
 function report(key,status,value,limit,unit){out.modules[key]={status,value:round(value),limit:round(limit),unit:unit||'%'};if(status==='LIMIT_EXCEEDED')out.alerts.push({module:'R2.'+(names.indexOf(key)+1),code:'RISK_LIMIT_EXCEEDED',metric:key,current:round(value),limit:round(limit),severity:['margin','integrity'].includes(key)?'CRITICAL':'HIGH'});}
 function unavailable(key,reason){out.modules[key]={status:'INSUFFICIENT_DATA',reason};}
 function enabled(k){return mods[k]!==false;}
 const markPrice=x=>p(x.mark_price)||p(x.markPrice)||p(x.price);
 const qty=x=>p(x.quantity)||p(x.size)||p(x.qty);
 const notion=x=>p(x.notional)||((qty(x)&&markPrice(x))?qty(x)*markPrice(x):null);
 let exposure=0,fullyValued=positions.every(x=>{const v=notion(x);if(v===null)return false;exposure+=Math.abs(v);return true;});
 if(positions.length===0)fullyValued=true;
 if(enabled('equity')){if(!equity)unavailable('equity','R2_VERIFIED_EQUITY_REQUIRED');else{out.metrics.equity=equity;report('equity','OK',equity,null,'quote');}}else out.modules.equity={status:'DISABLED'};
 if(enabled('drawdown')){const peak=p(s.peak_equity_verified);if(!equity||!peak)unavailable('drawdown','R2_PEAK_EQUITY_REQUIRED');else{const dd=Math.max(0,(peak-equity)/peak*100);report('drawdown',dd>(+lim.drawdownPct||15)?'LIMIT_EXCEEDED':'OK',dd,+lim.drawdownPct||15);}}else out.modules.drawdown={status:'DISABLED'};
 if(enabled('concentration')){
  if(!equity||!fullyValued)unavailable('concentration','R2_EXPOSURE_INPUT_MISSING');
  else{const by={};positions.forEach(x=>{const sym=String(x.symbol||x.asset||'UNKNOWN');by[sym]=(by[sym]||0)+Math.abs(notion(x)||0);});const max=Object.values(by).reduce((a,b)=>Math.max(a,b),0),pct=max/equity*100;
   out.metrics.gross_exposure_pct=round(exposure/equity*100);
   report('concentration',pct>(+lim.concentrationPct||40)?'LIMIT_EXCEEDED':'OK',pct,+lim.concentrationPct||40);
   out.metrics.largest_asset_exposure_pct=round(pct);
  }
 }else out.modules.concentration={status:'DISABLED'};
 if(enabled('correlation'))unavailable('correlation','R2_RETURNS_MATRIX_NOT_AVAILABLE');else out.modules.correlation={status:'DISABLED'};
 if(enabled('margin')){
  const used=n(s.margin_used),available=n(s.margin_available);
  if(!equity||used===null||available===null)unavailable('margin','R2_MARGIN_INPUT_MISSING');
  else{const ratio=used/equity*100;report('margin',ratio>(+lim.marginPct||60)?'LIMIT_EXCEEDED':'OK',ratio,+lim.marginPct||60);
   out.metrics.margin_available=round(available);}
 }else out.modules.margin={status:'DISABLED'};
 if(enabled('stress')){
  if(!equity||!fullyValued)unavailable('stress','R2_STRESS_INPUT_MISSING');
  else{const stressPct=+lim.stressShockPct||15,loss=exposure*stressPct/100,lossPct=loss/equity*100;
   report('stress',lossPct>(+lim.stressLossPct||20)?'LIMIT_EXCEEDED':'OK',lossPct,+lim.stressLossPct||20);
   out.metrics.stress_loss_estimated=round(loss);
  }
 }else out.modules.stress={status:'DISABLED'};
 if(enabled('stopRisk')){
  if(!equity||positions.some(x=>!p(x.stopLoss??x.stop_loss)||!p(x.entry_price??x.entryPrice)||!qty(x)))unavailable('stopRisk','R2_STOPS_OR_EQUITY_MISSING');
  else{const loss=positions.reduce((a,x)=>{const q=qty(x),entry=p(x.entry_price??x.entryPrice),stop=p(x.stopLoss??x.stop_loss);return a+q*Math.abs(entry-stop);},0);const pct=loss/equity*100;
   report('stopRisk',pct>(+lim.portfolioStopRiskPct||5)?'LIMIT_EXCEEDED':'OK',pct,+lim.portfolioStopRiskPct||5);out.metrics.stop_loss_risk=round(loss);
  }
 }else out.modules.stopRisk={status:'DISABLED'};
 if(enabled('integrity')){
  const ts=n(s.timestamp)||Date.parse(s.updatedAt||s.generatedAt||''),maxAgeMs=+lim.maxDataAgeMs||60000;
  if(!Number.isFinite(ts)||ts<=0||at-ts>maxAgeMs||ts-at>10000){report('integrity','LIMIT_EXCEEDED',Math.max(0,Math.round((at-(ts||0))/1000)),Math.round(maxAgeMs/1000),'s');out.alerts[out.alerts.length-1].code='RISK_DATA_STALE';}
  else report('integrity','OK',Math.max(0,Math.round((at-ts)/1000)),Math.round(maxAgeMs/1000),'s');
 }else out.modules.integrity={status:'DISABLED'};
 if(out.alerts.some(a=>a.code==='RISK_DATA_STALE'))out.status='DEGRADED';
 else if(Object.values(out.modules).some(m=>m.status==='INSUFFICIENT_DATA'))out.status='PARTIAL';
 if(out.alerts.length){
  out.scenarios.push({type:'BLOCK_NEW_RISK',effect:'NO_NEW_EXPOSURE',advisory_only:true});
  // No sell/buy advice: a scenario describes only the conditional effect of reducing gross exposure.
  if(fullyValued&&exposure>0&&equity)out.scenarios.push({type:'SIMULATE_EXPOSURE_REDUCTION',reductionPct:10,estimatedGrossExposureAfter:round(exposure*.9),advisory_only:true});
 }
 return out;
}
module.exports={analyze,names};
