'use strict';
function fixture(now=Date.now()){
 const candles=Array.from({length:101},(_,j)=>[now-(101-j)*60000,100,100,100,100+Math.sin(j)*.005]);
 const args={portfolio_id:'account-1',symbol:'BTCUSDT',timeframe:'1m',context:'native_scalping',correlation_id:'test-1',intent:{exchange:'BINANCE',action:'BUY',size:1,stopLoss:99,leverage:1}};
 const sources={market:{symbol:'BTCUSDT',timeframe:'1m',candles},portfolio:{portfolio_id:'account-1',quoteCurrency:'USDT',timestamp:now,equity:10000,peakEquity:10000,dailyPnl:0,reconciled:true,positions:[]},
  book:{source:'BINANCE',symbol:'BTCUSDT',quoteCurrency:'USDT',observedAt:now,firewall:{decision:'PASS'},orderBook:{bids:[{price:99.99,size:2000}],asks:[{price:100.01,size:2000}]},feeRate:.0001,exchangeConstraints:{minQuantity:.001,maxQuantity:10,quantityStep:.001}},trades:{portfolio_id:'account-1',trades:[{netPnl:2},{netPnl:-1},{netPnl:3}]}};
 const request=async(target,action)=>structuredClone(action==='marketdata.candles'?sources.market:action==='marketdata.microstructure.snapshot'?sources.book:action==='portfolio.trades'?sources.trades:sources.portfolio);
 return {now,args,sources,request};
}
module.exports={fixture};
