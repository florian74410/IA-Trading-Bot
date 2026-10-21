'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('../Engine/risk_policy_v25');
const R1=require('../Engine/r1_management_v25');
const R2=require('../Engine/r2_monitor_v25');
const Gate=require('../Engine/risk_gate').RiskGate;
const settings=()=>policy.sanitize(policy.DEFAULT,{level:'BALANCED'});
const order={equity:10000,quantity:0.1,price:70000,stopLoss:68600,side:'BUY',feePct:0.1,slippagePct:0.1};
test('R1 A calculates notional/exposure',()=>{
 const d=R1.analyze(order,policy.mergeLimits(settings(),'r1'));
 assert.equal(d.metrics.notional,7000);
 assert.equal(d.metrics.exposure_pct,70);
});
test('R1 B theoretical stop, fees, slippage',()=>{
 const d=R1.analyze(order,policy.mergeLimits(settings(),'r1'));
 assert.equal(d.modules.stop.theoreticalLoss,140);
 assert(d.modules.stop.estimatedLoss>140);
});
test('R1 C budget and D safe conservative resize',()=>{
 const d=R1.analyze(order,policy.mergeLimits(settings(),'r1'));
 assert.equal(d.decision,'RESIZE');assert(d.proposal.quantity<order.quantity);
 const next=R1.analyze({...order,quantity:d.proposal.quantity},policy.mergeLimits(settings(),'r1'));
 assert.equal(next.decision,'ACCEPT');assert(next.metrics.estimated_loss<=100);
});
test('R1 invalid/missing inputs fail closed',()=>{
 for(const v of [{...order,stopLoss:72000},{...order,equity:null},{...order,price:0},{...order,side:'BAD'}]){
  assert.equal(R1.analyze(v,policy.mergeLimits(settings(),'r1')).decision,'REJECT');
 }
});
test('R1 module enablement honors per-module toggles',()=>{
 const c=policy.mergeLimits(settings(),'r1');c.modules.stop=false;c.modules.resize=false;
 const x=R1.analyze(order,c);assert.equal(x.modules.stop.status,'DISABLED');assert.equal(x.modules.resize.status,'DISABLED');
 assert.equal(x.decision,'REJECT');
});
test('Profile validation rejects unknown values',()=>{
 const c=policy.sanitize(settings(),{level:'HACK',r1:{modules:{capital:'false',stop:false},quantityDecimals:-1},r2:{monitorIntervalSec:1}});
 assert.equal(c.level,'BALANCED');assert.equal(c.r1.modules.capital,true);assert.equal(c.r1.modules.stop,false);assert.equal(c.r2.monitorIntervalSec,30);
});
function snapshot(){return{timestamp:Date.now(),risk_equity_verified:10000,peak_equity_verified:11000,margin_used:1000,margin_available:8000,positions:[{symbol:'BTC',quantity:.1,mark_price:70000,entry_price:70000,stopLoss:68000}]};}
test('R2 detects concentration and computes monitoring without any LLM',()=>{
 const d=R2.analyze(snapshot(),policy.mergeLimits(settings(),'r2'));
 assert(d.alerts.some(x=>x.module==='R2.3'));
 assert.equal(d.modules.drawdown.status,'OK');assert.equal(d.modules.stopRisk.status,'OK');
 assert(d.scenarios.every(x=>x.advisory_only&&x.type!=='EXECUTE'));
});
test('R2 refuses to treat Portfolio trading PnL as NAV',()=>{
 const d=R2.analyze({equity:100,positions:[],timestamp:Date.now()},policy.mergeLimits(settings(),'r2'));
 assert.equal(d.modules.equity.status,'INSUFFICIENT_DATA');
 assert.equal(d.modules.concentration.status,'INSUFFICIENT_DATA');
});
test('R2 stale data is explicit, not silent no-events',()=>{
 const s=snapshot();s.timestamp=Date.now()-180000;
 const d=R2.analyze(s,policy.mergeLimits(settings(),'r2'));
 assert(d.alerts.some(x=>x.code==='RISK_DATA_STALE'));
});
test('Risk Gate requires real preflight and preserves one-use approval',()=>{
 const g=new Gate({getSettings:()=>({enabled:true,thresholds:{leverageWarning:5}}),secret:'local-test-key',requirePreflight:true});
 const order={source:'supervisor.autonomous-trading',mode:'PAPER',symbol:'BTCUSDT',exchange:'BINANCE',action:'BUY',size:.01};
 assert.equal(g.evaluate(order).approved,false);
 assert.equal(g.evaluate(order,{authorized:false}).approved,false);
 let x=g.evaluate(order,{authorized:true,summary:{status:'OK'}});assert.equal(x.approved,true);
 assert.equal(g.verify(x.risk_approval_id,order,true).ok,true);
 assert.equal(g.verify(x.risk_approval_id,order,false).ok,false);
});
