'use strict';
// IA-TB 2.5 — deterministic R1 order assessment. No LLM, exchange IO or execution.
function positive(x){return x!==null&&x!==undefined&&x!==''&&Number.isFinite(+x)&&+x>0?+x:null;}
function nonnegative(x){return x!==null&&x!==undefined&&x!==''&&Number.isFinite(+x)&&+x>=0?+x:null;}
function round(x,n){return x==null?null:Number(x.toFixed(n||6));}
const MODULES={capital:'R1.A',stop:'R1.B',budget:'R1.C',resize:'R1.D'};
function analyze(order,settings){
 order=order||{};settings=settings||{};const modules=settings.modules||{};
 const active=k=>modules[k]!==false,levels=settings.levels||{},riskPct=positive(levels.tradeRiskPct)||1;
 const equity=positive(order.equity),quantity=positive(order.quantity??order.size),price=positive(order.price??order.entryPrice),stop=positive(order.stopLoss??order.stop_loss);
 const side=String(order.side||order.action||'').toUpperCase();
 const feePct=nonnegative(order.feePct)??0.1,slippagePct=nonnegative(order.slippagePct)??0.1;
 const result={schema:'risk.r1.assessment/1.0',status:'OK',decision:'OBSERVE',risk_level:String(settings.level||'BALANCED'),
  modules:{},metrics:{},reasons:[],proposal:null,execution_eligible:false};
 function fail(key,reason){result.modules[key]={status:'INSUFFICIENT_DATA',reason};result.reasons.push(reason);}
 const geometry=quantity!=null&&price!=null&&stop!=null&&(side==='BUY'||side==='SELL')&&((side==='BUY'&&stop<price)||(side==='SELL'&&stop>price));
 if(active('capital')){
  if(!equity||!quantity||!price)fail('capital','R1_CAPITAL_INPUT_MISSING');
  else{const notional=quantity*price;result.modules.capital={status:'OK',notional:round(notional,6),exposurePct:round(notional/equity*100,4)};
   result.metrics.notional=round(notional,6);result.metrics.exposure_pct=round(notional/equity*100,4);}
 }else result.modules.capital={status:'DISABLED'};
 if(active('stop')){
  if(!geometry)fail('stop','R1_STOP_INVALID_OR_MISSING');
  else{const raw=quantity*Math.abs(price-stop),fees=quantity*(price+stop)*feePct/100,slippage=quantity*stop*slippagePct/100,loss=raw+fees+slippage;
   result.modules.stop={status:'OK',stopLoss:stop,theoreticalLoss:round(raw,6),fees:round(fees,6),slippageReserve:round(slippage,6),estimatedLoss:round(loss,6)};
   result.metrics.estimated_loss=round(loss,6);result.metrics.stop_loss=round(raw,6);}
 }else result.modules.stop={status:'DISABLED'};
 let budget=null,loss=null;
 if(active('budget')){
  if(!equity||!geometry)fail('budget','R1_BUDGET_INPUT_MISSING');
  else{budget=equity*riskPct/100;const perUnit=Math.abs(price-stop)+(price+stop)*feePct/100+stop*slippagePct/100;loss=quantity*perUnit;
   result.modules.budget={status:loss<=budget?'WITHIN_LIMIT':'LIMIT_EXCEEDED',maxRiskPct:riskPct,budget:round(budget,6),estimatedLoss:round(loss,6),remaining:round(budget-loss,6)};
   result.metrics.budget=round(budget,6);result.metrics.risk_pct=round(loss/equity*100,4);
   if(loss>budget)result.reasons.push('R1_TRADE_RISK_LIMIT_EXCEEDED');}
 }else result.modules.budget={status:'DISABLED'};
 if(active('resize')){
  if(!equity||!geometry){fail('resize','R1_RESIZE_INPUT_MISSING');}
  else{
   const perUnit=Math.abs(price-stop)+(price+stop)*feePct/100+stop*slippagePct/100;
   const maxRaw=(equity*riskPct/100)/perUnit;
   const precision=Math.max(0,Math.min(8,Number.isInteger(+settings.quantityDecimals)?+settings.quantityDecimals:6));
   const factor=Math.pow(10,precision),maxQty=Math.floor((maxRaw+1e-12)*factor)/factor;
   const suggested=round(Math.min(quantity,maxQty),precision);
   result.modules.resize={status:maxQty<quantity?'REDUCE':'NO_CHANGE',maxQuantity:round(maxQty,precision),suggestedQuantity:suggested};
   if(maxQty<quantity)result.proposal={type:'REDUCE_QUANTITY',quantity:suggested,requires_new_assessment:true,advisory_only:true};
  }
 }else result.modules.resize={status:'DISABLED'};
 if(result.reasons.some(r=>/_INPUT_MISSING|_INVALID_OR_MISSING/.test(r))){result.status='INSUFFICIENT_DATA';result.decision='REJECT';}
 else if(result.reasons.includes('R1_TRADE_RISK_LIMIT_EXCEEDED'))result.decision=result.proposal?'RESIZE':'REJECT';
 else result.decision='ACCEPT';
 // Inputs to this pure function are not credentials, signed prices or trusted capital.
 // Only the runtime gate may create an actual authorization after independent verification.
 return result;
}
module.exports={analyze,MODULES};
