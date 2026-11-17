'use strict';
// Pure calculations: null denotes unavailable/undefined, never a synthetic zero.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const sd=a=>{if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};
const quantile=(a,p)=>{const b=[...a].sort((x,y)=>x-y),i=(b.length-1)*p;return b.length?b[Math.floor(i)]+(b[Math.ceil(i)]-b[Math.floor(i)])*(i%1):null;};
const PERIODS={'1m':525600,'5m':105120,'15m':35040,'30m':17520,'1h':8760,'4h':2190,'1d':365};
const MS={'1m':60000,'5m':300000,'15m':900000,'30m':1800000,'1h':3600000,'4h':14400000,'1d':86400000};
function series(candles,tf){
 if(!Array.isArray(candles)||candles.length<21||!MS[tf])return null;
 const rows=candles.map(c=>Array.isArray(c)?{t:c[0],p:c[4]}:{t:c.timestamp??c.time,p:c.close??c.c});
 if(rows.some((r,i)=>!finite(r.t)||!finite(r.p)||r.p<=0||(i&&r.t-rows[i-1].t!==MS[tf])))return null;
 return rows;
}
function market(d){
 const rows=series(d.candles,d.timeframe);if(!rows)return {available:false,reason:'MARKET_HISTORY_INVALID_OR_UNALIGNED'};
 const r=rows.slice(1).map((v,i)=>Math.log(v.p/rows[i].p)),m=mean(r),s=sd(r),n=PERIODS[d.timeframe],loss=r.map(x=>-x);
 const v95=quantile(loss,.95),v99=quantile(loss,.99),tail=p=>Math.max(0,mean(loss.filter(x=>x>=p)));
 let peak=rows[0].p,dd=0;for(const x of rows){peak=Math.max(peak,x.p);dd=Math.max(dd,(peak-x.p)/peak);}
 const downside=Math.sqrt(mean(r.map(x=>Math.min(0,x)**2))),annualLog=m*n;
 return {available:true,samples:r.length,first_timestamp:rows[0].t,last_timestamp:rows.at(-1).t,log_mean:m,
  volatility:s,realized_volatility:Math.sqrt(r.reduce((a,x)=>a+x*x,0)),annualized_volatility:s*Math.sqrt(n),
  short_term_volatility:sd(r.slice(-20)),var_gaussian_95:Math.max(0,1.6448536269514722*s-m),var_gaussian_99:Math.max(0,2.3263478740408408*s-m),
  var_historical_95:Math.max(0,v95),var_historical_99:Math.max(0,v99),cvar_95:tail(v95),cvar_99:tail(v99),max_drawdown:dd,
  sharpe:s>0?m/s*Math.sqrt(n):null,sortino:downside>0?m/downside*Math.sqrt(n):null,
  calmar:dd>0&&Math.abs(annualLog)<700?Math.expm1(annualLog)/dd:null,expected_return_to_var:v95>0?m/v95:null};
}
function correlation(a,b,tf){
 const x=series(a,tf),y=series(b,tf);if(!x||!y||x.length!==y.length||x.some((r,i)=>r.t!==y[i].t))return null;
 const u=x.slice(1).map((r,i)=>Math.log(r.p/x[i].p)),v=y.slice(1).map((r,i)=>Math.log(r.p/y[i].p));
 const su=sd(u),sv=sd(v),mu=mean(u),mv=mean(v);return su>0&&sv>0?u.reduce((s,z,i)=>s+(z-mu)*(v[i]-mv),0)/((u.length-1)*su*sv):null;
}
function portfolio(d){
 const p=d.portfolio||{},positions=p.positions;
 if(Array.isArray(positions)&&positions.length>32)return {available:false,reason:'PORTFOLIO_POSITION_LIMIT'};
 if(p.analysis_mode==='TRADING_ONLY'||!finite(p.equity)||p.equity<=0||!Array.isArray(positions))return {available:false,reason:'ACCOUNT_EQUITY_UNAVAILABLE'};
 let gross=0,stops=0;const assets={};
 for(const x of positions){if(!finite(x.notional)||!finite(x.estimatedStopRiskQuote)||x.estimatedStopRiskQuote<0||!x.symbol)return {available:false,reason:'POSITION_RISK_INCOMPLETE'};
  const v=Math.abs(x.notional);gross+=v;stops+=x.estimatedStopRiskQuote;const key=String(x.symbol);if(!/^[A-Za-z0-9_./:-]{1,96}$/.test(key)||['__proto__','constructor','prototype'].includes(key))return {available:false,reason:'POSITION_SYMBOL_INVALID'};assets[key]=(assets[key]||0)+v;}
 const max=Math.max(0,...Object.values(assets)),history=d.assetCandles||{},keys=Object.keys(assets),pairs=[];
 for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)pairs.push({a:keys[i],b:keys[j],pearson:correlation(history[keys[i]],history[keys[j]],d.timeframe)});
 return {available:true,equity:p.equity,gross_exposure:gross/p.equity,exposure_by_asset:assets,concentration:max/p.equity,
  hhi:gross>0?Object.values(assets).reduce((s,v)=>s+(v/gross)**2,0):0,combined_stop_risk:stops/p.equity,position_count:positions.length,
  drawdown:finite(p.peakEquity)&&p.peakEquity>0?Math.max(0,(p.peakEquity-p.equity)/p.peakEquity):null,
  daily_loss:finite(p.dailyPnl)?Math.max(0,-p.dailyPnl/p.equity):null,correlations:pairs};
}
function execution(d){
 const b=d.book||{},i=d.intent||{};let asks=b.orderBook?.asks,bids=b.orderBook?.bids;
 if(!Array.isArray(asks)||!asks.length||!Array.isArray(bids)||!bids.length)return {available:false,reason:'ORDERBOOK_UNAVAILABLE'};
 asks=asks.map(x=>({price:x.price,quantity:x.size??x.quantity}));bids=bids.map(x=>({price:x.price,quantity:x.size??x.quantity}));
 const valid=(a,asc)=>a.every((x,j)=>finite(x.price)&&x.price>0&&finite(x.quantity)&&x.quantity>0&&(!j||(asc?x.price>=a[j-1].price:x.price<=a[j-1].price)));
 // Collector size is denominated in base units.
 if(!valid(asks,true)||!valid(bids,false)||asks[0].price<bids[0].price)return {available:false,reason:'ORDERBOOK_INVALID'};
 const side=i.action||i.side,q=i.size??i.quantity,levels=side==='BUY'?asks:bids;
 if(!['BUY','SELL'].includes(side)||!finite(q)||q<=0)return {available:false,reason:'ORDER_INTENT_REQUIRED'};
 const mid=(asks[0].price+bids[0].price)/2,spread=(asks[0].price-bids[0].price)/mid;
 let remaining=q,cost=0;for(const l of levels){const take=Math.min(remaining,l.quantity);cost+=take*l.price;remaining-=take;if(remaining<=0)break;}
 const filled=q-remaining,fee=d.feeRate;
 return {available:true,spread,depth_base:levels.reduce((s,l)=>s+l.quantity,0),depth_quote:levels.reduce((s,l)=>s+l.quantity*l.price,0),
  filled_base:filled,partial_fill:remaining>1e-12,vwap:filled>0?cost/filled:null,slippage:filled>0?Math.max(0,side==='BUY'?(cost/filled-mid)/mid:(mid-cost/filled)/mid):null,
  fee_rate:finite(fee)&&fee>=0&&fee<=.1?fee:null,fees_quote:finite(fee)&&fee>=0&&fee<=.1?cost*fee:null,notional:q*mid,
  exchange_constraints_valid:!!(d.exchangeConstraints&&finite(d.exchangeConstraints.minQuantity)&&finite(d.exchangeConstraints.maxQuantity)&&finite(d.exchangeConstraints.quantityStep)&&d.exchangeConstraints.quantityStep>0&&q>=d.exchangeConstraints.minQuantity&&q<=d.exchangeConstraints.maxQuantity&&Math.abs(q/d.exchangeConstraints.quantityStep-Math.round(q/d.exchangeConstraints.quantityStep))<1e-8)};
}
function strategy(d){
 const t=d.trades;if(!Array.isArray(t)||!t.length||t.some(x=>!finite(x.netPnl)))return {available:false,reason:'CLOSED_NET_TRADE_HISTORY_UNAVAILABLE'};
 const a=t.map(x=>x.netPnl),wins=a.filter(x=>x>0),losses=a.filter(x=>x<0),gain=wins.reduce((s,x)=>s+x,0),loss=-losses.reduce((s,x)=>s+x,0);
 return {available:true,samples:a.length,expectancy:mean(a),win_rate:wins.length/a.length,profit_factor:loss>0?gain/loss:null,
  distribution:{min:Math.min(...a),p05:quantile(a,.05),median:quantile(a,.5),p95:quantile(a,.95),max:Math.max(...a)},gain,loss};
}
module.exports={market,portfolio,execution,strategy,correlation,series,MS};
