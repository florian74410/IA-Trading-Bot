'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const C=require('../Control/catalog'),BUILD=require('../../Shared/build_info'),root=path.resolve(__dirname,'../../..');
test('application version advances without changing existing command contracts or permissions',()=>{
 const before=Object.fromEntries(Object.keys(C.folders).map(id=>[id,C.manifest(root,id)])),saved=BUILD.version;
 try{BUILD.version='99.0.0-test';for(const [id,old] of Object.entries(before)){const next=C.manifest(root,id);assert.equal(next.engine_version,'99.0.0-test');assert.deepEqual(next.functions,old.functions);assert.equal(next.revision_hash,old.revision_hash);}}finally{BUILD.version=saved;}
});
