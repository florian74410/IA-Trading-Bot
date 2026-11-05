'use strict';
// The existing Companion Blob is a UI, never an authority.
// Only Core Auth21's verified owner bridge may reach personal Supervisor memory.
const {redactSecrets}=require('../Shared/cognitive_text_safety');
const SESSION_ID='companion-default';
function sanitizeContext(input){
 const x=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 return Object.fromEntries(['path','hash','title','section','active','hover'].map(k=>[k,redactSecrets(String(x[k]||'').slice(0,k==='title'?120:90))]));
}
function mood(message){
 const s=String(message||'').toLowerCase();
 if(/erreur|échec|indisponible|impossible/.test(s))return 9;
 if(/analyse|liquidit|marché|marche|indicateur/.test(s))return 5;
 if(/solution|propose|idée|idee/.test(s))return 7;
 return 12;
}
function validateBridge(bridge,token){
 if(!bridge||typeof bridge.bridge!=='function'||typeof token!=='string'||!token)throw Error('COMPANION_AUTH_REQUIRED');
}
async function talk({bridge,token,input}={}){
 validateBridge(bridge,token);
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.message!=='string'||!input.message.trim()||input.message.length>1400)throw Error('COMPANION_MESSAGE_INVALID');
 const prompt=redactSecrets(input.message.trim());
 const args={prompt,sessionId:SESSION_ID,uiContext:sanitizeContext(input.context)};
 if(input.model!==undefined){
  if(typeof input.model!=='string'||!/^gpt-[a-z0-9._-]{2,80}$/i.test(input.model))throw Error('COMPANION_MODEL_INVALID');
  args.model=input.model;
 }
 const answer=await bridge.bridge(token,{target:'supervisor',action:'supervisor.cognitive.reason',arguments:args});
 if(answer?.schema!=='supervisor.cognitive/1.1'||typeof answer.response?.message!=='string')throw Error('COMPANION_SUPERVISOR_RESPONSE_INVALID');
 const msg=redactSecrets(answer.response.message);
 return {ok:true,source:'supervisor-cognitive',mode:'cognitive',execution:'NONE',message:msg,mood:mood(msg),model:answer.response.model||null,memory:{historyUsed:answer.memory?.historyUsed||0,proposals:(answer.memory?.proposals||[]).length},routerActions:[],command:null};
}
async function history({bridge,token}={}){
 validateBridge(bridge,token);
 const r=await bridge.bridge(token,{target:'supervisor',action:'supervisor.cognitive.history',arguments:{sessionId:SESSION_ID,limit:20}});
 if(r?.schema!=='supervisor.cognitive.history/1.0'||!Array.isArray(r.messages))throw Error('COMPANION_HISTORY_INVALID');
 return {ok:true,sessionId:SESSION_ID,messages:r.messages.filter(m=>['assistant','user'].includes(m.role)).slice(-20).map(m=>({role:m.role,content:redactSecrets(String(m.content||'').slice(0,12000)),createdAt:m.createdAt}))};
}
module.exports={talk,history,sanitizeContext,SESSION_ID};
