'use strict';
const crypto=require('node:crypto');
function profileFixture(){
 const tokens={alice:crypto.randomBytes(32).toString('base64url'),bob:crypto.randomBytes(32).toString('base64url'),guest:crypto.randomBytes(32).toString('base64url')},active=new Map(Object.entries(tokens).map(([k,v])=>[v,{clientId:'CL'+k,role:k==='guest'?'GUEST':'USER'}])),preferences=new Map(),secrets=new Map();
 const verify=token=>active.get(token)||null,key=(token,s,k)=>{const p=verify(token);if(!p)throw Error('UNAUTHORIZED');return p.clientId+':'+s+':'+k;};
 const transaction=fn=>Object.assign((...a)=>fn(...a),{immediate:(...a)=>fn(...a)});
 const sessions={verifySession:verify,verifyHashedSession:hash=>{for(const [t,p]of active)if(crypto.createHash('sha256').update(Buffer.from(t,'base64url')).digest('hex')===hash)return p;return null;},getPreference:(t,s,k)=>preferences.get(key(t,s,k))||null,setPreference:(t,s,k,v)=>preferences.set(key(t,s,k),v),secrets:t=>{const p=verify(t);if(!p)throw Error('UNAUTHORIZED');return secrets.get(p.clientId)||{};},setSecrets:(t,s)=>{const p=verify(t);secrets.set(p.clientId,{...(secrets.get(p.clientId)||{}),...s});},attempt:()=>true,audit:()=>{},touch:()=>{},db:{transaction}};
 sessions.secretForSessionHash=(hash,name)=>{for(const [t,p]of active)if(p.role!=='GUEST'&&crypto.createHash('sha256').update(Buffer.from(t,'base64url')).digest('hex')===hash)return sessions.secrets(t)[name]||'';throw Error('UNAUTHORIZED');};
 sessions.tradingReadContext=hash=>{const token=[...active.keys()].find(t=>crypto.createHash('sha256').update(Buffer.from(t,'base64url')).digest('hex')===hash);return {principal:()=>{const p=verify(token);if(!p||p.role==='GUEST')throw Error('TRADING_ACCOUNT_UNAUTHORIZED');return p;},listAccounts:()=>JSON.parse(sessions.getPreference(token,'trading','accounts')||'[]'),secrets:()=>sessions.secrets(token)};};
 return {tokens,sessions,revoke:t=>active.delete(t)};
}
function apiFixture(now=Date.now()){
 const inst={instId:'BTC-USDT',instType:'SPOT',baseCcy:'BTC',quoteCcy:'USDT',minSz:'0.001',maxMktSz:'10',lotSz:'0.001',tickSz:'0.01',groupId:'4',state:'live'};
 const data={balance:[{totalEq:'2000',uTime:String(now),imr:'0',adjEq:'2000',details:[{ccy:'USDT',eq:'1000',eqUsd:'2000',cashBal:'1000',availBal:'900',frozenBal:'100',liab:'0',uTime:String(now)}]}],positions:[],orders:[],fees:[{ts:String(now),taker:'-0.1',feeGroup:[{groupId:'4',taker:'-0.001'},{groupId:'2',taker:'-0.02'}]}],instruments:[inst]};
 const requests=[];
 const transport=async request=>{requests.push(request);const u=new URL(request.url),which={'/api/v5/account/balance':'balance','/api/v5/account/positions':'positions','/api/v5/trade/orders-pending':'orders','/api/v5/account/trade-fee':'fees','/api/v5/public/instruments':'instruments'}[u.pathname];if(!which)throw Error('Unexpected fixture request');return {statusCode:200,body:{code:'0',data:structuredClone(data[which])}};};
 return {data,requests,transport};
}
module.exports={profileFixture,apiFixture};
