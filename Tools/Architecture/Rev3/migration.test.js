"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{rewriteJS,rewriteJSON}=require('./migrate');
const app=path.resolve(__dirname,'../../../App'),file=path.join(app,'Tools/Tests/spec.js'),pairs=[['Risk','Engines/Risk']];
test('path migration distinguishes code prefixes from storage segments',()=>{
 const code="const a=path.join(APP_ROOT,'Risk','Engine','risk_service.js');const b=path.join(SHARED_DATA,'Risk');const c=path.join(root,'Shared Data','Risk');";
 const result=rewriteJS(code,file,file,pairs,[]);
 assert(result.includes('"Engines/Risk"'));assert(result.includes("path.join(SHARED_DATA,'Risk')"));assert(result.includes("path.join(root,'Shared Data','Risk')"));
});
test('path arrays used dynamically are migrated with their owning file',()=>{
 const r=rewriteJS("const specs=['../../Risk/Engine/risk_service.js'];",file,file,pairs,[]);
 assert(r.includes('../../Engines/Risk/Engine/risk_service.js'));
});
test('moving code preserves dot separators used by CP1 commands and data selectors',()=>{
 const old=path.join(app,'Risk/Engine/sample.js'),target=path.join(app,'Engines/Risk/Engine/sample.js');
 const code="const matches=command.startsWith(engine+'.');const parts=selector.split('.');";
 assert.equal(rewriteJS(code,old,target,pairs,[]),code);
});
test('JSON migration preserves descriptions and rewrites only whole resource paths',()=>{
 const value={description:'Read-only context for Risk/LLM.',label:'Risk',script:'Risk/Engine/risk_service.js'};
 const result=JSON.parse(rewriteJSON(JSON.stringify(value),pairs));
 assert.equal(result.description,value.description);assert.equal(result.label,'Risk');assert.equal(result.script,'Engines/Risk/Engine/risk_service.js');
});
