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
 if(c.r2.concentration){const gross=p.reduce((n,x)=>n+Math.abs(finite(x.notional)||0),0),largest=p.reduce((m,x)=>Math.max(m,Math.abs(finite(x.notional)||0)),0);if(!(equity>0))missing.push('EQUITY_REQUIRED');else{measurements.grossExposurePct=round(gross/equity*100);measurements.largestPositionPct=round(largest/equity*100);if(measurements.largestPositionPct>limits.concentrationPct)warnings.push('CONCENTRATION_LIMIT');}}
 if(c.r2.stopBudget){if(!(equity>0)||p.some(x=>finite(x.riskAtStop)===null))missing.push('POSITION_STOP_RISK_REQUIRED');else{measurements.stopBudgetPct=round(100*p.reduce((n,x)=>n+Math.max(0,finite(x.riskAtStop)),0)/equity);if(measurements.stopBudgetPct>limits.portfolioPct)warnings.push('PORTFOLIO_STOP_BUDGET_LIMIT');}}
 // Advanced modules deliberately require provider-verified metrics rather than invent values.
 for(const k of ['correlation','margin','volatility','freshness'])if(c.r2[k]){const x=s.metrics&&s.metrics[k];if(x&&x.ok===true&&Array.isArray(x.alerts))warnings.push(...x.alerts.map(y=>String(y).slice(0,80)));else missing.push(k.toUpperCase()+'_DATA_REQUIRED');}
 return{schema:'risk.r2/1.0',decision:missing.length?'DEGRADED':warnings.length?'LIMIT_EXCEEDED':'NORMAL',level:c.riskLevel,warnings:[...new Set(warnings)],missing:[...new Set(missing)],measurements,tokenCost:0,requiresSupervisorAttention:warnings.length>0};
}
module.exports={LEVELS,R1,R2,settings,r1,r2};
