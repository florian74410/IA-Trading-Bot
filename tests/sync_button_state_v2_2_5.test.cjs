const test=require('node:test'),assert=require('node:assert/strict');
const sync=require('../App/Frontend/JS/sync_button_state_v2_2_5.js');
test('four standard labels',()=>{assert.deepEqual(sync.LABELS,{idle:'Actualiser',loading:'Actualisation…',success:'À jour',error:'Erreur'});});
test('single flight and success',async()=>{let count=0;const s=sync.create(async()=>{count++;return {ok:true};});const a=s.trigger(),b=s.trigger();assert.equal(a,b);await a;assert.equal(count,1);assert.equal(s.getLabel(),'À jour');});
test('error without erasing previous contents',async()=>{const s=sync.create(async()=>{throw Error('offline');});await assert.rejects(s.trigger());assert.equal(s.getLabel(),'Erreur');s.reset();assert.equal(s.getLabel(),'Actualiser');});
