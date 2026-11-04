'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {permission}=require('../Core/Clients/UserManagement/owner_policy');
const {transport}=require('../Core/Clients/UserManagement/owner_ai');
const SupervisorSettings=require('../Supervisor/Core/settings');
test('Core policy uses authenticated owner channel for cognitive reasoning and ADMIN configuration',()=>{
 assert.equal(permission('supervisor','supervisor.cognitive.reason'),'self.write');
 assert.equal(permission('supervisor','supervisor.cognitive.status'),'self.read');
 assert.equal(permission('supervisor','supervisor.llm.models'),'self.read');
 assert.equal(permission('supervisor','supervisor.llm.select'),'self.write');
 const service=fs.readFileSync(path.join(__dirname,'../Supervisor/supervisor_service.js'),'utf8');
 assert.ok(service.includes('cognitiveCore:core'),'Owner receiver must use real Core');
 assert.ok(!service.includes("'supervisor.cognitive.reason':function"),'Direct CP1 cognitive reasoning forbidden');
});
test('Core owner AI checks model, signed original prompt, output token cap, store:false, current session',async()=>{
 const current={clientId:'CLalice',role:'USER'},invocations=[];
 const sessions={verifyHashedSession:hash=>hash==='ownedHash'?current:null,secretForSessionHash:()=> 'test-key'};
 const handle=transport({sessions,request:async x=>{invocations.push(x);return {output_text:'{}',usage:{input_tokens:10}};}});
 const gateway={clientId:'CLalice',sessionHash:'ownedHash',operation:'supervisor.cognitive.reason',spec:{prompt:'Find faults',model:'gpt-5-mini'},configuration:{model:'gpt-5-mini'}};
 const payload={model:'gpt-5-mini',max_output_tokens:1800,store:false,input:[{role:'system',content:'BOOTLOADER: safe cognitive runtime'},{role:'user',content:JSON.stringify({self_memory:'',recent_messages:[],ram:{},user_prompt:'Find faults'})}]};
 assert.equal((await handle(gateway,payload)).output_text,'{}');
 assert.equal(invocations.length,1);
 await assert.rejects(handle(gateway,{...payload,model:'gpt-5.6'}),/OWNER_COGNITIVE_PAYLOAD_DENIED/);
 await assert.rejects(handle(gateway,{...payload,store:true}),/OWNER_COGNITIVE_PAYLOAD_DENIED/);
 await assert.rejects(handle(gateway,{...payload,input:[payload.input[0],{role:'user',content:JSON.stringify({recent_messages:[],user_prompt:'Other user'})}]}),/OWNER_COGNITIVE_PROMPT_MISMATCH/);
 await assert.rejects(handle({...gateway,sessionHash:'revoked'},payload),/OWNER_SESSION_REVOKED/);
});
test('ADMIN model choice persists in canonical SQLite settings and USER cannot alter it',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-model-settings-')),prior=process.env.IATB_USER_DB;
 process.env.IATB_USER_DB=path.join(root,'user.sqlite');
 try{
  let settings=new SupervisorSettings(root);
  assert.throws(()=>settings.selectLlm({provider:'OPENAI_API',model:'gpt-5-mini'},{role:'USER',clientId:'CLother'}),/LLM_ADMIN_REQUIRED/);
  assert.throws(()=>settings.selectLlm({provider:'OPENAI_API',model:'unlisted'},{role:'ADMIN',clientId:'CLadmin'}),/LLM_MODEL_NOT_ALLOWED/);
  const selected=settings.selectLlm({provider:'OPENAI_API',model:'gpt-5-mini'},{role:'ADMIN',clientId:'CLadmin'});
  assert.equal(selected.persisted,true);
  settings=new SupervisorSettings(root);
  assert.equal(settings.llm().openai.model,'gpt-5-mini');assert.equal(settings.llm().provider,'OPENAI_API');
 }finally{if(prior===undefined)delete process.env.IATB_USER_DB;else process.env.IATB_USER_DB=prior;fs.rmSync(root,{recursive:true,force:true});}
});
