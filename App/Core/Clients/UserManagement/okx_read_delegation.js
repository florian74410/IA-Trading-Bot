'use strict';
// Called only by the verified Core session bridge. Never accepts an owner, key or credentialRef.
const CP=require('../../Communication/communication_protocol_v1');
async function issue({token,principal,args,vault,codec,kind='portfolio'}){
 if(!vault||!['ADMIN','USER'].includes(principal.role))throw Error('OKX_PROFILE_ACCOUNT_REQUIRED');
 const account=kind==='risk'?args.portfolio_id:args.account;
 const intent={exchange:'OKX',market_type:'SPOT',symbol:args.symbol||'BTC-USDT',...(account?{account}:{})};
 const grant=await vault.issue(token,intent,'read');
 const accountRead={owner:principal.clientId,account:grant.account.id,ticket:grant.ticket,intent};
 if(kind!=='risk')return accountRead;
 const payload={clientId:principal.clientId,sessionHash:require('node:crypto').createHash('sha256').update(Buffer.from(token,'base64url')).digest('hex'),action:'portfolio.account.snapshot',args:{account:grant.account.id,exchange:'OKX',symbol:intent.symbol},accountRead};
 return {payload,proof:codec.issue({principal,audience:'portfolio',operation:'self.read',method:'POST',ownerClientId:principal.clientId,action:'portfolio.user.request',bodyDigest:CP.hashData(payload)})};
}
module.exports={issue};
