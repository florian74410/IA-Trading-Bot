'use strict';
var orchestrator=null;
function set(x){orchestrator=x||null;}
function observe(req){
 if(!orchestrator||typeof orchestrator.observeTransport!=='function')return null;
 try{return orchestrator.observeTransport(req||{});}catch(e){return{ok:false,error:e.message};}
}
function feedback(provider,data){
 if(!orchestrator||typeof orchestrator.feedbackTransport!=='function')return null;
 try{return orchestrator.feedbackTransport(provider,data||{});}catch(e){return{ok:false,error:e.message};}
}
function status(){return{attached:!!orchestrator,mode:orchestrator&&orchestrator.mode||null,transportObserve:!!(orchestrator&&orchestrator.observeTransport),transportFeedback:!!(orchestrator&&orchestrator.feedbackTransport)};}
module.exports={set:set,observe:observe,feedback:feedback,status:status};
