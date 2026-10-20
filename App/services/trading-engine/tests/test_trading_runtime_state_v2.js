'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {RuntimeState}=require('../trading_runtime_state_v2');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-runtime-v23-'));
try {
  const file=path.join(dir,'user','runtime.json');
  let state=new RuntimeState({file,now:()=>100});
  assert.equal(state.boot().state,'STOPPED');
  assert.equal(state.canExecute(),false);
  assert.equal(new RuntimeState({file}).boot().state,'STOPPED');
  state.transition('EMERGENCY_HALTED','ADMIN_EMERGENCY_STOP',{recovery_required:true,actor:'admin'});
  assert.equal(new RuntimeState({file}).boot().state,'EMERGENCY_HALTED');
  state.transition('RUNNING','TEST_RUNNING',{recovery_required:false});
  assert.equal(state.canExecute(),true);
  state=new RuntimeState({file});
  assert.equal(state.boot().state,'ERROR','unclean restart must not auto-resume live trading');
  assert.equal(state.canExecute(),false);
  fs.writeFileSync(file,'corrupt');
  state=new RuntimeState({file});
  assert.equal(state.boot().state,'ERROR','corrupt persistent state fails closed');
  assert.throws(()=>state.transition('MAGIC','invalid'));
  console.log('PASS P1 durable runtime states');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
