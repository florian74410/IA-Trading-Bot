'use strict';
const CP=require('../../Communication/communication_protocol_v1'),{proofCodec}=require('../../Clients/auth21_ipc_proof'),{permission}=require('../../Clients/UserManagement/owner_policy');
// Constructed inside Core from persisted, independently authenticated session state.
async function envelope(runtime,session,message){
 const principal=runtime.sessions.verifyHashedSession(session.session_hash),operation=permission(message.target,message.action);if(!principal||principal.clientId!==session.owner||!['ADMIN','USER'].includes(principal.role)||operation!=='self.read'&&!['strategy.dry_run','strategy.evaluate'].includes(message.action))throw Error('OWNER_OPERATION_DENIED');
 const args=message.arguments||{},scope=JSON.parse(session.scope_json);if(scope.portfolio_id&&(args.portfolio_id||args.account)!==scope.portfolio_id)throw Error('SESSION_SCOPE_DENIED');
 const codec=proofCodec({secret:Buffer.from(CP.ensureSecret(runtime.root),'hex')}),payload={clientId:principal.clientId,sessionHash:session.session_hash,action:message.action,args};
 if(['portfolio.account.snapshot','risk.snapshot.create'].includes(message.action)){
  if(scope.exchange&&scope.exchange!=='OKX'||scope.markets&&!scope.markets.includes('SPOT')||args.exchange&&args.exchange!=='OKX'||args.intent?.exchange&&args.intent.exchange!=='OKX'||!runtime.tradingVault)throw Error('OKX_PROFILE_ACCOUNT_REQUIRED');
  if(message.action==='risk.snapshot.create')require('../../../Risk/Snapshots/orchestrator').validate(args);
  const intent={exchange:'OKX',market_type:'SPOT',symbol:args.symbol||'BTC-USDT',account:args.portfolio_id||args.account};if(!intent.account)delete intent.account;
  const grant=await runtime.tradingVault.issueReadForSession(session.session_hash,intent),accountRead={owner:principal.clientId,account:grant.account.id,ticket:grant.ticket,intent};
  if(message.target==='portfolio')payload.accountRead=accountRead;else{const portfolio={clientId:principal.clientId,sessionHash:session.session_hash,action:'portfolio.account.snapshot',args:{account:grant.account.id,exchange:'OKX',symbol:intent.symbol},accountRead};payload.portfolioRead={payload:portfolio,proof:codec.issue({principal,audience:'portfolio',operation:'self.read',method:'POST',ownerClientId:principal.clientId,action:'portfolio.user.request',bodyDigest:CP.hashData(portfolio)})};}
 }
 return {payload,proof:codec.issue({principal,audience:message.target,operation,method:'POST',ownerClientId:principal.clientId,action:message.target+'.user.request',bodyDigest:CP.hashData(payload)})};
}
module.exports={envelope};
