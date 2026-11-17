'use strict';
// Fault injection at owner/Engine/provider boundaries. The local resolver, state,
// Risk calculations, approval gate, binding, Trading and OKX adapter are real.
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {ManualOrders}=require('./manual_orders'),{profileFixture}=require('../../Portfolio/Tests/okx_fixture'),{fixture}=require('../../Risk/Tests/snapshot_fixture'),{Orchestrator}=require('../../Risk/Snapshots/orchestrator'),{RiskGate}=require('../../Risk/Engine/risk_gate'),{TradingEngine}=require('../../services/trading-engine/trading-engine'),{OkxExecutor}=require('../../services/trading-engine/exchange-adapters/okx/executor'),{HybridChatBot}=require('../../Supervisor/ChatBot'),{State}=require('../../Supervisor/ChatBot/state');
const BUY='Achète 5 USDT de BTC-USDT Spot Market Live sur OKX compte okx-main';
const SELL='Vends 0,05 BTC de BTC-USDT Spot Market Live sur OKX compte okx-main';
const results=[];
function harness(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-order-scenarios-')),previous=process.env.IATB_RUNTIME_ROOT;process.env.IATB_RUNTIME_ROOT=dir;
 const f=profileFixture(),data=fixture(),accounts=[{id:'okx-main',owner:'CLalice',enabled:true,exchange:'OKX',demoMode:false,markets:['SPOT'],actions:['execute','read'],revision:1,apiRegion:'EEA'}];
 Object.assign(data.sources.portfolio,{portfolio_id:'okx-main',availableQuote:900,peakEquity:null,dailyPnl:null,closed_trades:[],balances:[{asset:'BTC',available:1}]});Object.assign(data.sources.book,{source:'OKX',market_type:'SPOT'});
 const risk=new Orchestrator({request:data.request,authenticated:true}),gate=new RiskGate({secret:'FAKE_GATE_SECRET',getSettings:()=>({enabled:true,thresholds:{leverageWarning:5}})}),auth={principal:f.sessions.verifySession(f.tokens.alice),sessionHash:crypto.createHash('sha256').update(Buffer.from(f.tokens.alice,'base64url')).digest('hex')};
 const bot=new HybridChatBot({root:dir,state:new State(dir)}),env={IATB_DATA_ROOT:dir,IATB_TRADING_LIVE:'true'},calls=[],h={...f,dir,data,accounts,risk,gate,bot,auth,env,calls,running:true,riskReads:0,brokerMode:'accepted',riskMutation:null,beforeRisk:null,afterApproval:null,beforeTrading:null};
 const engine=new TradingEngine({liveExecutionEnabled:true,lifecycle:{canExecute:()=>h.running,snapshot:()=>({generation:1}),submit:(_,send)=>{if(!h.running)throw Error('TRADING_ENGINE_RUNTIME_LOCKED');return send();}},secretProvider:{get:async()=>{if(h.noCredentials)throw Error('TRADING_CREDENTIALS_INCOMPLETE');return {apiKey:'FAKE_KEY',apiSecret:'FAKE_SECRET',passphrase:'FAKE_PASS',apiRegion:'EEA'};}},transport:async request=>{
  calls.push({method:request.method,url:request.url,payload:JSON.parse(request.body)});
  if(h.brokerMode==='timeout')throw Error('BROKER_TIMEOUT');
  if(h.brokerMode==='http503')return {statusCode:503,body:{code:'50001',msg:'Service temporarily unavailable',data:[]}};
  if(h.brokerMode==='ambiguous50004')return {statusCode:200,body:{code:'50004',msg:'Request timeout',data:[]}};
  if(h.brokerMode==='empty')return {statusCode:200,body:{code:'0',data:[]}};
  if(h.brokerMode==='noOrderId')return {statusCode:200,body:{code:'0',data:[{sCode:'0'}]}};
  if(h.brokerMode==='rejected')return {statusCode:200,body:{code:'1',data:[{sCode:'51008',sMsg:'Order failed; insufficient account balance',ordId:''}]}};
  return {statusCode:200,body:{code:'0',data:[{sCode:'0',ordId:'simulated-order'}]}};
 }});engine.registerExecutor('OKX',new OkxExecutor());
 const bridge={bridge:async(token,q)=>{
  if(q.action==='supervisor.chatbot.confirm')return bot.confirm(q.arguments,auth);
  if(q.action==='supervisor.chatbot.cancel')return bot.cancel(q.arguments,auth);
  if(q.action==='risk.snapshot.create'){h.riskReads++;await h.beforeRisk?.(h,q);const s=await risk.create(q.arguments,{ownerContext:{ownerId:'CLalice',portfolioRead:{}}});return h.riskMutation?h.riskMutation(s,h):s;}
  if(q.action==='risk.order.authorize'){const s=risk.get(q.arguments.snapshot_id,q.arguments.portfolio_id,'CLalice'),approval=gate.evaluate(q.arguments.intent,{snapshot:s,ownerId:'CLalice'});await h.afterApproval?.(h,approval);return approval;}
  if(q.action==='trading.execute'){await h.beforeTrading?.(h,q);if(h.firewallOff)throw Error('MUTATING_TRADING_BLOCKED_IN_FIREWALL_BYPASS');if(!require('./binding').valid(q.arguments))throw Error('MANUAL_ORDER_BINDING_MISMATCH');const v=gate.verify(q.arguments.risk_approval_id,q.arguments.metadata.trade_intent,true);if(!v.ok)throw Error(v.error);return engine.execute(q.arguments);}
  throw Error('UNEXPECTED_ACTION');
 }};
 let orders=new ManualOrders({root:dir,sessions:f.sessions,bridge,vault:{list:()=>accounts},env});
 h.ask=async(message=BUY)=>{const response=await bot.message({message},auth,{accounts,settings:{mode:'LOCAL'}});if(response.preparation){response.preparation=await orders.prepare(f.tokens.alice,response.preparation);response.message=response.preparation.message;}h.lastResponse=response;return response;};
 h.confirm=async(response=h.lastResponse,patch={})=>{const p=response.preparation;try{h.lastAction=await orders.confirm(f.tokens.alice,{preparation_id:p.id,digest:p.digest,...patch});return h.lastAction;}catch(e){h.lastAction={message:require('./messages').message(e.message)};throw e;}};
 h.cancel=async(response=h.lastResponse)=>orders.cancel(f.tokens.alice,{preparation_id:response.preparation.id});
 h.history=token=>orders.history(token||f.tokens.alice);h.db=()=>orders.db;h.confirmAs=(token,r)=>orders.confirm(token,{preparation_id:r.preparation.id,digest:r.preparation.digest});
 h.reopen=()=>{orders.close();orders=new ManualOrders({root:dir,sessions:f.sessions,bridge,vault:{list:()=>accounts},env});};
 t.after(async()=>{orders.close();bot.close();await risk.close();if(previous===undefined)delete process.env.IATB_RUNTIME_ROOT;else process.env.IATB_RUNTIME_ROOT=previous;fs.rmSync(dir,{recursive:true,force:true});});
 return h;
}
function scenario(id,label,run,request=BUY){test(label,async t=>{const h=harness(t),row={id,case:label,user_request:request};try{await run(h);row.status='PASS';}catch(e){row.status='FAIL';row.error=e.message;throw e;}finally{row.broker_requests=h.calls.length;row.user_response=h.lastAction?.message||h.lastResponse?.preparation?.message||h.lastResponse?.message||null;row.journal=h.db().prepare('SELECT phase,result FROM manual_orders ORDER BY updated').all().map(x=>({phase:x.phase,result:x.result?JSON.parse(x.result):null}));row.trace=h.db().prepare('SELECT phase,details FROM manual_order_events ORDER BY seq').all().map(e=>({phase:e.phase,code:JSON.parse(e.details).code||null}));assert(!JSON.stringify(row).includes('FAKE_SECRET'));results.push(row);}});}
function blocked(h,r,reason){assert.equal(r.preparation.confirmable,false);if(reason)assert(r.preparation.warnings.some(w=>w.includes(reason)),JSON.stringify(r.preparation));assert.equal(h.calls.length,0);}
scenario('missing_amount','Demande incomplète : demander le montant, sans ordre ni préparation',async h=>{const r=await h.ask('Achète du BTC');assert.equal(r.status,'NEEDS_CLARIFICATION');assert(r.missing_parameters.includes('amount'));assert.equal(r.preparation,undefined);assert.equal(h.calls.length,0);},'Achète du BTC');
scenario('ambiguous','Acheter ou vendre : demander une clarification sans exécuter',async h=>{const r=await h.ask('Achète ou vends du BTC');assert.equal(r.status,'AMBIGUOUS');assert.equal(h.calls.length,0);},'Achète ou vends du BTC');
scenario('negative_amount','Montant négatif : invalider la demande sans réutiliser un ancien montant',async h=>{await h.ask();const r=await h.ask('-5 USDT');assert.equal(r.status,'INVALID_PARAMETERS');assert.equal(h.calls.length,0);},'-5 USDT');
scenario('insufficient_quote','Fonds insuffisants : bloquer et expliquer le manque de solde',async h=>{h.data.sources.portfolio.availableQuote=4;const r=await h.ask();blocked(h,r,'AVAILABLE_BALANCE');assert.match(r.message,/fonds|solde/i);await assert.rejects(h.confirm(),/BLOCKED/);});
scenario('fees_reserve','Montant disponible égal à l’achat, sans réserve pour les frais : bloquer',async h=>{h.data.sources.portfolio.availableQuote=5;blocked(h,await h.ask(),'AVAILABLE_BALANCE');});
scenario('unknown_balance','Solde null : ne pas inventer un solde disponible',async h=>{h.data.sources.portfolio.availableQuote=null;const r=await h.ask();blocked(h,r,'AVAILABLE_BALANCE');assert.equal(r.preparation.available_balance,null);});
scenario('missing_fees','Frais null : rendre la préparation non confirmable',async h=>{h.data.sources.book.feeRate=null;blocked(h,await h.ask(),'execution.fee_rate');});
scenario('insufficient_base','Vente sans assez de crypto : bloquer sans envoyer de vente',async h=>{h.data.sources.portfolio.balances=[{asset:'BTC',available:.001}];blocked(h,await h.ask(SELL),'AVAILABLE_BASE');},SELL);
scenario('minimum_size','Montant inférieur au minimum d’instrument : bloquer',async h=>{h.data.sources.book.exchangeConstraints.minQuantity=1;blocked(h,await h.ask(),'EXCHANGE_CONSTRAINTS');});
scenario('exposure_limit','Limite de taille/exposition Risk dépassée : refuser',async h=>{h.data.sources.portfolio.equity=20;blocked(h,await h.ask(),'POSITION_SIZE_LIMIT');});
scenario('wide_spread','Spread excessif : refus Risk',async h=>{h.data.sources.book.orderBook.bids[0].price=90;blocked(h,await h.ask(),'SPREAD_LIMIT');});
scenario('shallow_book','Carnet sans profondeur suffisante : aucune exécution partielle implicite',async h=>{h.data.sources.book.orderBook.asks[0].size=.000001;blocked(h,await h.ask());});
scenario('stale_data','Carnet périmé : demander des données vérifiables',async h=>{h.data.sources.book.observedAt=Date.now()-60000;blocked(h,await h.ask(),'STALE');});
scenario('review','Risk demande une révision : la confirmation utilisateur ne vaut pas autorisation',async h=>{h.riskMutation=s=>({...s,decision:'REVIEW'});const r=await h.ask();blocked(h,r);assert.equal(r.preparation.risk_decision,'REVIEW');});
scenario('risk_down','Risk indisponible : aucun accord de remplacement',async h=>{h.beforeRisk=()=>{throw Error('RISK_SOURCE_UNAVAILABLE');};blocked(h,await h.ask());});
scenario('null_history','Premier ordre sans historique : null conservés et préparation possible',async h=>{const r=await h.ask();assert.equal(r.preparation.confirmable,true);assert.equal(h.calls.length,0);});
scenario('unsupported_limit','Ordre Limit hors périmètre : refus explicite sans changement silencieux en Market',async h=>{const r=await h.ask('Achète 5 USDT de BTC-USDT Spot Limit au prix de 90 Live sur OKX compte okx-main');blocked(h,r);assert.match(r.message,/Market|MARKET/i);},'Achète 5 USDT de BTC-USDT Spot Limit au prix de 90 Live');
scenario('demo_account','Compte Demo sélectionné pour une demande Live : bloquer',async h=>{h.accounts[0].demoMode=true;blocked(h,await h.ask());});
scenario('read_only','Compte en lecture seule : aucune demande d’ordre',async h=>{h.accounts[0].actions=['read'];blocked(h,await h.ask());});
scenario('expired_confirmation','Préparation expirée : confirmation refusée',async h=>{const r=await h.ask(),row=h.db().prepare('SELECT data FROM manual_orders WHERE id=?').get(r.preparation.id),d=JSON.parse(row.data);d.preparation.expires_at=Date.now()-1;h.db().prepare('UPDATE manual_orders SET data=? WHERE id=?').run(JSON.stringify(d),r.preparation.id);await assert.rejects(h.confirm(),/EXPIRED/);assert.equal(h.calls.length,0);});
scenario('tampered_confirmation','Digest modifié : refus et aucune mutation',async h=>{await h.ask();await assert.rejects(h.confirm(undefined,{digest:'x'.repeat(64)}),/NOT_FOUND/);assert.equal(h.calls.length,0);});
scenario('cancelled','Préparation annulée : répondre Annulée, sans prétendre à un résultat inconnu',async h=>{await h.ask();await h.cancel();const r=await h.confirm();assert.equal(r.status,'CANCELLED');assert.equal(h.calls.length,0);});
scenario('account_changed','Compte modifié après préparation : nouvelle préparation requise',async h=>{await h.ask();h.accounts[0].revision++;await assert.rejects(h.confirm(),/ACCOUNT_CHANGED/);assert.equal(h.calls.length,0);});
scenario('session_revoked','Session révoquée : refus de confirmer',async h=>{await h.ask();h.revoke(h.tokens.alice);await assert.rejects(h.confirm(),/OWNER_REQUIRED/);assert.equal(h.calls.length,0);});
scenario('funds_changed','Solde diminué entre préparation et confirmation : nouveau Risk refuse',async h=>{await h.ask();h.data.sources.portfolio.availableQuote=1;const r=await h.confirm();assert.equal(r.status,'BLOCKED');assert.equal(h.calls.length,0);});
scenario('price_changed','Prix devenu trop différent : nouvelle confirmation nécessaire',async h=>{await h.ask();h.data.sources.book.orderBook.bids[0].price=109.99;h.data.sources.book.orderBook.asks[0].price=110.01;const r=await h.confirm();assert.equal(r.status,'BLOCKED');assert.equal(r.reason,'ORDER_CHANGED_RECONFIRM_REQUIRED');assert.equal(h.calls.length,0);});
scenario('credentials_missing','Identifiants indisponibles : blocage avant envoi au broker',async h=>{await h.ask();h.noCredentials=true;const r=await h.confirm();assert.equal(r.status,'BLOCKED');assert.equal(h.calls.length,0);});
scenario('trading_stopped','Trading arrêté : blocage certain avant envoi, pas un ordre inconnu',async h=>{await h.ask();h.running=false;const r=await h.confirm();assert.equal(r.status,'BLOCKED');assert.equal(h.calls.length,0);});
scenario('firewall_off','Firewall désactivé : ordre refusé',async h=>{await h.ask();h.firewallOff=true;const r=await h.confirm();assert.equal(r.status,'BLOCKED');assert.equal(h.calls.length,0);});
scenario('approval_expired','Autorisation Risk expirée avant Firewall : refus sans ordre',async h=>{await h.ask();h.afterApproval=(_,a)=>{if(a.risk_approval_id)h.gate.approvals[a.risk_approval_id].expiresAt=Date.now()-1;};const r=await h.confirm();assert.equal(r.status,'BLOCKED');assert.equal(h.calls.length,0);});
scenario('binding_tampered','Montant altéré entre Risk et Trading : liaison refusée',async h=>{await h.ask();h.beforeTrading=(_,q)=>{q.arguments.quote_quantity='500';};const r=await h.confirm();assert.equal(r.status,'BLOCKED');assert.equal(h.calls.length,0);});
scenario('broker_reject','Refus explicite OKX après vérification locale : REJECTED, sans retry',async h=>{await h.ask();h.brokerMode='rejected';const r=await h.confirm();assert.equal(r.status,'REJECTED');assert.deepEqual(await h.confirm(),r);assert.equal(h.calls.length,1);});
for(const mode of ['timeout','http503','ambiguous50004','empty','noOrderId'])scenario('broker_'+mode,'Résultat broker ambigu ('+mode+') : bloquer les retries et conserver l’état inconnu',async h=>{await h.ask();h.brokerMode=mode;const r=await h.confirm();assert.equal(r.status,'UNKNOWN_RECONCILIATION_REQUIRED');assert.deepEqual(await h.confirm(),r);assert.equal(h.calls.length,1);const next=await h.ask();assert.equal(next.preparation.confirmable,false);assert.equal(h.calls.length,1);});
scenario('concurrent_confirm','Deux confirmations concurrentes : un seul ordre',async h=>{await h.ask();const r=await Promise.all([h.confirm(),h.confirm()]);assert(r.some(x=>x.status==='ACKNOWLEDGED'));assert.equal(h.calls.length,1);});
scenario('restart_after_ack','Redémarrage après ACK : résultat conservé, aucun renvoi',async h=>{await h.ask();const r=await h.confirm();h.reopen();assert.deepEqual(await h.confirm(),r);assert.equal(h.calls.length,1);});
scenario('restart_uncertain','Redémarrage après réponse perdue : compte bloqué jusqu’à réconciliation',async h=>{await h.ask();h.brokerMode='timeout';const r=await h.confirm();h.reopen();assert.deepEqual(await h.confirm(),r);assert.equal((await h.ask()).preparation.confirmable,false);assert.equal(h.calls.length,1);});
scenario('other_owner','Un autre utilisateur ne confirme ni ne consulte cet ordre',async h=>{const r=await h.ask();await assert.rejects(h.confirmAs(h.tokens.bob,r),/NOT_FOUND/);assert.equal(h.history(h.tokens.bob).length,0);assert.equal(h.calls.length,0);});
after(()=>{const file=process.env.IATB_ORDER_SCENARIO_REPORT;if(file){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({schema:'iatb.order-scenarios/1.0',version:require('../Shared/build_info').version,broker:'simulated',live_orders:0,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status!=='PASS').length,scenarios:results},null,2)+'\n');}});

for(const [id,response,expected]of [
 ['ack',{statusCode:200,body:{code:'0',data:[{sCode:'0',ordId:'ack'}]}},'ACKNOWLEDGED'],
 ['rejected',{statusCode:200,body:{code:'1',data:[{sCode:'51008',ordId:''}]}},'REJECTED'],
 ['timeout_code',{statusCode:200,body:{code:'50004',data:[]}},'UNCERTAIN'],
 ['http503',{statusCode:503,body:{code:'50001',data:[]}},'UNCERTAIN'],
 ['empty_ack',{statusCode:200,body:{code:'0',data:[]}},'UNCERTAIN']
])test('Journal durable Trading : '+id+' conserve '+expected,async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-outcome-ledger-')),Runtime=require('../../services/trading-engine/trading_runtime_state_v2').RuntimeState,r=new Runtime({file:path.join(dir,'state.json')});
 t.after(()=>{r.close();fs.rmSync(dir,{recursive:true,force:true});});r.transition('RUNNING','SIMULATION',{recovery_required:false});await r.submit({id,generation:r.snapshot().generation},()=>Promise.resolve(response));assert.equal(r.db.prepare('SELECT phase FROM trading_operations WHERE id=?').get(id).phase,expected);
});
