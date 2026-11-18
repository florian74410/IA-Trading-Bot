'use strict';
// Portfolio receives normalized public account data via CP/1, never API credentials.
const Store=require('./portfolio_store'),{number}=require("../../Engines/Trading/exchange-adapters/okx/account-reader");
function normalize(packet,principal,account,now=Date.now()){
 const identity=packet?.account_identity;
 if(packet?.ok!==true||packet.exchange!=='OKX'||identity?.owner!==principal.clientId||identity?.id!==account||identity.exchange!=='OKX')throw Error('PORTFOLIO_ACCOUNT_SCOPE_DENIED');
 const quote=packet.instrument?.quoteCurrency,balances=packet.balances;
 if(!Array.isArray(balances)||!Array.isArray(packet.positions)||!Array.isArray(packet.orders)||packet.equityUSD===null||!Number.isFinite(packet.equityUSD)||packet.equityUSD<0)throw Error('PORTFOLIO_ACCOUNT_DATA_INVALID');
 const q=balances.find(x=>x.asset===quote),fx=quote==='USD'?1:q?.equity>0&&q?.equityUSD>0?q.equityUSD/q.equity:null;

 const positions=balances.filter(x=>x.asset!==quote&&Number.isFinite(x.equity)&&Math.abs(x.equity)>1e-12).map(x=>({symbol:x.asset+quote,asset:x.asset,quantity:x.equity,
  notional:Number.isFinite(x.equityUSD)&&fx?x.equityUSD/fx:null,estimatedStopRiskQuote:null,source:'OKX_SPOT_HOLDING'}));
 for(const p of packet.positions){positions.push({symbol:p.symbol,quantityContracts:p.quantityContracts,notional:fx&&Number.isFinite(p.notionalUSD)?p.notionalUSD/fx:null,estimatedStopRiskQuote:null,leverage:p.leverage,marginRatioPct:Number.isFinite(p.marginRatio)?p.marginRatio*100:null,market_type:p.market_type,source:'OKX_POSITION'});}
 const balanceComplete=balances.every(b=>typeof b.asset==='string'&&/^[A-Z0-9]{1,20}$/.test(b.asset)&&Number.isFinite(b.equity)&&Number.isFinite(b.equityUSD));
 const total=balanceComplete?balances.reduce((s,b)=>s+b.equityUSD,0):null,totalMatches=total!==null&&Math.abs(total-packet.equityUSD)<=Math.max(1,Math.abs(packet.equityUSD)*.005),liabilitiesClear=balances.every(b=>b.liability===0);
 const asOf=packet.timestamp,valid=Number.isFinite(asOf)&&asOf<=now+1000&&now-asOf<=15000,
  coherent=Number.isFinite(packet.readCompletedAt)&&Number.isFinite(packet.readStartedAt)&&packet.readCompletedAt>=packet.readStartedAt&&packet.readCompletedAt-packet.readStartedAt<=5000&&packet.readCompletedAt<=now+1000;
 const available=fx&&Number.isFinite(q?.available)?q.available:null,frozen=fx&&Number.isFinite(q?.frozen)?q.frozen:null;
 return {schema:'portfolio.account/1.0',analysis_mode:'OKX_ACCOUNT',portfolio_id:account,account_id:account,exchange:'OKX',ownerScoped:true,
  timestamp:asOf,observedAt:packet.readCompletedAt,quoteCurrency:quote||null,equity:fx?packet.equityUSD/fx:null,equityUSD:packet.equityUSD,
  cash:available,availableQuote:available,frozenQuote:frozen,marginUsedUSD:packet.marginUsedUSD,
  fx:fx?{quoteCurrency:quote,usdPerQuote:fx,source:quote==='USD'?'IDENTICAL_UNIT':'OKX_BALANCE_EQUSD_DIV_EQ',timestamp:asOf}:null,
  reconciled:!!(valid&&coherent&&fx&&balanceComplete&&totalMatches&&liabilitiesClear&&packet.positions.length===0&&positions.every(p=>Number.isFinite(p.notional))&&packet.orders.length===0),
  positions,balances,openOrders:packet.orders,open_order_count:packet.orders.length,
  dailyPnl:null,peakEquity:null,closed_trades:[],
  execution_context:{exchange:'OKX',symbol:packet.symbol,quoteCurrency:quote,feeRate:packet.feeRate,feeObservedAt:packet.feeObservedAt,exchangeConstraints:packet.instrument},
  warnings:[...(!balanceComplete?['BALANCE_VALUATIONS_INCOMPLETE']:[]),...(!totalMatches?['ACCOUNT_BALANCE_TOTAL_MISMATCH']:[]),...(!liabilitiesClear?['ACCOUNT_LIABILITIES_UNVERIFIED']:[]),...(!valid?['OKX_ACCOUNT_STALE']:[]),...(!coherent?['OKX_ACCOUNT_READ_SKEW']:[]),...(!fx?['QUOTE_FX_UNAVAILABLE']:[]),...(packet.positions.length?['DERIVATIVES_RISK_MODEL_UNAVAILABLE']:[]),...(packet.orders.length?['OPEN_ORDER_RESERVATIONS_REQUIRE_RECONCILIATION']:[]),...(positions.length?['SPOT_STOP_PROTECTIONS_UNAVAILABLE']:[]),'DAILY_PNL_REQUIRES_FLOW_ADJUSTED_HISTORY']};
}
function createService({root,dbPath,request,now=Date.now}){
 let active=0;const lastRead=new Map();
 return {async read(principal,args,delegation){
  if(!['ADMIN','USER'].includes(principal?.role)||delegation?.owner!==principal.clientId||typeof delegation?.account!=='string'||typeof delegation?.ticket!=='string')throw Error('PORTFOLIO_OWNER_DELEGATION_REQUIRED');
  if(args.account&&args.account!==delegation.account||args.exchange&&args.exchange!=='OKX')throw Error('PORTFOLIO_ACCOUNT_SCOPE_DENIED');
  const key=principal.clientId+':'+delegation.account,at=now();for(const [k,t] of lastRead)if(at-t>60000)lastRead.delete(k);
  if(at-(lastRead.get(key)||0)<1000)throw Error('PORTFOLIO_ACCOUNT_REFRESH_THROTTLED');if(lastRead.size>=256&&!lastRead.has(key))throw Error('PORTFOLIO_ACCOUNT_BUSY');lastRead.set(key,at);
  if(active>=4)throw Error('PORTFOLIO_ACCOUNT_BUSY');active++;
  try{
   const packet=await request('trading','trading.account.snapshot',{...delegation.intent,metadata:{account_ticket:delegation.ticket}});
   const snapshot=normalize(packet,principal,delegation.account,now()),store=new Store(root,{dbPath,clientId:principal.clientId});
   try{
    const key='okx.account.'+delegation.account,old=store.getSetting(key,null);
    if(Number.isFinite(snapshot.equityUSD)&&snapshot.reconciled){
     const peak=Math.max(snapshot.equityUSD,old?.peakEquityUSD||0);
     snapshot.peakEquity=snapshot.fx?peak/snapshot.fx.usdPerQuote:null;
     snapshot.peakObservedSince=old?.firstObservedAt||snapshot.observedAt;
     store.setSetting(key,{snapshot,peakEquityUSD:peak,firstObservedAt:snapshot.peakObservedSince});
    }
    // Filter local closed trades by this exact account. realized_pnl in this ledger is already net.
    snapshot.closed_trades=store.closedTrades(1000).filter(t=>t.account_id===delegation.account&&t.exchange==='OKX').map(t=>({portfolio_id:delegation.account,strategy_type:t.strategy_type||null,netPnl:number(t.realized_pnl)}));
   }finally{store.close();}
   return {snapshot,readOnly:true};
  }finally{active--;}
 }};
}
module.exports={normalize,createService};
