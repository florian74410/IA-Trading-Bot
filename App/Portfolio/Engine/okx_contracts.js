'use strict';
// Metadata is descriptive. It never grants an agent or bypasses an Auth21 owner proof.
function enrich(item,engine){
 const name=item.name,owner=name==='risk.user.request'||name==='portfolio.account.snapshot';
 if(!owner&&!(engine==='trading'&&/^trading.account.(?:snapshot|balances|positions|orders)$/.test(name)))return null;
 const required=name==='risk.user.request'?['payload','proof']:engine==='trading'?(name.endsWith('.snapshot')?['exchange','symbol','metadata']:['exchange','metadata']):[];
 const properties=name==='risk.user.request'?{payload:{type:'object'},proof:{type:'string',maxLength:1024}}:{exchange:{const:'OKX'},account:{type:'string'},symbol:{type:'string'},...(engine==='trading'?{market_type:{const:'SPOT'},metadata:{type:'object',required:['account_ticket'],properties:{account_ticket:{type:'string'}},additionalProperties:false}}:{})};
 return {id:name,engine,type:'READ',risk_level:'MEDIUM',hard_deny:owner,description:owner?'Owner-scoped profile read, accepted only through the authenticated Core owner bridge.':'Read OKX account data using a short-lived owner-bound vault ticket; no order or withdrawal.',
 input:{type:'object',required,properties,additionalProperties:false},output:{type:'object',description:name==='portfolio.account.snapshot'?'Owner-scoped portfolio.account/1.0 snapshot, balances, USD valuation, available quote and explicit risk quality.':engine==='trading'?'Normalized account data with verified account_identity; never returns credentials.':'Structured owner Risk response.'},
 errors:['OWNER_OPERATION_DENIED','TRADING_ACCOUNT_TICKET_REQUIRED','TRADING_TICKET_INVALID','OKX_ACCOUNT_READ_REJECTED','OKX_ACCOUNT_RATE_LIMITED'],source:engine==='trading'?"App/Engines/Trading/exchange-adapters/okx/account-reader.js":engine==='portfolio'?'App/Portfolio/Engine/okx_account.js':'App/Risk/Engine/risk_service.js',verified_handler:true,default_privilege:'DENY',side_effects:false,
 examples:owner?[{}]:[{exchange:'OKX',account:'okx-main',symbol:'BTC-USDT',metadata:{account_ticket:'ISSUED_BY_CORE_ONLY'}}]};
}
module.exports={enrich};
