'use strict';
// Conservative BYTE-based token estimate. Not an official tokenizer or an exact count.
// Can overestimate non-ASCII; never guarantees a provider-specific token limit.
const estimate=s=>Math.ceil(Buffer.byteLength(String(s||''),'utf8')/3);
function prepare({system,self,history,ram,prompt,observations,maxInputTokens=4400}){
 const data={self_memory:self,recent_messages:history,ram,user_prompt:prompt};
 if(observations!==undefined){data.tool_results=observations;data.finish=true;}
 while(data.recent_messages.length&&estimate(system)+estimate(JSON.stringify(data))>maxInputTokens)
  data.recent_messages.shift();
 if(observations!==undefined&&estimate(system)+estimate(JSON.stringify(data))>maxInputTokens)
  data.tool_results=JSON.stringify(observations).slice(0,1200);
 if(estimate(system)+estimate(JSON.stringify(data))>maxInputTokens)throw Error('COGNITIVE_CONTEXT_BUDGET_EXCEEDED');
 return {prompt:JSON.stringify(data),estimatedInputTokens:estimate(system)+estimate(JSON.stringify(data)),historyUsed:data.recent_messages.length};
}
module.exports={estimate,prepare};
