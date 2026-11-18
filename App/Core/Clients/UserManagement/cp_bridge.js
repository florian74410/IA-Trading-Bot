'use strict';
// Only Core can attach a principal. Browser fields never establish ownership.
const CP=require('../../Communication/communication_protocol_v1'),Client=require('../../Communication/cp1_client');
const {proofCodec}=require('../auth21_ipc_proof');
const PUBLIC=new Set([
 'marketdata.health','marketdata.asset.price','marketdata.catalog','marketdata.asset.resolve','marketdata.symbols','marketdata.ticker','marketdata.providers','marketdata.registry.search','marketdata.registry.list','marketdata.registry.asset','marketdata.registry.query','marketdata.financial.snapshot','marketdata.financial.history','marketdata.dex.liquidity.snapshot','marketdata.derivatives.open_interest','marketdata.liquidations.stats','marketdata.liquidations.streams',
 'fundamental.health','fundamental.summary','fundamental.news.search','fundamental.sources.search','fundamental.source.get','fundamental.feeds.search','fundamental.providers.status','fundamental.fedwatch.get','fundamental.calendar.upcoming','liquidity.zones']);
const GUEST_READ=new Set(['marketdata.providers','marketdata.registry.search','marketdata.registry.list','marketdata.registry.asset']);
const IND_READ=new Set(['indicator.registry.reload','indicator.registry.status','indicator.settings.get','indicator.list_indicators','indicator.definition.get','indicator.definition.validate','indicator.language.info','indicator.language.validate','indicator.language.compile']);
function createBridge({root,sessions,routerPort,tradingVault=null,functionRegistry=null,configurationFor=()=>({}),env=process.env}){
 const client=new Client({root,routerPort,serviceEnv:env,maxBytes:4*1024*1024,timeout:15000});
 const supervisorClient=new Client({root,routerPort,serviceEnv:env,maxBytes:4*1024*1024,timeout:135000});
 const codec=proofCodec({secret:Buffer.from(CP.ensureSecret(root),'hex')});
 const rpc=(target,action,args)=>new Promise((resolve,reject)=>(target==='supervisor'&&action==='supervisor.user.request'?supervisorClient:client).request(target,action,args,'analysis',(e,o)=>e?reject(e):resolve(o)));
 async function bridge(token,input,{operatorAuthorized=false}={}){
  const principal=sessions.verifySession(token);if(!principal)throw Error('UNAUTHORIZED');
  if(!input||Object.keys(input).some(k=>!['target','action','arguments'].includes(k))||typeof input.action!=='string')throw Error('INVALID_REQUEST');
  let {target,action}=input,a=input.arguments||{};
  if(!a||typeof a!=='object'||Array.isArray(a))throw Error('INVALID_REQUEST');
  if(!sessions.attempt(require('node:crypto').createHash('sha256').update('bridge:'+principal.clientId).digest('hex'),300))throw Error('AUTH_THROTTLED');
  if(require('../../../Bank/Core/feature_policy_v2_4_1').blockedAction(action))throw Error('BANK_FEATURE_SUSPENDED');
  const expected=action.split('.')[0];if(target!==expected)throw Error('FORBIDDEN');
  if(target==='trading'&&(require('../../Execution/manual_contract').isAction(action)||action==='trading.account.inspect')){
   if(!tradingVault||principal.role==='GUEST'||a.metadata)throw Error('FORBIDDEN');
   if(require('../../Execution/manual_contract').isAction(action)&&(!a.proof||a.owner!==principal.clientId))throw Error('MANUAL_OWNER_CONFIRMATION_REQUIRED');
   if(require('../../Execution/manual_contract').isAction(action)&&action!==require('../../Execution/manual_contract').actionFor(a.spec))throw Error('MANUAL_ACTION_MISMATCH');
   const grant=await tradingVault.issue(token,a,require('../../Execution/manual_contract').isAction(action)?(a.spec.kind.startsWith('CANCEL')?'cancel':a.spec.position_id?'close':'execute'):'read');
   return rpc(target,action,{...a,metadata:{account_ticket:grant.ticket}});
  }
  if(target==='trading'&&['trading.execute','trading.cancel','trading.close_position'].includes(action)){
   if(!tradingVault||principal.role==='GUEST'||a.metadata?.account_ticket)throw Error('FORBIDDEN');
   const kind=action==='trading.cancel'?'cancel':action==='trading.close_position'||a.reduce_only===true?'close':'execute';
   const grant=await tradingVault.issue(token,a,kind);
   return rpc(target,action,{...a,metadata:{...(a.metadata||{}),account_ticket:grant.ticket}});
  }
  if(target==='trading'&&['trading.account.snapshot','trading.account.balances','trading.account.positions','trading.account.orders'].includes(action)){
   if(principal.role==='GUEST'||!tradingVault||a.metadata||a.exchange!=='OKX')throw Error('FORBIDDEN');
   const intent={...a,market_type:a.market_type||'SPOT',symbol:a.symbol||'BTC-USDT'};
   const grant=await tradingVault.issue(token,intent,'read');return rpc(target,action,{...intent,metadata:{account_ticket:grant.ticket}});
  }
  const operatorPermission=require('./operator_policy').permission(target,action);if(operatorPermission){if(principal.role==='GUEST'||(operatorPermission!=='shared.write'&&principal.role!=='ADMIN')||['admin.write','shared.write'].includes(operatorPermission)&&!operatorAuthorized)throw Error('FORBIDDEN');if(operatorPermission==='shared.write'){if(action==='fundamental.collect'&&(Object.keys(a).some(k=>!['all','eventLimit'].includes(k))||a.all!==true||a.eventLimit!==undefined&&(!Number.isSafeInteger(a.eventLimit)||a.eventLimit<1||a.eventLimit>250)))throw Error('INVALID_REQUEST');if(action==='fundamental.fedwatch.refresh'&&Object.keys(a).length)throw Error('INVALID_REQUEST');if(!sessions.attempt(require('node:crypto').createHash('sha256').update('refresh:'+principal.clientId).digest('hex'),60))throw Error('AUTH_THROTTLED');}const payload={clientId:principal.clientId,sessionHash:require('node:crypto').createHash('sha256').update(Buffer.from(token,'base64url')).digest('hex'),action,args:a},proof=codec.issue({principal,audience:target,operation:operatorPermission,method:'POST',ownerClientId:principal.clientId,action:target+'.operator.request',bodyDigest:CP.hashData(payload)});sessions.audit(principal.clientId,'OPERATOR_ENGINE_REQUESTED');return rpc(target,target+'.operator.request',{payload,proof});}
  if(a.force===true||a.refresh===true)throw Error('FORBIDDEN');
  const ownerOperation=require('./owner_policy').permission(target,action);
  if(ownerOperation){if(principal.role==='GUEST')throw Error('FORBIDDEN');const payload={clientId:principal.clientId,sessionHash:require('node:crypto').createHash('sha256').update(Buffer.from(token,'base64url')).digest('hex'),action,args:a};if(target==='portfolio'&&action==='portfolio.account.snapshot'){
 if(Object.keys(a).some(k=>!['account','exchange','symbol'].includes(k))||a.exchange&&a.exchange!=='OKX')throw Error('INVALID_REQUEST');
 payload.accountRead=await require('./okx_read_delegation').issue({token,principal,args:a,vault:tradingVault,codec});
}
if(target==='risk'&&action==='risk.snapshot.create'){
 require("../../../Engines/Risk/Snapshots/orchestrator").validate(a);
 if(a.intent?.exchange&&a.intent.exchange!=='OKX')throw Error('INVALID_REQUEST');
 payload.portfolioRead=await require('./okx_read_delegation').issue({token,principal,args:a,vault:tradingVault,codec,kind:'risk'});
}
if(target==='supervisor'&&action.startsWith('supervisor.engine.')){
 const fields=action==='supervisor.engine.objective'?['room','workspace_id','objective']:action==='supervisor.engine.observe'?['room','workspace_id','engine','command']:action==='supervisor.engine.discover'?['room','workspace_id','recover']:['room','workspace_id'];
 if(Object.keys(a).some(k=>!fields.includes(k)))throw Error('INVALID_REQUEST');
 if(a.room!==undefined&&(typeof a.room!=='string'||!/^[-A-Za-z0-9_]{1,64}$/.test(a.room)))throw Error('INVALID_REQUEST');
 if(a.workspace_id!==undefined&&!/^[-A-Za-z0-9_]{1,64}$/.test(a.workspace_id)||a.recover!==undefined&&typeof a.recover!=='boolean')throw Error('INVALID_REQUEST');
 if(action==='supervisor.engine.objective'&&(typeof a.objective!=='string'||!a.objective.trim()||a.objective.length>1200))throw Error('INVALID_REQUEST');
 if(action==='supervisor.engine.observe'&&(!/^[a-z][a-z0-9_-]{0,40}$/.test(a.engine||'')||!/^[a-z][a-z0-9_.-]{0,95}$/.test(a.command||'')))throw Error('INVALID_REQUEST');
 let agent=null;if(functionRegistry&&['supervisor.engine.discover','supervisor.engine.observe'].includes(action)){try{agent=await functionRegistry.gatewaySession(token,'supervisor_engine');}catch(_){agent=null;}}
 payload.engine={agentToken:agent?.token||null};
}
if(target==='supervisor'&&action.startsWith('supervisor.chatbot.')){
 const settings=require('./chatbot_settings').get(sessions,token),grant=functionRegistry?await functionRegistry.gatewaySession(token):null;payload.chatbot={settings,agentToken:grant?.token||null,accounts:tradingVault?tradingVault.list(token).map(a=>({id:a.id,exchange:a.exchange,enabled:a.enabled,demoMode:a.demoMode===true,markets:a.markets,default:a.default})):[]};
 if(action==='supervisor.chatbot.message'){if(typeof a.message!=='string'||!a.message.trim()||a.message.length>1400)throw Error('INVALID_REQUEST');if(!sessions.attempt(require('node:crypto').createHash('sha256').update('hybrid:'+principal.clientId).digest('hex'),30))throw Error('AUTH_THROTTLED');const spec=require("../../../Engines/Supervisor/ChatBot/llm").spec(require("../../../Engines/Supervisor/ChatBot").scrub(a.message.trim()));const gateway={clientId:principal.clientId,sessionHash:payload.sessionHash,operation:action,spec,configuration:configurationFor(token)};payload.delegation={gateway,proof:codec.issue({principal,audience:'ai_gateway',operation:'self.write',method:'POST',ownerClientId:principal.clientId,action:'ai_gateway.owner.responses',bodyDigest:CP.hashData(gateway)})};}
}
if(target==='supervisor'){payload.configuration=configurationFor(token);if(action==='supervisor.llm.select'&&principal.role!=='ADMIN')throw Error('FORBIDDEN');if(['supervisor.reason','supervisor.structured','supervisor.cognitive.reason'].includes(action)){if(typeof a.prompt!=='string'||!a.prompt.trim()||a.prompt.length>(action==='supervisor.cognitive.reason'?12000:120000)||String(a.instructions||a.system||'').length>24000||JSON.stringify(a.schema||{}).length>65536)throw Error('INVALID_REQUEST');if(action==='supervisor.cognitive.reason'&&(a.sessionId!==undefined&&!/^[A-Za-z0-9_-]{1,128}$/.test(a.sessionId)||a.model!==undefined&&(typeof a.model!=='string'||a.model.length>80)))throw Error('INVALID_REQUEST');if(!sessions.attempt(require('node:crypto').createHash('sha256').update('ai:'+principal.clientId).digest('hex'),20))throw Error('AUTH_THROTTLED');const gateway={clientId:principal.clientId,sessionHash:payload.sessionHash,operation:action,spec:a,configuration:payload.configuration};payload.delegation={gateway,proof:codec.issue({principal,audience:'ai_gateway',operation:'self.write',method:'POST',ownerClientId:principal.clientId,action:'ai_gateway.owner.responses',bodyDigest:CP.hashData(gateway)})};}}const proof=codec.issue({principal,audience:target,operation:ownerOperation,method:'POST',ownerClientId:principal.clientId,action:target+'.user.request',bodyDigest:CP.hashData(payload)});return rpc(target,target+'.user.request',{payload,proof});}
  if(PUBLIC.has(action)){if(principal.role==='GUEST'&&!GUEST_READ.has(action))throw Error('FORBIDDEN');if(a.force===true||a.refresh===true)throw Error('FORBIDDEN');if(!sessions.attempt(require('node:crypto').createHash('sha256').update('rpc:'+principal.clientId).digest('hex'),300))throw Error('AUTH_THROTTLED');const output=await rpc(target,action,a);return principal.role!=='ADMIN'&&['fundamental.feeds.search','fundamental.providers.status','fundamental.source.get','fundamental.sources.search'].includes(action)?require('./public_metadata').redact(output):output;}
  if(target!=='indicator')throw Error('FORBIDDEN');
  let defs=principal.role==='GUEST'?{}:JSON.parse(sessions.getPreference(token,'indicators','definitions')||'{}');
  const listing=await rpc('indicator','indicator.registry.status',{}),builtins=(listing.items||[]).filter(x=>x.kind==='BuiltIn');
  const nativeIds=new Set(builtins.map(x=>x.id));
  const items=builtins.concat(Object.values(defs).map(d=>({id:d.id,name:d.name,kind:'Custom',category:d.category,display:d.display,outputs:d.outputs,inputs:d.inputs,chartAvailable:true})));
  if(['indicator.registry.reload','indicator.registry.status'].includes(action))return {ok:true,status:{total:items.length,errors:[]},items};
  const ownSettings=JSON.parse(sessions.getPreference(token,'indicators','settings')||'{"enabled":{},"refreshMs":15000}');
  const settings={schema:'iatb.indicator.settings/1.0',refreshMs:ownSettings.refreshMs,enabled:Object.fromEntries(items.map(x=>[x.id,ownSettings.enabled?.[x.id]!==false]))};
  if(['indicator.settings.get','indicator.list_indicators'].includes(action))return {ok:true,settings};
  if(action==='indicator.settings.set'){if(principal.role==='GUEST')throw Error('FORBIDDEN');const patch=a.settings||a;if(Object.keys(patch).some(k=>!['enabled','refreshMs'].includes(k))||patch.enabled&&typeof patch.enabled!=='object'||patch.refreshMs!==undefined&&![1000,5000,15000,30000,60000].includes(patch.refreshMs))throw Error('INVALID_REQUEST');for(const [id,value] of Object.entries(patch.enabled||{})){if(typeof value!=='boolean'||!items.some(x=>x.id===id))throw Error('INVALID_REQUEST');settings.enabled[id]=value;}if(patch.refreshMs)settings.refreshMs=patch.refreshMs;sessions.setPreference(token,'indicators','settings',JSON.stringify(settings));return {ok:true,settings};}
  if(action==='indicator.definition.get'){if(defs[a.id])return {definition:defs[a.id],meta:items.find(x=>x.id===a.id)};if(!nativeIds.has(a.id))throw Error('NOT_FOUND');return rpc(target,action,a);}
  if(IND_READ.has(action)){if(principal.role==='GUEST'&&!['indicator.definition.get','indicator.language.info'].includes(action))throw Error('FORBIDDEN');return rpc(target,action,a);}
  if(principal.role==='GUEST')throw Error('FORBIDDEN');
  if(['indicator.financial_context','indicator.financial_series','indicator.financial_analyze'].includes(action))return rpc(target,action,a);
  if(['indicator.definition.create','indicator.language.create'].includes(action)){
   let definition=a.definition;
   if(action==='indicator.language.create'){const compiled=await rpc(target,'indicator.language.compile',{source:a.source});if(!compiled.ok)throw Error('INDICATOR_INVALID');definition=compiled.definition;}
   const valid=await rpc(target,'indicator.definition.validate',{definition});if(!valid.ok||nativeIds.has(definition.id))throw Error('INDICATOR_INVALID');
   if(defs[definition.id]&&a.overwrite!==true)throw Error('INDICATOR_ALREADY_EXISTS');if(!defs[definition.id]&&Object.keys(defs).length>=32)throw Error('INDICATOR_LIMIT');
   defs[definition.id]=definition;sessions.setPreference(token,'indicators','definitions',JSON.stringify(defs));return {ok:true,id:definition.id};
  }
  if(action==='indicator.custom.delete'){if(!defs[a.id])throw Error('NOT_FOUND');delete defs[a.id];sessions.setPreference(token,'indicators','definitions',JSON.stringify(defs));return {ok:true,id:a.id};}
  if(action==='indicator.compute_batch_data'){
   if(!sessions.attempt(require('node:crypto').createHash('sha256').update('compute:'+principal.clientId).digest('hex'),300))throw Error('AUTH_THROTTLED');
   const payload={clientId:principal.clientId,sessionHash:require('node:crypto').createHash('sha256').update(Buffer.from(token,'base64url')).digest('hex'),data:a,definitions:defs};
   const proof=codec.issue({principal,audience:'indicators',operation:'self.read',method:'POST',ownerClientId:principal.clientId,action:'indicator.user.compute',bodyDigest:CP.hashData(payload)});
   return rpc('indicator','indicator.user.compute',{payload,proof});
  }
  // No fallthrough to global Custom registry, global settings or execution.
  throw Error('FORBIDDEN');
 }
 let manual=null;const api={bridge,rpc,codec,prepareOrder:(token,p)=>orders().prepare(token,p),confirmOrder:(token,p)=>orders().confirm(token,p),cancelOrder:(token,p)=>orders().cancel(token,p),reconcileOrder:(token,p)=>orders().reconcileAdvanced(token,p.preparation_id),resumePlan:(token,p)=>orders().advancePlan(token,p.preparation_id),orderHistory:token=>orders().history(token),close:()=>{manual?.close();manual=null;}};function orders(){if(!manual)manual=new (require('../../Execution/manual_orders').ManualOrders)({root,sessions,bridge:api,vault:tradingVault,env});return manual;}return api;
}
module.exports={createBridge,PUBLIC,GUEST_READ};
