'use strict';
// Only the Core process opens owner credentials. Engines receive model output,
// never an API key. The canonical provider reconstructs the exact request body.
const crypto=require('node:crypto'),CP=require('../../Communication/communication_protocol_v1'),OpenAI=require('../../../Supervisor/LLM/providers/openai_provider');
const {redactSecrets}=require('../../Shared/cognitive_text_safety');
function transport({sessions,request,recordUsage=()=>{}}){
 return async function(gateway,payload){
  const current=sessions.verifyHashedSession(gateway.sessionHash);if(!current||current.clientId!==gateway.clientId||!['ADMIN','USER'].includes(current.role))throw Error('OWNER_SESSION_REVOKED');
  const key=sessions.secretForSessionHash(gateway.sessionHash,'OPENAI_API_KEY');if(!key)throw Error('OPENAI_API_KEY_MISSING');
  const method=gateway.operation==='supervisor.structured'?'structured':gateway.operation==='supervisor.reason'?'reason':gateway.operation==='supervisor.cognitive.reason'?'cognitive':gateway.operation==='supervisor.chatbot.message'?'hybrid':null;if(!method)throw Error('OWNER_AI_OPERATION_DENIED');
  if(method==='cognitive'){
   const allow=(process.env.IATB_OPENAI_ALLOWED_MODELS||'gpt-5.6,gpt-5-mini,gpt-4.1-mini').split(',').map(x=>x.trim());
   if(!payload||typeof payload!=='object'||Object.keys(payload).sort().join(',')!=='input,max_output_tokens,model,store'||payload.store!==false||!allow.includes(payload.model)||gateway.spec.model&&payload.model!==gateway.spec.model||!Number.isInteger(payload.max_output_tokens)||payload.max_output_tokens<64||payload.max_output_tokens>1800||!Array.isArray(payload.input)||payload.input.length!==2)throw Error('OWNER_COGNITIVE_PAYLOAD_DENIED');
   const [system,user]=payload.input;
   if(system?.role!=='system'||user?.role!=='user'||typeof system.content!=='string'||!system.content.startsWith('BOOTLOADER:')||typeof user.content!=='string'||Buffer.byteLength(JSON.stringify(payload))>20000)throw Error('OWNER_COGNITIVE_PAYLOAD_DENIED');
   let context;try{context=JSON.parse(user.content);}catch(e){throw Error('OWNER_COGNITIVE_CONTEXT_INVALID');}
   if(!context||context.user_prompt!==redactSecrets(gateway.spec.prompt)||!Array.isArray(context.recent_messages)&&context.tool_results===undefined||context.tool_results!==undefined&&context.finish!==true)throw Error('OWNER_COGNITIVE_PROMPT_MISMATCH');
   const active=sessions.verifyHashedSession(gateway.sessionHash);if(!active||active.clientId!==current.clientId||active.role!==current.role)throw Error('OWNER_SESSION_REVOKED');
   const result=await request({url:'https://api.openai.com/v1/responses',headers:{Authorization:'Bearer '+key},body:payload});
   recordUsage(current,result?.usage||{},payload.model);return result;
  }
  let actualSpec=gateway.spec;if(method==='hybrid'){
   if(!payload||typeof payload.input!=='string'||Buffer.byteLength(JSON.stringify(payload))>32000)throw Error('OWNER_HYBRID_PAYLOAD_DENIED');let context;try{context=JSON.parse(payload.input);}catch(e){throw Error('OWNER_HYBRID_CONTEXT_INVALID');}const {scrub}=require('../../../Supervisor/ChatBot');if(!context||Object.keys(context).sort().join(',')!=='pending,recent_messages,user_prompt'||context.user_prompt!==gateway.spec.prompt||!Array.isArray(context.recent_messages)||context.recent_messages.length>6||context.recent_messages.some(m=>Object.keys(m).sort().join(',')!=='content,role'||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>3000||scrub(m.content)!==m.content))throw Error('OWNER_HYBRID_CONTEXT_INVALID');if(context.pending!==null){const {Catalog}=require('../../../Supervisor/ChatBot/catalog'),Contracts=require('../../../Supervisor/ChatBot/Contracts');Contracts.validate(context.pending,new Catalog());if(context.pending.parameters.account)throw Error('OWNER_HYBRID_PRIVATE_CONTEXT_DENIED');}actualSpec={...gateway.spec,prompt:JSON.stringify(context)};
  }
  let response;
  const provider=new OpenAI({model:gateway.configuration?.model||'gpt-5.6',transport:async expected=>{
   if(CP.hashData(expected)!==CP.hashData(payload)||expected.store!==false||!/^gpt-[A-Za-z0-9._-]{2,80}$/.test(expected.model))throw Error('OWNER_AI_PAYLOAD_MISMATCH');
   const active=sessions.verifyHashedSession(gateway.sessionHash);if(!active||active.role!==current.role)throw Error('OWNER_SESSION_REVOKED');
   response=await request({url:'https://api.openai.com/v1/responses',headers:{Authorization:'Bearer '+key},body:expected});
   recordUsage(current,response?.usage||{},expected.model);return response;
  }});
  await provider[method==='hybrid'?'structured':method](actualSpec);return response;
 };
}
module.exports={transport};
