'use strict';
// Baseline diagnostics, not a qualification of financial execution.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {TradingEngine}=require("../../../Engines/Trading/trading-engine");
const {OkxExecutor}=require("../../../Engines/Trading/exchange-adapters/okx/executor");
const {RiskGate}=require('../../../Risk/Engine/risk_gate');
const Catalog=require('../../../Core/FunctionRegistry/Control/catalog');

test('explicit LIVE=false override blocks actual Trading Engine / OKX adapter; no network call',async()=>{
 let brokerCalls=0,secretReads=0;
 const engine=new TradingEngine({liveExecutionEnabled:false,lifecycle:{canExecute:()=>true,snapshot:()=>({generation:1}),submit:(_,send)=>send()},secretProvider:{get:async()=>{secretReads++;return {}; }},transport:async()=>{brokerCalls++;throw Error('EXTERNAL_CALL_FORBIDDEN');}});
 engine.registerExecutor('OKX',new OkxExecutor());
 assert.equal(engine.health().live_execution_enabled,false);
 await assert.rejects(engine.execute({risk_approval_id:'diagnostic-only',exchange:'OKX',symbol:'BTC-USDT',side:'BUY',quantity:'0.001'}),{code:'LIVE_EXECUTION_DISABLED'});
 assert.equal(brokerCalls,0);assert.equal(secretReads,0);
});

test('financial commands and risk approval issuance remain outside the qualified agent command set',()=>{
 const root=path.resolve(__dirname,'../../..');
 for(const command of ['trading.execute','trading.cancel','trading.close_position']){
  const c=Catalog.manifest(root,'trading').functions.find(c=>c.id===command);
  assert(c,command);assert.equal(c.hard_deny,true);assert.equal(c.agent_qualified,false);
 }
 for(const command of ['risk.gate.evaluate','risk.gate.verify'])assert(!Catalog.reads.risk.includes(command));
});

test('legacy Risk Gate approval alone is insufficient: scores and owner snapshot are not prerequisites of this low-level class',()=>{
 const gate=new RiskGate({secret:'diagnostic-only',getSettings:()=>({enabled:true,thresholds:{leverageWarning:5}})});
 const intent={schema:'cp1.trade-intent/1.0',source:'supervisor.autonomous-trading',mode:'LIVE_GUARDED',exchange:'OKX',market_type:'SPOT',symbol:'BTC-USDT',action:'BUY',orderType:'MARKET',size:0.001};
 const decision=gate.evaluate(intent);
 assert.equal(decision.approved,true); // Documents the missing binding; not approval to trade.
 assert.equal(decision.snapshot_id,undefined);
 assert.equal(gate.verify(decision.risk_approval_id,{...intent,size:1},false).ok,false);
 assert.equal(gate.verify(decision.risk_approval_id,intent,true).ok,true);
 assert.equal(gate.verify(decision.risk_approval_id,intent,true).ok,false);
});
