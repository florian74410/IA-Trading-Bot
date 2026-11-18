'use strict';
const CP=require("../../../Core/Communication/communication_protocol_v1"),Client=require("../../../Core/Communication/cp1_client"),Control=require("../../../Core/FunctionRegistry/Control/client"),Schema=require("../../../Core/FunctionRegistry/Control/schema");
class AgentEngineGateway{
 constructor({root,token,env=process.env}){if(typeof token!=='string'||!token)throw Error('AGENT_SESSION_REQUIRED');this.token=token;this.env=env;this.client=new Client({root,serviceEnv:env,routerPort:+env.ROUTER_PORT||8021,timeout:12000,maxBytes:2*1024*1024});}
 call(operation,data={}){return Control.call(operation,{token:this.token,...data},this.env);}
 async list_available_engines(){return (await this.call('catalog')).engines;}
 async list_available_commands(){return (await this.call('catalog')).commands;}
 async describe_command(engine,command){const c=(await this.list_available_commands()).find(c=>c.engine===engine&&c.id===command);if(!c)throw Error('COMMAND_UNKNOWN');return c;}
 validate_command(engine,command,args={}){return this.call('validate',{message:CP.makeRequest(engine,command,args,'analysis')});}
 async execute_authorized_command(engine,command,args={},context={}){if(Object.keys(context).some(k=>k!=='request_id'))throw Error('AGENT_CONTEXT_INVALID');const message=CP.makeRequest(engine,command,args,'analysis');if(context.request_id)message.request_id=context.request_id;const contract=await this.describe_command(engine,command);const error=Schema.validate(args,contract.contract.input);if(error)throw Error('CP_ARGUMENT_SCHEMA:'+error);const permit=await this.call('prepare',{message});if(permit.existing){if(permit.phase==='COMPLETED')return {request_id:permit.request_id,data:permit.result,replayed:true};throw Error('EXECUTION_ALREADY_RESERVED:'+permit.phase);}return new Promise((resolve,reject)=>this.client._post('/communication/v1/agent/request',{message,proof:permit.proof},{},(e,r)=>e?reject(e):resolve(r)));}
 request_permission(engine,command,scope,reason,duration_seconds){return this.call('permission.request',{engine,command,scope,reason,duration_seconds});}
 get_command_execution_result(request_id){return this.call('result',{request_id});}
 get_command_execution_audit(request_id){return this.call('audit',{request_id});}
 async openai_tools(){return (await this.list_available_commands()).filter(c=>c.decision==='ALLOW'&&c.online&&c.contract.verified_handler&&!c.contract.hard_deny).map(c=>({type:'function',name:toolName(c.engine,c.id),description:c.contract.description,parameters:c.contract.input,strict:false}));}
 async execute_tool(name,args){const rows=await this.list_available_commands(),matches=rows.filter(c=>toolName(c.engine,c.id)===name);if(matches.length!==1)throw Error('TOOL_UNKNOWN');return this.execute_authorized_command(matches[0].engine,matches[0].id,args);}
}
function toolName(engine,id){return 'cp1_'+require('node:crypto').createHash('sha256').update(engine+':'+id).digest('hex').slice(0,40);}
module.exports={AgentEngineGateway,toolName};
