'use strict';
// Supervisor Engine 3.0-dev.1: durable working context + authorized CP1 observations.
// No secondary Supervisor service, autonomous agent spawn, shell or financial mutation.
const crypto=require('node:crypto');
const {tenantOf}=require('../CognitiveRuntime');
const {WorkingMemory}=require('./working-memory');
const READ_COMMANDS=new Set([
  'marketdata.health','marketdata.providers','trading.health','trading.capabilities',
  'risk.status','risk.constraints.get','portfolio.health','strategy.health',
  'fundamental.health','fundamental.summary','liquidity.health','liquidity.capabilities',
  'firewall.status','supervisor.status'
]);
function scope(auth,room){
  const tenantId=tenantOf(auth);
  if(!/^[a-f0-9]{64}$/.test(auth.sessionHash||''))throw Error('SUPERVISOR_SESSION_REQUIRED');
  if(!/^[-A-Za-z0-9_]{1,64}$/.test(room||''))throw Error('SUPERVISOR_ROOM_INVALID');
  return {tenantId,sessionHash:auth.sessionHash,room};
}
function safeError(e){
  const message=String(e?.message||'');
  return /^(PERMISSION_DENIED|COMMAND_UNAVAILABLE|ENGINE_UNAVAILABLE|SESSION_SCOPE_DENIED|AGENT_SESSION_REVOKED|COMMAND_UNKNOWN|CP_ROUTER_TIMEOUT|CONTROL_ARGUMENT_INVALID)$/.test(message)?message:'CP1_OBSERVATION_UNAVAILABLE';
}
class SupervisorEngine {
  constructor({root,memory,cognitive}={}){
    this.memory=memory||new WorkingMemory({root});
    this.cognitive=cognitive||null;
  }
  context(input={},auth){
    const room=input.room||'default',s=scope(auth,room),working=this.memory.current(s);
    const cognitive=this.cognitive?.();
    const history=cognitive?cognitive.short.history({tenantId:s.tenantId,sessionId:room,limit:8}):[];
    const self=cognitive?cognitive.long.readSelf('supervisor'):'';
    return {schema:'supervisor.engine.context/1.0',version:'3.0.0-dev.1',execution:'NONE',working,identity_summary:self,conversation:history,cp1:'GATEWAY_REQUIRED_FOR_COMMANDS'};
  }
  objective(input={},auth){
    const room=input.room||'default',s=scope(auth,room);
    this.memory.setObjective(s,input.objective);
    return this.context({room},auth);
  }
  async discover(input={},auth,gateway=null){
    const context=this.context(input,auth);
    if(!gateway)return {...context,cp1:'UNAVAILABLE',engines:[],commands:[]};
    try{
      const [engines,commands]=await Promise.all([gateway.list_available_engines(),gateway.list_available_commands()]);
      return {...context,cp1:'CONNECTED',engines:engines.map(x=>({id:x.id,online:x.online})),
        commands:commands.filter(x=>READ_COMMANDS.has(x.id)).map(x=>({
          engine:x.engine,id:x.id,online:x.online,decision:x.decision,
          qualified:x.contract?.agent_qualified===true&&x.contract?.verified_handler===true&&!x.contract?.hard_deny
        }))};
    }catch(e){
      return {...context,cp1:'UNAVAILABLE',error:safeError(e),engines:[],commands:[]};
    }
  }
  async observe(input={},auth,gateway=null){
    const room=input.room||'default',s=scope(auth,room);
    const engine=input.engine,command=input.command;
    if(typeof engine!=='string'||typeof command!=='string'||!READ_COMMANDS.has(command)||!command.startsWith(engine+'.'))throw Error('SUPERVISOR_COMMAND_NOT_ALLOWED');
    if(!gateway){
      this.memory.record(s,{engine,command,status:'UNAVAILABLE',value:'AGENT_GATEWAY_UNAVAILABLE'});
      return {status:'UNAVAILABLE',error:'AGENT_GATEWAY_UNAVAILABLE',context:this.context({room},auth)};
    }
    let contract;
    try{
      contract=await gateway.describe_command(engine,command);
      if(contract.decision!=='ALLOW'||contract.online!==true||contract.contract?.verified_handler!==true||contract.contract?.agent_qualified!==true||contract.contract?.hard_deny||contract.contract?.side_effects===true)throw Error('PERMISSION_DENIED');
      const response=await gateway.execute_authorized_command(engine,command,{},{request_id:crypto.randomUUID()});
      const result=response?.data??response;
      this.memory.record(s,{engine,command,status:'OK',value:result,contractHash:contract.contract_hash});
      return {status:'OK',engine,command,result,context:this.context({room},auth)};
    }catch(e){
      const error=safeError(e),status=error==='PERMISSION_DENIED'?'DENIED':'UNAVAILABLE';
      this.memory.record(s,{engine,command,status,value:error,contractHash:contract?.contract_hash});
      return {status,error,engine,command,context:this.context({room},auth)};
    }
  }
  close(){this.memory.close();}
}
module.exports={SupervisorEngine,READ_COMMANDS};
