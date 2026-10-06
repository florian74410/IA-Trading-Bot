'use strict';
var orchestrator=null;
function set(x){orchestrator=x||null;}
function observe(req){if(!orchestrator||typeof orchestrator.observeTransport!=='function')return null;try{return orchestrator.observeTransport(req||{});}catch(e){return{ok:false,error:e.message};}}
function status(){return{attached:!!orchestrator,mode:orchestrator&&orchestrator.mode||null};}
module.exports={set:set,observe:observe,status:status};
