'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const {census}=require('../CI/auth21_writer_source_census');
test('source inventory reports every statically visible storage escape as unfinished',()=>{
 const result=census(path.resolve(__dirname,'../..'));
 assert.ok(result.scanned>10);
 assert.ok(result.uncovered.length>0,'a complete report requires an independent manual review');
 assert.equal(result.coverageComplete,false);
 assert.equal(Object.values(result.priorities).reduce((sum,n)=>sum+n,0),result.uncovered.length);
 assert.ok(result.priorities['potential-write']>0);
 assert.ok(result.uncovered.some(v=>v.file.includes('Core/Server/server.js')));
 console.log('# P22_WRITER_CENSUS '+JSON.stringify({
  scanned:result.scanned,reviewed:result.reviewed,uncovered:result.uncovered.length,
  priorities:result.priorities,
  files:result.uncovered.map(v=>({file:v.file,kinds:v.kinds}))
 }));
});
