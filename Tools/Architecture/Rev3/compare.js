"use strict";
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),app=path.join(root,'App'),C=require(path.join(app,'Core/FunctionRegistry/Control/catalog'));
const baseline=require(path.join(root,'Documentation/Architecture/Rev3/REV2_BASELINE.json'));
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const checks=[];
for(const [id,b]of Object.entries(baseline.engines)){
 const current=C.manifest(app,id),digest=C.implementationDigest(app,id),old=new Map(b.functions.map(f=>[f.id,f]));
 assert.equal(current.functions.length,b.functions.length,id+' command count');
 const commands=current.functions.map(f=>{
  const before=old.get(f.id);assert(before,id+' unknown command '+f.id);
  // Compare serialized CP1 contracts: undefined keys are absent on the wire
  // and were naturally omitted from the frozen JSON baseline.
  const strip=v=>JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(v).filter(([k])=>!['source','handler_sha256'].includes(k)))));
  assert.deepEqual(strip(f),strip(before),id+' contract/permissions/qualification drift: '+f.id);
  if(f.verified_handler){assert.equal(f.handler_sha256,digest);assert(fs.existsSync(path.join(app,f.source)),f.source+' missing');}
  return {id:f.id,input_sha256:hash(f.input),output_sha256:hash(f.output),source_before:before.source,source_after:f.source,handler_sha256:f.handler_sha256,verified:f.verified_handler,agent_qualified:f.agent_qualified,hard_deny:f.hard_deny,default_privilege:f.default_privilege,authorization:f.authorization,result:'PASS'};
 });
 checks.push({engine:id,commands_before:b.functions.length,commands_after:commands.length,qualified_before:b.functions.filter(f=>f.verified_handler).length,qualified_after:commands.filter(f=>f.verified).length,implementation_before:b.implementation_sha256,implementation_after:digest,changed:b.implementation_sha256!==digest,commands,result:'PASS'});
}
const result={baseline_commit:baseline.commit,status:'PASS',engines:checks};
if(process.argv[2]){fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({status:'PASS',engines:checks.map(({commands,...x})=>x)}));
