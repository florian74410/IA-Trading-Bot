'use strict';
const http=require('node:http'),crypto=require('node:crypto');
function fixture(){
 const state={requests:[],orders:new Map(),algos:new Map(),fills:new Map(),next:1000,leverage:'3',leverageScopes:new Map(),posMode:'net_mode',margin:'cross',fault:null,balance:'900',positions:[],delay:false,omitFees:false};
 const server=http.createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;const u=new URL(req.url,'http://localhost'),b=raw?JSON.parse(raw):{},q=Object.fromEntries(u.searchParams);state.requests.push({method:req.method,path:u.pathname,query:q,body:b});
 function reply(data,code='0'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({code,msg:'fixture',data}));}
 const sign=crypto.createHmac('sha256','PROFILE_SECRET_FIXTURE').update(req.headers['ok-access-timestamp']+req.method+req.url+raw).digest('base64');
 if(req.headers['x-fixture-original-host']!=='eea.okx.com'||!['PROFILE_FIXTURE','PROFILE_CRASH_FIXTURE'].includes(req.headers['ok-access-key'])||req.headers['ok-access-sign']!==sign)return reply([],'50113');
 const id=q.instId||b.instId||'BTC-USDT',type=q.instType||(/SWAP$/.test(id)?'SWAP':/\d{6}$/.test(id)?'FUTURES':'SPOT');
 if(req.method==='GET'){
  const instrument={instId:id,instType:type,instFamily:'BTC-USDT',baseCcy:'BTC',quoteCcy:'USDT',settleCcy:'USDT',state:'live',lotSz:['SWAP','FUTURES'].includes(type)?'1':'0.001',minSz:['SWAP','FUTURES'].includes(type)?'1':'0.001',tickSz:'0.01',lever:'10',groupId:'4',ctVal:'0.01',ctValCcy:'BTC',ctType:'linear'};
  switch(u.pathname){
   case '/api/v5/account/instruments':case '/api/v5/public/instruments':return reply(state.fault==='unavailable'?[]:[instrument]);
   case '/api/v5/account/config':return reply([{acctLv:state.acctLv||'2',posMode:state.posMode}]);
   case '/api/v5/account/balance':return reply([{totalEq:'2000',uTime:String(Date.now()),adjEq:'2000',imr:'0',details:[{ccy:'USDT',availBal:state.balance,availEq:state.balance,eq:'1000',eqUsd:'1000',cashBal:'1000',frozenBal:'100',liab:'0',uTime:String(Date.now())},{ccy:'BTC',availBal:'10',eq:'10',cashBal:'10',eqUsd:'1000',uTime:String(Date.now())}]}]);
   case '/api/v5/account/positions':return reply(state.positions);
   case '/api/v5/account/trade-fee':return reply(state.omitFees?[]:[{taker:'-0.001',ts:String(Date.now()),feeGroup:[{groupId:'4',taker:'-0.001'}]}]);
   case '/api/v5/account/leverage-info':return reply((state.posMode==='net_mode'?['net']:['long','short']).map(posSide=>({instId:id,mgnMode:q.mgnMode,posSide,lever:state.leverageScopes.get(id+'|'+q.mgnMode+'|'+posSide)||state.leverage})));
   case '/api/v5/public/funding-rate':return reply([{fundingRate:'0.0001'}]);
   case '/api/v5/market/ticker':return reply([{last:'100'}]);
   case '/api/v5/trade/order':{const r=[...state.orders.values()].find(x=>q.ordId?x.ordId===q.ordId:x.clOrdId===q.clOrdId);return reply(r?[r]:[]);}
   case '/api/v5/trade/order-algo':{const r=[...state.algos.values()].find(x=>q.algoId?x.algoId===q.algoId:x.algoClOrdId===q.algoClOrdId);return reply(r?[r]:[]);}
   case '/api/v5/trade/fills':return reply(state.fills.get(q.ordId)||[]);
   case '/api/v5/trade/orders-pending':return reply([...state.orders.values()].filter(x=>x.state==='live'));
   case '/api/v5/trade/orders-history':return reply([...state.orders.values()]);
   default:return reply([],'50000');
  }
 }
 if(state.fault==='reject'||b.ordType==='post_only'&&Number(b.px)>=100||b.ordType==='fok')return reply([{sCode:'51008',ordId:'',algoId:''}],'1');
 let data;
 switch(u.pathname){
  case '/api/v5/account/set-leverage':state.leverageScopes.set(b.instId+'|'+b.mgnMode+'|'+(b.posSide||'net'),b.lever);data=[{instId:b.instId,mgnMode:b.mgnMode,posSide:b.posSide||'net',lever:b.lever}];break;
  case '/api/v5/trade/batch-orders':data=b.map((item,i)=>{if(i===1&&state.fault==='batch-partial')return{clOrdId:item.clOrdId,ordId:'',sCode:'51008'};const ordId=String(++state.next);state.orders.set(ordId,{...item,ordId,instType:type,state:'live',accFillSz:'0',avgPx:''});return{ordId,clOrdId:item.clOrdId,sCode:'0'}});break;
  case '/api/v5/trade/order':{const ordId=String(++state.next),r={...b,ordId,instType:type,state:b.ordType==='market'?'filled':b.ordType==='ioc'?'partially_filled':'live',accFillSz:b.ordType==='market'?(b.tgtCcy==='quote_ccy'?String(Number(b.sz)/100):b.sz):b.ordType==='ioc'?'0.01':'0',avgPx:b.ordType==='market'||b.ordType==='ioc'?'100':'',uTime:String(Date.now())};state.orders.set(ordId,r);if(Number(r.accFillSz)>0)state.fills.set(ordId,[{instId:id,ordId,tradeId:'fill'+ordId,side:r.side,fillSz:r.accFillSz,fillPx:'100',fee:'-0.001',feeCcy:'USDT',ts:String(Date.now())}]);data=[{ordId,clOrdId:b.clOrdId,sCode:'0'}];break;}
  case '/api/v5/trade/order-algo':{const algoId=String(++state.next);state.algos.set(algoId,{...b,algoId,state:'live',instType:type,actualSz:'0'});data=[{algoId,algoClOrdId:b.algoClOrdId,sCode:'0'}];break;}
  case '/api/v5/trade/cancel-order':{const r=state.orders.get(b.ordId);if(!r||r.state==='filled')return reply([{ordId:b.ordId,sCode:'51401'}],'1');r.state='canceled';data=[{ordId:b.ordId,sCode:'0'}];break;}
  case '/api/v5/trade/amend-order':{const r=state.orders.get(b.ordId);if(!r||b.newSz&&Number(b.newSz)>10)return reply([{ordId:b.ordId,sCode:'51500'}],'1');if(b.newPx)r.px=b.newPx;if(b.newSz)r.sz=b.newSz;data=[{ordId:b.ordId,sCode:'0'}];break;}
  case '/api/v5/trade/cancel-algos':data=b.map(x=>{const r=state.algos.get(x.algoId);if(r)r.state='canceled';return{algoId:x.algoId,sCode:r?'0':'51401'}});break;
  case '/api/v5/trade/amend-algos':{const r=state.algos.get(b.algoId);if(!r)return reply([{algoId:b.algoId,sCode:'51401'}],'1');for(const [k,v]of Object.entries(b))if(k.startsWith('new'))r[k.slice(3,4).toLowerCase()+k.slice(4)]=v;data=[{algoId:b.algoId,sCode:'0'}];break;}
  default:return reply([],'50000');
 }
 if(state.fault==='lost'){req.socket.destroy();return;}
 if(state.fault==='timeout'){setTimeout(()=>{if(!res.destroyed)reply(data)},2000).unref();return;}
 reply(data);
 });
 return {server,state};
}
module.exports={fixture};
