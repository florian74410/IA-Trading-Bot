'use strict';
const Schema=require('../../../Core/FunctionRegistry/Control/schema');
function get(value,selector){for(const key of selector.split('.')){if(!/^[a-zA-Z0-9_-]+$/.test(key)||['constructor','prototype','__proto__'].includes(key))throw Error('SIMULATOR_REFERENCE_INVALID');value=value?.[key];}return value;}
function resolve(value,inputs,results){if(Array.isArray(value))return value.map(v=>resolve(v,inputs,results));if(value&&typeof value==='object'){if(Object.keys(value).length===1&&value.$input)return get(inputs,value.$input);if(Object.keys(value).length===1&&value.$ref)return get(results,value.$ref);return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolve(v,inputs,results)]));}return value;}
class SupervisorSimulator{
 constructor(gateway){this.gateway=gateway;}
 async run(scenario,{inputs={}}={}){
  if(scenario?.schema!=='cp1.simulator/1.0'||!Array.isArray(scenario.steps)||scenario.steps.length>100)throw Error('SIMULATOR_SCENARIO_INVALID');
  const started=performance.now(),engines=await this.gateway.list_available_engines(),commands=await this.gateway.list_available_commands(),discovery_ms=performance.now()-started,results={},steps=[];
  for(const step of scenario.steps){const t=performance.now(),row={id:step.id,engine:step.engine,command:step.command},contract=commands.find(c=>c.engine===step.engine&&c.id===step.command);try{
   if(step.permission&&contract?.decision!==step.permission)throw Error('SIMULATOR_PERMISSION_MISMATCH');
   const args=resolve(step.arguments||{},inputs,results);const validAt=performance.now();await this.gateway.validate_command(step.engine,step.command,args);row.permission_validation_ms=performance.now()-validAt;
   const response=await this.gateway.execute_authorized_command(step.engine,step.command,args,resolve(step.context||{},inputs,results));if(!contract)throw Error('SIMULATOR_CONTRACT_MISSING');const error=Schema.validate(response.data,contract.contract.output);if(error)throw Error('SIMULATOR_OUTPUT_SCHEMA:'+error);
   for(const assertion of step.assertions||[]){const value=get(response,assertion.path);if(Object.hasOwn(assertion,'equals')&&JSON.stringify(value)!==JSON.stringify(assertion.equals)||assertion.oneOf&&!assertion.oneOf.includes(value))throw Error('SIMULATOR_ASSERTION_FAILED:'+assertion.path);}
   if(step.expected_error)throw Error('SIMULATOR_EXPECTED_REFUSAL');results[step.id]=response;row.request_id=response.request_id;row.response_schema=response.schema;row.routing=response.control_timing||null;row.response_hash=response.data_hash;row.audit_events=(await this.gateway.get_command_execution_audit(response.request_id)).events.length;const execution=await this.gateway.get_command_execution_result(response.request_id);if(execution.phase!=='COMPLETED')throw Error('SIMULATOR_EXECUTION_NOT_COMPLETE');row.status='PASS';
  }catch(e){row.error=String(e.message).slice(0,240);row.status=step.expected_error&&row.error.includes(step.expected_error)?'EXPECTED_REFUSAL':'FAIL';}row.latency_ms=performance.now()-t;steps.push(row);if(step.wait_after_ms!==undefined){if(!Number.isInteger(step.wait_after_ms)||step.wait_after_ms<0||step.wait_after_ms>2000)throw Error('SIMULATOR_DELAY_INVALID');await new Promise(r=>setTimeout(r,step.wait_after_ms));}}
  const timings=steps.map(s=>s.latency_ms).sort((a,b)=>a-b),percentile=p=>timings.length?timings[Math.min(timings.length-1,Math.ceil(timings.length*p)-1)]:null;
  return {schema:'cp1.simulator-report/1.0',scenario:scenario.id,ok:steps.every(s=>s.status!=='FAIL'),discovery_ms,engines:engines.map(e=>({id:e.id,online:e.online})),commands_discovered:commands.length,permissions:{allow:commands.filter(c=>c.decision==='ALLOW').length,deny:commands.filter(c=>c.decision!=='ALLOW').length},latency_ms:{p50:percentile(.5),p95:percentile(.95),p99:percentile(.99)},steps};
 }
}
module.exports={SupervisorSimulator,resolve};
