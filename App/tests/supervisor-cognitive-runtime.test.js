'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {CognitiveRuntime,tenantOf}=require('../Supervisor/CognitiveRuntime');
const auth=(clientId='CLalice',role='USER')=>({source:'AUTH21_OWNER',principal:{clientId,role}});
const tenant=()=>tenantOf(auth());
const {PersonalMemory}=require('../Supervisor/Memory/personal-memory');
const ProtocolRegistry=require('../Core/Communication/protocol_registry_v2');
const appRoot=path.resolve(__dirname,'..');
function make(root,replies,calls){
 const llm={reason:async x=>{calls.push(x);return {text:JSON.stringify(replies.shift()||{message:'ok'}),provider:'MOCK',model:'mock-debug',latencyMs:1};}};
 const cp={request:async (target,action)=>{assert.equal(target,'router');assert.equal(action,'router.registry.list');return {ok:true,engines:[]};}};
 const settings={llm:()=>({provider:'MOCK',openai:{model:'gpt-5.6'}})};
 return new CognitiveRuntime({root,llm,cp,settings,protocolRegistry:new ProtocolRegistry(appRoot),functionRegistryDb:path.join(root,'absent.sqlite')});
}
test('persistent cognitive memory, self first, scoped tools, reviewed-only proposals, model allowlist',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-cognitive-')),calls=[];
 try{
  let runtime=make(root,[{message:'Looking up memory',tool_requests:[{tool:'memory.search',query:'incident'}],memory_proposals:[]},{message:'Diagnostic found',memory_proposals:[{category:'diagnostic',content:'Possible market-data issue'}],tool_requests:[]}],calls);
  runtime.long.setSelf('supervisor','Objective: monitor engine health');
  runtime.long.saveVerified(tenant(),'incident','Verified incident detail');
  const x=await runtime.reason({sessionId:'alpha',prompt:'Check the incident'},auth());
  assert.equal(x.response.message,'Diagnostic found');assert.equal(x.memory.selfRead,true);
  assert.match(calls[0].prompt,/Objective: monitor engine health/);
  assert.equal(x.observations.length,1);assert.equal(x.observations[0].data[0].category,'incident');
  assert.equal(x.memory.proposals.length,1);assert.equal(x.memory.proposals[0].status,'PENDING');
  assert.equal(runtime.long.search(tenant(),'Possible market-data issue').length,0,'pending proposal must not be trusted long memory');
  assert.equal(runtime.short.history({tenantId:tenant(),sessionId:'alpha'}).length,2);
  assert.deepEqual(runtime.short.history({tenantId:tenant(),sessionId:'beta'}),[]);
  assert.deepEqual(runtime.models().selected,'gpt-5.6');
  await assert.rejects(runtime.reason({prompt:'x',model:'not-allowed-model'},auth()),/MODEL_NOT_ALLOWED/);
  runtime.close();
  runtime=make(root,[{message:'After reboot'}],calls);
  assert.equal(runtime.short.history({tenantId:tenant(),sessionId:'alpha'}).length,2);
  assert.equal(runtime.long.readSelf('supervisor'),'Objective: monitor engine health');
  const second=await runtime.reason({sessionId:'alpha',prompt:'Continue'},auth());
  assert.equal(second.memory.historyUsed,2);runtime.close();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('CP1 registry matches real Supervisor handlers and manifest contracts',()=>{
 const svc=fs.readFileSync(path.join(appRoot,'Supervisor','supervisor_service.js'),'utf8');
 const json=JSON.parse(fs.readFileSync(path.join(appRoot,'Supervisor','FunctionRegistry','Functions.json'),'utf8'));
 const p=new ProtocolRegistry(appRoot);
 for(const action of ['supervisor.cognitive.reason','supervisor.cognitive.status','supervisor.llm.models','supervisor.llm.select']){
  assert.ok(p.command('supervisor',action),'CP1 protocol registry missing '+action);
  assert.ok(json.functions.find(x=>x.id===action&&x.verified_handler===true),'Function Registry missing '+action);
  if(action==='supervisor.cognitive.reason'||action==='supervisor.llm.select'){
   assert.equal(p.command('supervisor',action).transport,'OWNER','Protected action should use owner transport');
   assert.equal(json.functions.find(x=>x.id===action).hard_deny,true,'Generic privilege must be denied');
   assert.ok(!svc.includes("'"+action+"':function"),'Protected action must not have a direct CP1 handler');
  }else assert.ok(svc.includes("'"+action+"'"),'Service action missing '+action);
 }
 assert.ok(!/Exchanges\/Adapters|services\/trading-engine\/adapters/.test(svc),'Supervisor may not import exchange executors');
});
test('tool allowlist blocks model-command injection; no direct trade/tool execution',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-cognitive-security-')),calls=[];
 try{
  const r=make(root,[{message:'Read only',tool_requests:[{tool:'trading.execute',arguments:{symbol:'BTCUSDT'}},{tool:'cp1.registry.list'}]} ,{message:'Finished',tool_requests:[]}],calls);
  const x=await r.reason({prompt:'Can I trade?'},auth());
  assert.equal(x.observations.length,1);
  assert.equal(x.observations[0].tool,'cp1.registry.list');
  assert.equal(x.execution,'NONE');
  r.close();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('existing OpenAI provider forwards chosen model through CP1 AI Gateway Responses API',async()=>{
 const LLMManager=require('../Supervisor/LLM/llm_manager'),root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-cognitive-gateway-'));
 const payloads=[];
 try{
  const cp={request:async (target,action,arguments_)=>{
   assert.equal(target,'ai_gateway');assert.equal(action,'ai_gateway.responses');
   payloads.push(arguments_.payload);
   return {response:{output_text:JSON.stringify({message:'Gateway accepted model',tool_requests:[],memory_proposals:[]})}};
  }};
  const llm=new LLMManager({provider:'OPENAI_API',openai:{model:'gpt-5.6',transport:async body=>(await cp.request('ai_gateway','ai_gateway.responses',{payload:body})).response}});
  const settings={llm:()=>({provider:'OPENAI_API',openai:{model:'gpt-5.6'}})};
  const runtime=new CognitiveRuntime({root,llm,cp,settings,protocolRegistry:new ProtocolRegistry(appRoot)});
  const x=await runtime.reason({sessionId:'gateway1',prompt:'Explain service status',model:'gpt-5-mini'},auth());
  assert.equal(x.response.message,'Gateway accepted model');assert.equal(x.response.provider,'OPENAI_API');
  assert.equal(payloads.length,1);assert.equal(payloads[0].model,'gpt-5-mini');
  assert.equal(payloads[0].store,false);assert.match(payloads[0].input[0].content,/BOOTLOADER/);
  assert.equal(fs.statSync(path.join(root,'.runtime','cognitive','short.sqlite')).mode & 0o077,0);
  runtime.close();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('unverified CP1 identity cannot open cognitive memory, cross-account isolation',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-owner-'));
 try{
  const calls=[],runtime=make(root,[{message:'owner-A'},{message:'owner-B'}],calls);
  await assert.rejects(runtime.reason({sessionId:'shared',prompt:'no proof'}),/COGNITIVE_OWNER_PROOF_REQUIRED/);
  await runtime.reason({sessionId:'shared',prompt:'A'},auth('CLalice'));
  await runtime.reason({sessionId:'shared',prompt:'B'},auth('CLbob'));
  assert.equal(runtime.short.history({tenantId:tenantOf(auth('CLalice')),sessionId:'shared'}).length,2);
  assert.equal(runtime.short.history({tenantId:tenantOf(auth('CLbob')),sessionId:'shared'}).length,2);
  assert.equal(calls.length,2);assert.ok(!calls[1].prompt.includes('owner-A'));
  runtime.close();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('malformed provider JSON retries once; failure stores a controlled turn without secrets',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-cognitive-recovery-'));
 try{
  const calls=[],runtime=make(root,[],calls);
  runtime.llm.reason=async x=>{calls.push(x);return {text:'invalid',provider:'MOCK',model:'mock',latencyMs:1};};
  await assert.rejects(runtime.reason({sessionId:'error',prompt:'API_KEY=very-private-key'},auth()),/COGNITIVE_INVALID_JSON/);
  assert.equal(calls.length,2);
  const rows=runtime.short.history({tenantId:tenant(),sessionId:'error'});
  assert.equal(rows.length,2);assert.ok(rows[0].content.includes('[REDACTED]'));
  assert.ok(!rows.some(x=>x.content.includes('very-private-key')));
  assert.match(rows[1].content,/RETRYABLE_ERROR/);
  runtime.close();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('context budget drops old history, protects current prompt, and backup restores SQLite',async()=>{
 const {prepare}=require('../Supervisor/CognitiveRuntime/context-budget');
 const compact=prepare({system:'BOOTLOADER',self:'self',history:Array.from({length:10},(_,i)=>({role:'user',content:'history-'+i+'X'.repeat(400)})),ram:{},prompt:'current',maxInputTokens:280});
 assert.ok(compact.historyUsed<10);assert.match(compact.prompt,/current/);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-backup-'));
 try{const r=make(root,[],[]);r.short.append({tenantId:tenant(),sessionId:'backup',role:'user',content:'persist'});const files=await r.backup();assert.equal(files.length,2);for(const x of files){assert.equal(fs.statSync(x).mode&0o077,0);assert.ok(fs.statSync(x).size>0);}r.close();}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
