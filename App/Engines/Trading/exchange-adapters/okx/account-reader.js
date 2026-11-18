'use strict';
// Read-only OKX account API. No caller-provided URL, credentials or HTTP method.
const crypto=require('node:crypto');
const HOSTS={GLOBAL:'www.okx.com',EEA:'eea.okx.com',US:'us.okx.com'};
function number(x){if(typeof x==='number')return Number.isFinite(x)?x:null;if(typeof x!=='string'||!x.trim()||!/^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(x))return null;const n=Number(x);return Number.isFinite(n)?n:null;}
function instrument(symbol){const s=String(symbol||'').toUpperCase();if(/^[A-Z0-9]{2,20}-[A-Z0-9]{2,12}$/.test(s))return s;const m=/^([A-Z0-9]{2,20}?)[/]?(USDT|USDC|USD|EUR|BTC|ETH)$/.exec(s);if(!m)throw Error('OKX_SPOT_SYMBOL_INVALID');return m[1]+'-'+m[2];}
async function reader(ctx){
 if(!ctx.secretProvider||typeof ctx.transport!=='function')throw Error('OKX_PROFILE_CREDENTIALS_UNAVAILABLE');
 const s=await ctx.secretProvider.get('OKX'),key=s.api_key||s.apiKey,secret=s.api_secret||s.apiSecret||s.secret;
 if(typeof key!=='string'||!key||typeof secret!=='string'||!secret||typeof s.passphrase!=='string'||!s.passphrase)throw Error('OKX_PROFILE_CREDENTIALS_INCOMPLETE');
 const host=HOSTS[s.apiRegion||'GLOBAL'];if(!host)throw Error('OKX_REGION_INVALID');
 return async function get(path,params={},privateCall=true){
  if(!['/api/v5/account/balance','/api/v5/account/positions','/api/v5/trade/orders-pending','/api/v5/account/trade-fee','/api/v5/public/instruments'].includes(path))throw Error('OKX_READ_PATH_DENIED');
  await ctx.revalidate?.();const query=new URLSearchParams(params).toString(),requestPath=path+(query?'?'+query:''),headers={};
  if(privateCall){const at=new Date().toISOString();Object.assign(headers,{'OK-ACCESS-KEY':key,'OK-ACCESS-PASSPHRASE':s.passphrase,'OK-ACCESS-TIMESTAMP':at,'OK-ACCESS-SIGN':crypto.createHmac('sha256',secret).update(at+'GET'+requestPath).digest('base64')});if(s.demoMode===true||s.demo_mode===true)headers['x-simulated-trading']='1';}
  let r;try{r=await ctx.transport({method:'GET',url:'https://'+host+requestPath,headers,timeoutMs:4000,maxBytes:2*1024*1024});}catch(_){throw Error('OKX_ACCOUNT_TRANSPORT_UNAVAILABLE');}
  await ctx.revalidate?.();
  if(r.statusCode===429)throw Error('OKX_ACCOUNT_RATE_LIMITED');
  if(r.statusCode<200||r.statusCode>=300||!r.body||String(r.body.code)!=='0'||!Array.isArray(r.body.data))throw Error('OKX_ACCOUNT_READ_REJECTED');
  if(r.body.data.length>1000)throw Error('OKX_ACCOUNT_DATA_LIMIT');return r.body.data;
 };
}
function balances(rows){if(rows.length!==1||!Array.isArray(rows[0].details)||rows[0].details.length>500)throw Error('OKX_BALANCE_INVALID');const x=rows[0];return {equityUSD:number(x.totalEq),timestamp:number(x.uTime),balances:x.details.map(d=>({asset:d.ccy,equity:number(d.eq),equityUSD:number(d.eqUsd),cash:number(d.cashBal),available:number(d.availBal),availableEquity:number(d.availEq),frozen:number(d.frozenBal),liability:number(d.liab),timestamp:number(d.uTime)})),marginRatio:number(x.mgnRatio),marginUsedUSD:number(x.imr),adjustedEquityUSD:number(x.adjEq)};}
function positions(rows){return rows.map(p=>({id:p.posId,symbol:p.instId,market_type:p.instType,quantityContracts:number(p.pos),side:p.posSide,notionalUSD:number(p.notionalUsd),unrealizedPnl:number(p.upl),margin:number(p.margin),leverage:number(p.lever),liquidationPrice:number(p.liqPx),marginRatio:number(p.mgnRatio),timestamp:number(p.uTime)}));}
function orders(rows){if(rows.length>=100)throw Error('OKX_OPEN_ORDERS_PAGINATION_REQUIRED');return rows.map(o=>({id:o.ordId,symbol:o.instId,market_type:o.instType,side:o.side,type:o.ordType,state:o.state,quantity:number(o.sz),filled:number(o.accFillSz),price:number(o.px),timestamp:number(o.uTime)}));}
async function read(kind,input,ctx){const get=await reader(ctx);
 if(kind==='balances')return {ok:true,exchange:'OKX',...balances(await get('/api/v5/account/balance'))};
 if(kind==='positions')return {ok:true,exchange:'OKX',positions:positions(await get('/api/v5/account/positions'))};
 if(kind==='orders')return {ok:true,exchange:'OKX',orders:orders(await get('/api/v5/trade/orders-pending',{limit:'100'}))};
 if(kind!=='snapshot'||input.market_type&&input.market_type!=='SPOT')throw Error('OKX_ACCOUNT_READ_KIND_INVALID');
 const instId=instrument(input.symbol),start=Date.now();
 const [balanceRows,positionRows,orderRows,feeRows,instruments]=await Promise.all([
  get('/api/v5/account/balance'),get('/api/v5/account/positions'),get('/api/v5/trade/orders-pending',{limit:'100'}),
  get('/api/v5/account/trade-fee',{instType:'SPOT',instId}),get('/api/v5/public/instruments',{instType:'SPOT',instId},false)]);
 const b=balances(balanceRows),inst=instruments.find(x=>x.instId===instId&&x.instType==='SPOT');
 if(!inst||inst.state!=='live'||feeRows.length!==1)throw Error('OKX_INSTRUMENT_UNAVAILABLE');
 const rates=feeRows[0].feeGroup?.filter(g=>String(g.groupId)===String(inst.groupId));
 // Deprecated flat taker field can describe the wrong fee group: never substitute it.
 const signedTaker=rates?.length===1?number(rates[0].taker):null;
 return {ok:true,schema:'trading.okx-account/1.0',exchange:'OKX',symbol:instId,...b,positions:positions(positionRows),orders:orders(orderRows),
  feeRate:signedTaker===null?null:Math.max(0,-signedTaker),feeObservedAt:number(feeRows[0].ts),
  instrument:{symbol:instId,baseCurrency:inst.baseCcy,quoteCurrency:inst.quoteCcy,minQuantity:number(inst.minSz),maxQuantity:number(inst.maxMktSz),quantityStep:number(inst.lotSz),priceStep:number(inst.tickSz),groupId:String(inst.groupId||'')},
  readStartedAt:start,readCompletedAt:Date.now(),readOnly:true};
}
module.exports={read,reader,balances,positions,orders,number,instrument,HOSTS};
