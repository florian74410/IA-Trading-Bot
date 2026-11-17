'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {apiFixture,profileFixture}=require('./okx_fixture'),{OkxExecutor}=require('../../services/trading-engine/exchange-adapters/okx/executor'),{TradingEngine}=require('../../services/trading-engine/trading-engine'),{TradingVault}=require('../../Core/Clients/UserManagement/trading_vault'),{createVaultClient}=require('../../services/trading-engine/vault-client'),{normalize}=require('../Engine/okx_account');
const settings={id:'okx-profile',exchange:'OKX',markets:['SPOT'],actions:['read'],enabled:true,default:true,apiRegion:'EEA',demoMode:true,credentials:{apiKey:'FIXTURE_KEY',apiSecret:'FIXTURE_SECRET',passphrase:'FIXTURE_PASS'}};
async function setup(){const f=profileFixture(),vault=new TradingVault({sessions:f.sessions}),api=apiFixture();await vault.save(f.tokens.alice,settings);const routing=createVaultClient({request:b=>vault.access(b)}),engine=new TradingEngine({accountRouting:routing,transport:api.transport,lifecycle:{canExecute:()=>false}});engine.registerExecutor('OKX',new OkxExecutor());return {...f,vault,api,engine};}
const intent={exchange:'OKX',account:'okx-profile',market_type:'SPOT',symbol:'BTC-USDT'};
test('OKX reads use profile credentials, correct GET HMAC, selected region/demo and fee group',async()=>{
 const f=await setup(),g=await f.vault.issue(f.tokens.alice,intent,'read'),s=await f.engine.accountSnapshot({...intent,metadata:{account_ticket:g.ticket}});
 assert.equal(s.account_identity.owner,'CLalice');assert.equal(s.account_identity.id,'okx-profile');assert.equal(s.equityUSD,2000);assert.equal(s.feeRate,.001);assert.equal(s.readOnly,true);assert.equal(f.api.requests.length,5);
 for(const r of f.api.requests){assert.equal(r.method,'GET');assert.equal(new URL(r.url).host,'eea.okx.com');assert.equal(r.body,undefined);if(r.url.includes('/public/')){assert.deepEqual(r.headers,{});continue;}assert.equal(r.headers['OK-ACCESS-KEY'],'FIXTURE_KEY');assert.equal(r.headers['x-simulated-trading'],'1');const u=new URL(r.url),signature=crypto.createHmac('sha256','FIXTURE_SECRET').update(r.headers['OK-ACCESS-TIMESTAMP']+'GET'+u.pathname+u.search).digest('base64');assert.equal(signature,r.headers['OK-ACCESS-SIGN']);}
 assert.ok(!JSON.stringify(s).includes('FIXTURE_'));assert.ok(!JSON.stringify(f.vault.list(f.tokens.alice)).includes('FIXTURE_'));
 const p=normalize(s,{clientId:'CLalice'},'okx-profile');assert.equal(p.equity,1000);assert.equal(p.fx.usdPerQuote,2);assert.equal(p.availableQuote,900);assert.equal(p.equityUSD,2000);assert.equal(p.dailyPnl,null);
});
test('profile ownership, replay, expiry, no ambient secret fallback and no write escalation',async()=>{
 const f=await setup();await assert.rejects(f.vault.issue(f.tokens.bob,intent,'read'),/NOT_ASSIGNED/);await assert.rejects(f.vault.issue(f.tokens.guest,intent,'read'),/UNAUTHORIZED/);
 const g=await f.vault.issue(f.tokens.alice,intent,'read'),a={...intent,metadata:{account_ticket:g.ticket}};
 await assert.rejects(f.engine.accountSnapshot({...a,symbol:'ETH-USDT'}),/INVALID/);
 await f.engine.accountSnapshot(a);await assert.rejects(f.engine.accountSnapshot(a),/REPLAY/);
 await assert.rejects(f.vault.issue(f.tokens.alice,{...intent,side:'BUY'},'read'),/SCOPE_INVALID/);
 const ambient=new TradingEngine({secretProvider:{get:async()=>settings.credentials},transport:f.api.transport,lifecycle:{}});ambient.registerExecutor('OKX',new OkxExecutor());await assert.rejects(ambient.accountSnapshot(intent),/AUTHORITY_UNAVAILABLE/);
 await assert.rejects(f.vault.issue(f.tokens.alice,{...intent,side:'BUY',quantity:'1',client_order_id:'x',risk_approval_id:'x'},'execute'),/NOT_ASSIGNED/);
});
test('session revocation and assignment rotation during a read discard all account data',async()=>{
 const f=await setup(),g=await f.vault.issue(f.tokens.alice,intent,'read');let calls=0;
 f.engine.transport=async r=>{const result=await f.api.transport(r);if(++calls===1)f.revoke(f.tokens.alice);return result;};
 await assert.rejects(f.engine.accountSnapshot({...intent,metadata:{account_ticket:g.ticket}}),/UNAUTHORIZED|REVOKED/);
});
test('missing fee group, quote FX, stale source timestamps and manual positions remain explicit',async()=>{
 const f=await setup();delete f.api.data.fees[0].feeGroup;const g=await f.vault.issue(f.tokens.alice,intent,'read'),s=await f.engine.accountSnapshot({...intent,metadata:{account_ticket:g.ticket}});assert.equal(s.feeRate,null);
 const bad=structuredClone(s);bad.balances[0].equityUSD=null;const p=normalize(bad,{clientId:'CLalice'},'okx-profile');assert.equal(p.equity,null);assert.ok(p.warnings.includes('QUOTE_FX_UNAVAILABLE'));assert.equal(p.reconciled,false);
 const staleTime=Date.now()-60000,stale=normalize({...s,timestamp:staleTime},{clientId:'CLalice'},'okx-profile');assert.ok(stale.warnings.includes('OKX_ACCOUNT_STALE'));assert.equal(stale.timestamp,staleTime, 'timestamp must not be replaced with receipt time');
 assert.throws(()=>normalize(s,{clientId:'CLbob'},'okx-profile'),/SCOPE_DENIED/);
});
test('OKX transport, rate limits and API errors are sanitized; unbounded order pages fail closed',async()=>{
 for(const answer of [{statusCode:429,body:{}},{statusCode:200,body:{code:'50119',msg:'secret-must-not-escape',data:[]}}]){const f=await setup();f.engine.transport=async()=>answer;const g=await f.vault.issue(f.tokens.alice,intent,'read');await assert.rejects(f.engine.balances({...intent,metadata:{account_ticket:g.ticket}}),e=>/OKX_ACCOUNT_(RATE_LIMITED|READ_REJECTED)/.test(e.message)&&!e.message.includes('secret-must'));}
 const f=await setup();f.api.data.orders=Array.from({length:100},()=>({}));const g=await f.vault.issue(f.tokens.alice,intent,'read');await assert.rejects(f.engine.accountSnapshot({...intent,metadata:{account_ticket:g.ticket}}),/PAGINATION_REQUIRED/);
});
test('legacy trading assignments can read without being re-entered',async()=>{const f=await setup();await f.vault.save(f.tokens.alice,{...settings,actions:['execute'],credentials:undefined});const g=await f.vault.issue(f.tokens.alice,intent,'read');assert.equal((await f.engine.balances({...intent,metadata:{account_ticket:g.ticket}})).equityUSD,2000);});
test('zero available balance is retained and partial balances never become reconciled',async()=>{const f=await setup();f.api.data.balance[0].details[0].availBal='0';const g=await f.vault.issue(f.tokens.alice,intent,'read'),s=await f.engine.accountSnapshot({...intent,metadata:{account_ticket:g.ticket}}),p=normalize(s,{clientId:'CLalice'},'okx-profile');assert.equal(p.availableQuote,0);const bad=structuredClone(s);bad.balances.push({asset:'ETH',equity:null,equityUSD:null,liability:null});const incomplete=normalize(bad,{clientId:'CLalice'},'okx-profile');assert.equal(incomplete.reconciled,false);assert.ok(incomplete.warnings.includes('BALANCE_VALUATIONS_INCOMPLETE'));});
test('read ticket expires and profile credential rotation invalidates a pending read',async()=>{const f=await setup();let at=1000;const v=new TradingVault({sessions:f.sessions,now:()=>at}),g=await v.issue(f.tokens.alice,intent,'read');at+=30001;await assert.rejects(v.access({ticket:g.ticket,intent,action:'read',operation:'bind'}),/INVALID/);const grant=await f.vault.issue(f.tokens.alice,intent,'read');await f.vault.save(f.tokens.alice,{...settings,credentials:{apiKey:'ROTATED_FIXTURE',apiSecret:'ROTATED_SECRET_FIXTURE',passphrase:'ROTATED_PASS_FIXTURE'}});await assert.rejects(f.engine.accountSnapshot({...intent,metadata:{account_ticket:grant.ticket}}),/REVOKED/);});
