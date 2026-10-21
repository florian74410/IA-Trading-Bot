'use strict';
// Risk Management Modules R1/R2. Pure deterministic arithmetic; no OpenAI requests.
function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;}
function round(v){return v===null?null:Math.round(v*1e6)/1e6;}
const LEVELS={VERY_LOW:{perTradePct:.25,portfolioPct:1.5,drawdownPct:5,concentrationPct:15},LOW:{perTradePct:.5,portfolioPct:3,drawdownPct:10,concentrationPct:25},BALANCED:{perTradePct:1,portfolioPct:5,drawdownPct:15,concentrationPct:40},HIGH:{perTradePct:1.5,portfolioPct:8,drawdownPct:20,concentrationPct:55},VERY_HIGH:{perTradePct:2,portfolioPct:12,drawdownPct:30,concentrationPct:70}};
const R1=['capital','stopLoss','budget','resize'],R2=['equity','drawdown','concentration','correlation','margin','volatility','stopBudget','freshness'];
function settings(c){c=c||{};return{enabled:c.enabled!==false,riskLevel:Object.prototype.hasOwnProperty.call(LEVELS,c.riskLevel)?c.riskLevel:'BALANCED',r1:Object.assign({capital:true,stopLoss:true,budget:true,resize:true},c.r1||{}),r2:Object.assign({equity:true,drawdown:true,concentration:true,correlation:true,margin:true,volatility:true,stopBudget:true,freshness:true},c.r2||{}),autoSuggestions:c.autoSuggestions!==false};}
function r1(intent,account,config){const c=settings(config),limits=LEVELS[c.riskLevel],i=intent||{},a=account||{},equity=finite(a.equity),price=finite(i.entryPrice),qty=finite(i.quantity),stop=finite(i.stopLoss),feePct=finite(i.feePct),slippagePct=finite(i.slippagePct);const errors=[],out={schema:'risk.r1/1.0',enabled:c.enabled,level:c.riskLevel,decision:'NOT_EVALUATED',modules:{},errors,tokenCost:0};if(!c.enabled){out.decision='DISABLED';return out;}
 if(c.r1.capital){if(!(equity>0))errors.push('EQUITY_REQUIRED');out.modules.capital={equity:round(equity),notional:price>0&&qty>0?round(price*qty):null};}
 if(c.r1.stopLoss){if(!(price>0&&qty>0&&stop>0))errors.push('PRICE_QUANTITY_STOP_REQUIRED');if(i.side!=='BUY'&&i.side!=='SELL')errors.push('SIDE_REQUIRED');if(i.side==='BUY'&&stop>=price||i.side==='SELL'&&stop<=price)errors.push('STOP_DIRECTION_INVALID');out.modules.stopLoss={distancePct:price>0&&stop>0?round(100*Math.abs(price-stop)/price):null};}
 if(c.r1.budget||c.r1.resize){if(i.side!=='BUY'&&i.side!=='SELL')errors.push('SIDE_REQUIRED');if(!(equity>0&&price>0&&qty>0&&stop>0))errors.push('RISK_INPUTS_REQUIRED');if(feePct===null||slippagePct===null||feePct<0||slippagePct<0)errors.push('EXECUTION_COST_REQUIRED');}
 if(errors.length){out.decision='INSUFFICIENT_DATA';out.errors=[...new Set(errors)];return out;}
 const perUnit=Math.abs(price-stop)+price*(feePct+slippagePct)/100,loss=qty*perUnit,budget=equity*limits.perTradePct/100;
 if(c.r1.stopLoss){out.modules.stopLoss.lossEstimate=round(loss);out.modules.stopLoss.lossPct=round(loss/equity*100);}
 if(c.r1.budget){out.modules.budget={limitPct:limits.perTradePct,limitAmount:round(budget),withinLimit:loss<=budget};}
 if(c.r1.resize){const maxQty=perUnit>0?Math.max(0,Math.floor((budget/perUnit)*1e8)/1e8):null;out.modules.resize={maxQuantity:round(maxQty),proposedQuantity:loss>budget?round(maxQty):null,requiresNewIntent:loss>budget};}
 out.decision=c.r1.budget&&loss>budget?'RESIZE_OR_REJECT':'PASS';return out;
}
function r2(snapshot,config){const c=settings(config),limits=LEVELS[c.riskLevel],s=snapshot||{},p=Array.isArray(s.positions)?s.positions:[],equity=finite(s.equity),peak=finite(s.peakEquity),warnings=[],measurements={},missing=[];
 if(!c.enabled)return{schema:'risk.r2/1.0',decision:'DISABLED',warnings:[],measurements:{},tokenCost:0};
 if(c.r2.equity){measurements.equity=equity; if(!(equity>0))missing.push('EQUITY_REQUIRED');}
 if(c.r2.drawdown){if(!(equity>0&&peak>0))missing.push('PEAK_EQUITY_REQUIRED');else{measurements.drawdownPct=round(Math.max(0,(peak-equity)/peak*100));if(measurements.drawdownPct>limits.drawdownPct)warnings.push('DRAWDOWN_LIMIT');}}
 if(c.r2.concentration){const byAsset=Object.create(null),gross=p.reduce((n,x)=>{const amount=Math.abs(finite(x.notional)||0),asset=String(x.symbol||'UNSPECIFIED').toUpperCase();byAsset[asset]=(byAsset[asset]||0)+amount;return n+amount;},0),largest=Math.max(0,...Object.values(byAsset));if(!(equity>0))missing.push('EQUITY_REQUIRED');else{measurements.grossExposurePct=round(gross/equity*100);measurements.largestPositionPct=round(largest/equity*100);if(measurements.largestPositionPct>limits.concentrationPct)warnings.push('CONCENTRATION_LIMIT');}}
 if(c.r2.stopBudget){if(!(equity>0)||p.some(x=>finite(x.riskAtStop)===null))missing.push('POSITION_STOP_RISK_REQUIRED');else{measurements.stopBudgetPct=round(100*p.reduce((n,x)=>n+Math.max(0,finite(x.riskAtStop)),0)/equity);if(measurements.stopBudgetPct>limits.portfolioPct)warnings.push('PORTFOLIO_STOP_BUDGET_LIMIT');}}
 // Deterministic metrics require a trusted, timestamped snapshot upstream.
 const m=s.metrics||{};
 function fallback(k){const x=m[k];if(x&&x.ok===true&&Array.isArray(x.alerts)){warnings.push(...x.alerts.map(y=>String(y).slice(0,80)));return true;}return false;}
 if(c.r2.correlation){
  const x=m.correlation,series=x&&x.returnsBySymbol||{},names=Object.keys(series);
  let max=null,compared=0;
  for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
   const a=series[names[i]],b=series[names[j]];
   if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||a.length<20||a.some(y=>finite(y)===null)||b.some(y=>finite(y)===null))continue;
   const n=a.length,am=a.reduce((v,y)=>v+Number(y),0)/n,bm=b.reduce((v,y)=>v+Number(y),0)/n;
   let xy=0,xx=0,yy=0;for(let t=0;t<n;t++){const u=Number(a[t])-am,v=Number(b[t])-bm;xy+=u*v;xx+=u*u;yy+=v*v;}
   if(xx>0&&yy>0){const rho=xy/Math.sqrt(xx*yy);max=max===null?rho:Math.max(max,rho);compared++;}
  }
  if(compared){measurements.maxCorrelation=round(max);measurements.correlationPairs=compared;if(max>.85)warnings.push('CORRELATED_MARKET_EXPOSURE');}
  else if(!fallback('correlation'))missing.push('CORRELATION_RETURNS_REQUIRED');
 }
 if(c.r2.margin){
  const x=m.margin||{},maintenance=finite(x.maintenanceMargin),balance=finite(x.marginEquity);
  if(maintenance!==null&&maintenance>0&&balance!==null){measurements.marginCoverage=round(balance/maintenance);if(balance/maintenance<1.25)warnings.push('MARGIN_COVERAGE_LOW');}
  else if(!fallback('margin'))missing.push('MARGIN_EXCHANGE_DATA_REQUIRED');
 }
 if(c.r2.volatility){
  const x=m.volatility||{},vals=x.dailyReturnsPct;
  if(Array.isArray(vals)&&vals.length>=20&&vals.every(y=>finite(y)!==null)){
   const n=vals.length,avg=vals.reduce((v,y)=>v+Number(y),0)/n;
   const variance=vals.reduce((v,y)=>v+Math.pow(Number(y)-avg,2),0)/(n-1);
   measurements.dailyVolatilityPct=round(Math.sqrt(variance));
   // Informational metric: no risk limit is inferred from volatility alone.
  }else if(!fallback('volatility'))missing.push('DAILY_VOLATILITY_SAMPLE_REQUIRED');
 }
 if(c.r2.freshness){
  const x=m.freshness||{},stamp=finite(x.observedAtMs),age=stamp===null?null:Date.now()-stamp,limitMs=30000;
  if(age!==null&&age>=0){measurements.dataAgeMs=Math.round(age);if(age>limitMs)warnings.push('PORTFOLIO_DATA_STALE');}
  else if(!fallback('freshness'))missing.push('DATA_TIMESTAMP_REQUIRED');
 }
 return{schema:'risk.r2/1.0',decision:missing.length?'DEGRADED':warnings.length?'LIMIT_EXCEEDED':'NORMAL',level:c.riskLevel,warnings:[...new Set(warnings)],missing:[...new Set(missing)],measurements,tokenCost:0,requiresSupervisorAttention:warnings.length>0};
}
module.exports={LEVELS,R1,R2,settings,r1,r2};
