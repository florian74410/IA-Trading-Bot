'use strict';
const crypto=require('node:crypto'),{performance}=require('node:perf_hooks'),{Pool}=require('./pool'),{policy,aggregate}=require('./policy'),math=require('./math');
const clone=x=>JSON.parse(JSON.stringify(x));
const nonfinite=x=>typeof x==='number'?!Number.isFinite(x):x&&typeof x==='object'?Object.values(x).some(nonfinite):false;
function validate(a){
 const allowed=['portfolio_id','symbol','timeframe','context','intent','strategy_type','strategy_parameters','capital','horizon','correlation_id'];
 if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!allowed.includes(k)))throw Error('RISK_ARGUMENT_INVALID');
 for(const k of ['portfolio_id','symbol','correlation_id'])if(typeof a[k]!=='string'||!/^[A-Za-z0-9_./:-]{1,96}$/.test(a[k]))throw Error('RISK_ARGUMENT_INVALID:'+k);
 if(!math.MS[a.timeframe||'1m']||!['analysis','native_scalping'].includes(a.context||'analysis'))throw Error('RISK_ARGUMENT_INVALID');
 if(a.horizon!==undefined&&a.horizon!==(a.timeframe||'1m'))throw Error('RISK_HORIZON_MISMATCH');
 if(a.capital!==undefined&&(!Number.isFinite(a.capital)||a.capital<=0))throw Error('RISK_ARGUMENT_INVALID:capital');
 if(a.intent!==undefined&&(!a.intent||typeof a.intent!=='object'||Array.isArray(a.intent)))throw Error('RISK_ARGUMENT_INVALID:intent');
 if(a.strategy_type!==undefined&&(typeof a.strategy_type!=='string'||a.strategy_type.length>64))throw Error('RISK_ARGUMENT_INVALID:strategy_type');
 if(a.strategy_parameters!==undefined&&(!a.strategy_parameters||typeof a.strategy_parameters!=='object'||Array.isArray(a.strategy_parameters)))throw Error('RISK_ARGUMENT_INVALID:strategy_parameters');
 return clone({...a,timeframe:a.timeframe||'1m',context:a.context||'analysis'});
}
class Orchestrator{
 constructor({request,config={},pool,now=Date.now,authenticated=false}={}){this.request=request;this.policy=policy(config);this.pool=pool||new Pool();this.now=now;this.authenticated=authenticated;this.active=0;this.stored=new Map();}
 status(){return {schema:'risk.snapshot-status/1.0',active:this.active,stored:this.stored.size,max_concurrency:this.policy.maxSnapshotConcurrency,workers:this.pool.size,execution_authorization:false};}
 constraints(){return {schema:'risk.constraints/1.0',policy:clone(this.policy),provisional_calibration:true,modifiable_by_agent:false};}
 async fetch(target,action,args,signal){
  if(signal?.aborted)throw Error('RISK_CANCELLED');
  return new Promise((resolve,reject)=>{let done=false;const end=(err,x)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);err?reject(err):resolve(clone(x));},abort=()=>end(Error('RISK_CANCELLED'));
   const timer=setTimeout(()=>end(Error('RISK_SOURCE_TIMEOUT')),this.policy.ioTimeoutMs);signal?.addEventListener('abort',abort,{once:true});
   Promise.resolve().then(()=>this.request(target,action,args)).then(x=>end(null,x),()=>end(Error('RISK_SOURCE_UNAVAILABLE')));
  });
 }
 async collect(a,signal){
  // Existing Portfolio snapshot cannot select an owner/account. Never fall back to shared state under Auth21.
  const tasks={market:['marketdata','marketdata.candles',{symbol:a.symbol,timeframe:a.timeframe,limit:500,force:false}],
   book:['marketdata','marketdata.microstructure.snapshot',{symbol:a.symbol,depth:100,force:false}]};
  if(!this.authenticated){tasks.portfolio=['portfolio','portfolio.snapshot',{force:false}];tasks.trades=['portfolio','portfolio.trades',{limit:100}];}
  const out={},errors={};await Promise.all(Object.entries(tasks).map(async([k,v])=>{try{out[k]=await this.fetch(...v,signal);}catch(e){errors[k]=e.message;}}));
  if(signal?.aborted)throw Error('RISK_CANCELLED');
  const port=out.portfolio?.snapshot||out.portfolio||{},symbols=[...new Set((port.positions||[]).map(x=>x.symbol))];
  out.assetCandles={};
  if(symbols.length>this.policy.maxCorrelationAssets)errors.correlation='RISK_ASSET_LIMIT';
  else await Promise.all(symbols.map(async symbol=>{if(typeof symbol!=='string')return;try{
   const packet=symbol===a.symbol?out.market:await this.fetch('marketdata','marketdata.candles',{symbol,timeframe:a.timeframe,limit:500,force:false},signal);
   if(packet?.symbol===symbol&&(!packet.timeframe||packet.timeframe===a.timeframe))out.assetCandles[symbol]=packet.candles||packet.data?.candles?.value||packet.data?.ohlcv?.value;
  }catch(e){errors.correlation=e.message;}}));
  return {out,errors};
 }
 async create(args,{signal,mode='auto'}={}){
  const a=validate(args);signal=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(8000)]);if(this.active>=this.policy.maxSnapshotConcurrency)throw Error('RISK_OVERLOADED');this.active++;
  const started=performance.now();try{
   const {out,errors}=await this.collect(a,signal),p=this.policy,now=this.now();
   const market=out.market||{},portfolio=out.portfolio?.snapshot||out.portfolio||{},book=out.book||{};
   let candles=market.candles||market.data?.candles?.value||market.data?.ohlcv?.value||[];
   const rows=math.series(candles,a.timeframe),stamps={market:rows?.at(-1)?.t,portfolio:portfolio.timestamp??Date.parse(portfolio.asOf),book:book.observedAt};
   const ages={},issues=Object.keys(errors).map(k=>k.toUpperCase()+'_'+errors[k]);
   for(const [k,ttl] of [['market',p.marketMaxAgeMs+math.MS[a.timeframe]],['portfolio',p.portfolioMaxAgeMs],['book',p.bookMaxAgeMs]]){
    const t=stamps[k];ages[k]=Number.isFinite(t)?now-t:null;if(!Number.isFinite(t)||t>now+1000||now-t>ttl)issues.push(k.toUpperCase()+'_STALE_OR_UNDATED');
   }
   if(Number.isFinite(stamps.portfolio)&&Number.isFinite(stamps.book)&&Math.abs(stamps.portfolio-stamps.book)>p.maxSkewMs)issues.push('SOURCE_CLOCK_SKEW');
   if(portfolio.portfolio_id!==a.portfolio_id)issues.push('PORTFOLIO_SCOPE_UNVERIFIED');
   if(this.authenticated)issues.push('OWNER_SCOPED_PORTFOLIO_UNAVAILABLE');
   if(typeof portfolio.quoteCurrency!=='string'||portfolio.quoteCurrency!==book.quoteCurrency)issues.push('QUOTE_CURRENCY_UNVERIFIED');
   if(portfolio.reconciled!==true)issues.push('PORTFOLIO_UNRECONCILED');
   if(a.capital!==undefined&&a.capital>portfolio.equity)issues.push('CAPITAL_EXCEEDS_ACCOUNT_EQUITY');
   const canonical=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
   if(canonical(market.symbol)!==canonical(a.symbol)||canonical(book.symbol)!==canonical(a.symbol))issues.push('MARKET_SYMBOL_MISMATCH');
   if(market.timeframe&&market.timeframe!==a.timeframe)issues.push('MARKET_TIMEFRAME_MISMATCH');
   if(a.intent?.symbol&&canonical(a.intent.symbol)!==canonical(a.symbol))issues.push('INTENT_SYMBOL_MISMATCH');
   if(typeof a.intent?.exchange!=='string'||book.source!==a.intent.exchange)issues.push('EXECUTION_VENUE_UNVERIFIED');
   if(a.intent?.orderType&&a.intent.orderType!=='MARKET')issues.push('ORDER_TYPE_MODEL_UNAVAILABLE');
   if(a.intent?.market_type&&a.intent.market_type!=='SPOT')issues.push('MARKET_TYPE_MODEL_UNAVAILABLE');
   if(book.firewall?.decision!=='PASS')issues.push('MARKET_FIREWALL_PROOF_UNAVAILABLE');
   let trades=out.trades?.portfolio_id===a.portfolio_id?out.trades.trades:Array.isArray(out.trades)&&out.trades.every(t=>t.portfolio_id===a.portfolio_id)?out.trades:null;
   if(Array.isArray(trades)&&a.strategy_type)trades=trades.filter(t=>t.strategy_type===a.strategy_type);
   if(Array.isArray(trades))trades=trades.map(t=>({netPnl:Number.isFinite(t.netPnl)?t.netPnl:Number.isFinite(t.realized_pnl)&&Number.isFinite(t.fees)&&Number.isFinite(t.funding)?t.realized_pnl-t.fees+t.funding:null}));
   const dataset=clone({candles,timeframe:a.timeframe,portfolio,book,intent:a.intent||{},trades,
    feeRate:book.feeRate,exchangeConstraints:book.exchangeConstraints,assetCandles:out.assetCandles});
   const tasks=['market','portfolio','execution','strategy'],metrics={};
   const workload=candles.length*(1+(portfolio.positions?.length||0)**2);
   const useWorkers=mode==='parallel'||(mode==='auto'&&workload>=p.workerWorkThreshold);
   const run=async k=>{try{metrics[k]=!useWorkers?math[k](dataset):await this.pool.run(k,dataset,signal);}catch(e){if(e.message==='RISK_CANCELLED')throw e;metrics[k]={available:false,reason:e.message};}if(nonfinite(metrics[k]))metrics[k]={available:false,reason:'RISK_NONFINITE_RESULT'};};
   if(!useWorkers)for(const k of tasks)await run(k);else await Promise.all(tasks.map(run));
   if(signal?.aborted)throw Error('RISK_CANCELLED');
   const missing=tasks.filter(k=>!metrics[k].available);
   const {execution:e,portfolio:f}=metrics;
   if(e.available){const stop=a.intent?.stopLoss,side=a.intent?.action||a.intent?.side;
    e.stop_risk_quote=Number.isFinite(stop)&&stop>0&&((side==='BUY'&&stop<e.vwap)||(side==='SELL'&&stop>e.vwap))&&e.fee_rate!==null?
      Math.abs(e.vwap-stop)*e.filled_base+(e.fees_quote||0)+stop*e.filled_base*(e.fee_rate+e.slippage):null;
    if(e.stop_risk_quote===null)missing.push('execution.stop_protection');
    if(Number.isFinite(a.intent?.leverage)&&a.intent.leverage>1)missing.push('execution.leveraged_margin_model');
   }
   if(e.available&&e.fee_rate===null)missing.push('execution.fee_rate');
   if(e.available&&!e.exchange_constraints_valid)issues.push('EXCHANGE_CONSTRAINTS_UNVERIFIED');
   if(f.available&&f.daily_loss===null)missing.push('portfolio.daily_loss');
   if(f.available&&f.drawdown===null)missing.push('portfolio.drawdown');
   if(f.available&&f.correlations.some(x=>x.pearson===null))missing.push('portfolio.correlation');
   const blocks=[];
   if(e.available){if(e.partial_fill)blocks.push('INSUFFICIENT_BOOK_DEPTH');if(e.spread>p.maxSpread)blocks.push('SPREAD_LIMIT');if(e.slippage>p.maxSlippage)blocks.push('SLIPPAGE_LIMIT');if(e.depth_quote<p.minDepthQuote)blocks.push('LIQUIDITY_LIMIT');}
   if(f.available){if(f.gross_exposure+(e.available?e.notional/f.equity:0)>p.maxExposure)blocks.push('EXPOSURE_LIMIT');if(e.available&&e.notional/Math.min(f.equity,a.capital||f.equity)>p.maxPosition)blocks.push('POSITION_SIZE_LIMIT');if(f.position_count>=p.maxPositions)blocks.push('POSITION_COUNT_LIMIT');if(f.daily_loss>=p.maxDailyLoss)blocks.push('DAILY_LOSS_LIMIT');if(f.combined_stop_risk+(e.stop_risk_quote||0)/f.equity>p.maxStopRisk)blocks.push('STOP_RISK_LIMIT');}
   const intent=a.intent||{};if(intent.leverage!==undefined&&(!Number.isFinite(intent.leverage)||intent.leverage<=0||intent.leverage>p.maxLeverage))blocks.push('LEVERAGE_LIMIT');
   const scores=aggregate(metrics,p),critical=Object.entries(scores).some(([k,v])=>k!=='overall'&&v!==null&&v>=p.criticalScore);
   const requiredMissing=missing;
   const elapsedNow=this.now();for(const [k,ttl] of [['book',p.bookMaxAgeMs],['portfolio',p.portfolioMaxAgeMs],['market',p.marketMaxAgeMs+math.MS[a.timeframe]]])if(ages[k]!==null&&elapsedNow-stamps[k]>ttl&&!issues.includes(k.toUpperCase()+'_STALE_OR_UNDATED'))issues.push(k.toUpperCase()+'_EXPIRED_DURING_CALCULATION');
   let decision=blocks.length||critical?'BLOCK':issues.length||requiredMissing.length?'UNAVAILABLE':scores.overall>=p.reviewScore?'REVIEW':'ALLOW_WITH_LIMITS';
   const validity=Math.min(elapsedNow+p.ttlMs,...Object.entries(stamps).filter(([,t])=>Number.isFinite(t)).map(([k,t])=>t+({book:p.bookMaxAgeMs,portfolio:p.portfolioMaxAgeMs,market:p.marketMaxAgeMs+math.MS[a.timeframe]})[k]));
   const result={schema:'risk.snapshot/2.0',schema_version:'2.0',snapshot_id:crypto.randomUUID(),timestamp_utc:new Date(elapsedNow).toISOString(),
    portfolio_id:a.portfolio_id,symbol:a.symbol,context:a.context,timeframe:a.timeframe,horizon:a.timeframe,correlation_id:a.correlation_id,
    strategy_type:a.strategy_type||null,strategy_parameters:a.strategy_parameters||{},capital:a.capital||null,
    status:issues.length||requiredMissing.length?'INCOMPLETE':missing.length?'PARTIAL':'COMPLETE',decision,
    execution_authorization:false,valid_until_utc:new Date(validity).toISOString(),scores,metrics,
    constraints:clone(p),reasons:[...blocks,...(critical?['CRITICAL_COMPONENT_SCORE']:[]),...issues],warnings:['PROVISIONAL_SCORE_CALIBRATION',...missing.map(k=>'METRIC_UNAVAILABLE:'+k)],
    missing_metrics:missing,data_quality:{ages_ms:ages,source_timestamps:stamps,coherent:!issues.length,coverage:(tasks.length-missing.filter(k=>tasks.includes(k)).length)/tasks.length},
    data_reference:crypto.createHash('sha256').update(JSON.stringify(dataset)).digest('hex'),intent_hash:crypto.createHash('sha256').update(JSON.stringify(intent)).digest('hex'),executor:useWorkers?'WORKERS':'INLINE',calculation_time_ms:performance.now()-started};
   // Sanitise NaN/Infinity to null; calculations expose unavailable reasons explicitly.
   const safe=clone(result);this.stored.set(safe.snapshot_id,safe);while(this.stored.size>p.maxStored)this.stored.delete(this.stored.keys().next().value);return clone(safe);
  }finally{this.active--;}
 }
 get(id,portfolioId){const s=this.stored.get(id);if(!s||s.portfolio_id!==portfolioId)throw Error('RISK_SNAPSHOT_NOT_FOUND');const r=clone(s);if(this.now()>Date.parse(r.valid_until_utc)){r.status='EXPIRED';r.decision='UNAVAILABLE';r.reasons.push('SNAPSHOT_EXPIRED');}return r;}
 async close(){await this.pool.close();}
}
module.exports={Orchestrator,validate};
