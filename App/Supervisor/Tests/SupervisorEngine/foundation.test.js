'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {WorkingMemory}=require('../../Engine/working-memory');
const {SupervisorEngine}=require('../../Engine/supervisor-engine');
const {tenantOf}=require('../../CognitiveRuntime');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const session=x=>hash('session:'+x);
const auth=(owner='CLalice',sessionName='s1')=>({source:'AUTH21_OWNER',principal:{clientId:owner,role:'USER'},sessionHash:session(sessionName)});
const memscope=(a,room='alpha')=>({tenantId:tenantOf(a),sessionHash:a.sessionHash,room});
const goodContract=(action='marketdata.health')=>({
  engine:action.split('.')[0],id:action,online:true,decision:'ALLOW',contract_hash:hash(action),
  contract:{verified_handler:true,agent_qualified:true,hard_deny:false,side_effects:false}
});
const mockGateway=(overrides={})=>{
 const events={discover:0,describe:0,execute:0};
 const commands=overrides.commands||[goodContract('marketdata.health'),goodContract('risk.status')];
 const gateway={
   async list_available_engines(){events.discover++;return [{id:'marketdata',online:true},{id:'risk',online:true}];},
   async list_available_commands(){return commands;},
   async describe_command(e,c){events.describe++;return overrides.contract||commands.find(x=>x.engine===e&&x.id===c)||(()=>{throw Error('COMMAND_UNKNOWN')})();},
   async execute_authorized_command(e,c,args,opts){events.execute++;if(overrides.error)throw Error(overrides.error);
     return overrides.response||{request_id:opts.request_id,data:{engine:e,command:c,available:true,timestamp:Date.now()}};}
 };
 return {gateway,events};
};
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-supervisor-v3-'));
 const file=path.join(dir,'working.sqlite');
 const memory=new WorkingMemory({filename:file});
 const eng=new SupervisorEngine({memory});
 return {dir,file,memory,eng,close:()=>{eng.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
test('MEM-01: empty memory has no invented objective or observations',()=>{
 const f=fixture();try{const s=f.memory.current(memscope(auth()));assert.equal(s.objective,null);assert.equal(s.revision,0);assert.deepEqual(s.observations,[]);}finally{f.close();}
});
test('MEM-02: objective persists across SQLite shutdown/reopen',()=>{
 const f=fixture();try{const a=auth(),sc=memscope(a);f.memory.setObjective(sc,'Analyse BTC-USDT');f.eng.close();const m=new WorkingMemory({filename:f.file});assert.equal(m.current(sc).objective,'Analyse BTC-USDT');m.close();}
 finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('MEM-03: observations survive SQLite process reopening',()=>{
 const f=fixture();try{const sc=memscope(auth());f.memory.setObjective(sc,'risk');f.memory.record(sc,{engine:'risk',command:'risk.status',status:'OK',value:{ok:true}});f.eng.close();const m=new WorkingMemory({filename:f.file});assert.equal(m.current(sc).observations.length,1);m.close();}
 finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('MEM-04: objective replacement clears older observations',()=>{
 const f=fixture();try{const sc=memscope(auth());f.memory.setObjective(sc,'BTC');f.memory.record(sc,{engine:'risk',command:'risk.status',status:'OK',value:'old'});f.memory.setObjective(sc,'ETH');assert.deepEqual(f.memory.current(sc).observations,[]);}finally{f.close();}
});
test('MEM-05: setting same objective preserves observations',()=>{
 const f=fixture();try{const sc=memscope(auth());f.memory.setObjective(sc,'BTC');f.memory.record(sc,{engine:'risk',command:'risk.status',status:'OK',value:'existing'});f.memory.setObjective(sc,'BTC');assert.equal(f.memory.current(sc).observations.length,1);}finally{f.close();}
});
test('MEM-06: owner isolation',()=>{
 const f=fixture();try{f.memory.setObjective(memscope(auth('CLalice')),'private');assert.equal(f.memory.current(memscope(auth('CLbob'))).objective,null);}finally{f.close();}
});
test('MEM-07: session isolation',()=>{
 const f=fixture();try{f.memory.setObjective(memscope(auth('CLalice','s1')),'private');assert.equal(f.memory.current(memscope(auth('CLalice','s2'))).objective,null);}finally{f.close();}
});
test('MEM-08: room isolation',()=>{
 const f=fixture();try{f.memory.setObjective(memscope(auth(),'alpha'),'private');assert.equal(f.memory.current(memscope(auth(),'beta')).objective,null);}finally{f.close();}
});
test('MEM-09: memory rejects bad tenant and room',()=>{
 const f=fixture();try{assert.throws(()=>f.memory.current({tenantId:'bad',sessionHash:session('s1'),room:'alpha'}),/SCOPE_INVALID/);assert.throws(()=>f.memory.current(memscope(auth(),'../../escape')),/SCOPE_INVALID/);}finally{f.close();}
});
test('MEM-10: memory retains 48 observations but returns at most 12',()=>{
 const f=fixture();try{const sc=memscope(auth());for(let i=0;i<75;i++)f.memory.record(sc,{engine:'risk',command:'risk.status',status:'OK',value:'v'+i});
 const n=f.memory.db.prepare('SELECT COUNT(*) AS n FROM work_observations').get().n;assert.equal(n,48);assert.equal(f.memory.current(sc).observations.length,12);}finally{f.close();}
});
test('MEM-11: invalid status rejected',()=>{
 const f=fixture();try{assert.throws(()=>f.memory.record(memscope(auth()),{engine:'risk',command:'risk.status',status:'FILLED',value:'x'}),/OBSERVATION_INVALID/);}finally{f.close();}
});
test('MEM-12: memory file permissions are private on POSIX',()=>{
 const f=fixture();try{if(process.platform!=='win32'){assert.equal(fs.statSync(f.file).mode&0o777,0o600);assert.equal(fs.statSync(f.dir).mode&0o077,0);}}finally{f.close();}
});
test('MEM-13: observations preserve structured JSON values (expected product requirement)',()=>{
 const f=fixture();try{const sc=memscope(auth());f.memory.record(sc,{engine:'risk',command:'risk.status',status:'OK',value:{ok:true,score:7}});
 const v=f.memory.current(sc).observations[0].value;assert.equal(typeof v,'object','Observation should be structured data, not a JSON-encoded string');assert.equal(v.score,7);}finally{f.close();}
});
test('MEM-14: short-term objective recoverable after owner renews Auth21 session (expected medium-term requirement)',()=>{
 const f=fixture();try{f.memory.setObjective(memscope(auth('CLalice','s1')),'analyse BTC');const after=f.memory.current(memscope(auth('CLalice','s2')));
 assert.equal(after.objective,'analyse BTC','Expected owner-approved continuity across session refresh');}finally{f.close();}
});
test('MEM-15: stale observations are marked before use (expected context recovery requirement)',()=>{
 let time=1000;const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-v3-time-'));const m=new WorkingMemory({filename:path.join(dir,'working.sqlite'),now:()=>time});
 try{const sc=memscope(auth());m.record(sc,{engine:'marketdata',command:'marketdata.health',status:'OK',value:{price:100}});
 time+=3600000;const row=m.current(sc).observations[0];assert.equal(row.stale,true,'Age > 1h should not remain an implicitly current observation');}
 finally{m.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('CP1-01: discover queries a gateway and returns capabilities',async()=>{
 const f=fixture();try{const {gateway,events}=mockGateway();const out=await f.eng.discover({room:'alpha'},auth(),gateway);
 assert.equal(out.cp1,'CONNECTED');assert.equal(out.engines.length,2);assert.equal(events.discover,1);}finally{f.close();}
});
test('CP1-02: allowed read command traverses gateway and writes observation',async()=>{
 const f=fixture();try{const {gateway,events}=mockGateway();const result=await f.eng.observe({room:'alpha',engine:'risk',command:'risk.status'},auth(),gateway);
 assert.equal(result.status,'OK');assert.equal(events.execute,1);assert.equal(result.context.working.observations.length,1);}finally{f.close();}
});
test('CP1-03: dangerous financial command rejected before transport',async()=>{
 const f=fixture();try{const {gateway,events}=mockGateway();await assert.rejects(f.eng.observe({room:'alpha',engine:'trading',command:'trading.execute'},auth(),gateway),/COMMAND_NOT_ALLOWED/);assert.equal(events.execute,0);}finally{f.close();}
});
for(const [id,contract] of [
 ['CP1-04: DENY privilege',{decision:'DENY'}],
 ['CP1-05: offline engine',{online:false}],
 ['CP1-06: hard-deny contract',{contract:{...goodContract().contract,hard_deny:true}}],
 ['CP1-07: unqualified contract',{contract:{...goodContract().contract,agent_qualified:false}}],
 ['CP1-08: side-effect contract',{contract:{...goodContract().contract,side_effects:true}}]
]){
 test(id+' is blocked before transport',async()=>{
   const f=fixture();try{const {gateway,events}=mockGateway({contract:{...goodContract(),...contract}});const r=await f.eng.observe({engine:'marketdata',command:'marketdata.health'},auth(),gateway);
   assert.equal(r.status,'DENIED');assert.equal(events.execute,0);}finally{f.close();}
 });
}
test('CP1-09: gateway temporarily absent does not lose objective',async()=>{
 const f=fixture();try{f.eng.objective({objective:'BTC'},auth());const r=await f.eng.observe({engine:'risk',command:'risk.status'},auth(),null);
 assert.equal(r.status,'UNAVAILABLE');assert.equal(r.context.working.objective,'BTC');}finally{f.close();}
});
test('CP1-10: timeout produces explicit unknown observation',async()=>{
 const f=fixture();try{const {gateway}=mockGateway({error:'CP_ROUTER_TIMEOUT'});const r=await f.eng.observe({engine:'risk',command:'risk.status'},auth(),gateway);assert.equal(r.status,'UNAVAILABLE');assert.equal(r.error,'CP_ROUTER_TIMEOUT');}finally{f.close();}
});
test('CP1-11: unavailable discovery does not invent engines',async()=>{
 const f=fixture();try{const r=await f.eng.discover({},auth());assert.equal(r.cp1,'UNAVAILABLE');assert.deepEqual(r.engines,[]);}finally{f.close();}
});
test('CP1-12: gateway throws on discovery; no stale connected claim',async()=>{
 const f=fixture();try{const r=await f.eng.discover({},auth(),{list_available_engines:async()=>{throw Error('offline');},list_available_commands:async()=>[]});assert.equal(r.cp1,'UNAVAILABLE');assert.deepEqual(r.engines,[]);}finally{f.close();}
});
test('SEC-01: unverified principal refused',()=>{
 const f=fixture();try{assert.throws(()=>f.eng.context({}, {source:'UNTRUSTED',principal:{clientId:'CLalice',role:'USER'},sessionHash:session('s1')}),/OWNER_PROOF_REQUIRED/);}finally{f.close();}
});
test('SEC-02: missing session hash refused',()=>{
 const f=fixture();try{assert.throws(()=>f.eng.context({}, {source:'AUTH21_OWNER',principal:{clientId:'CLalice',role:'USER'}}),/SESSION_REQUIRED/);}finally{f.close();}
});
test('CTX-01: working objective included in cognitive context facade',()=>{
 const f=fixture();try{f.eng.objective({room:'alpha',objective:'analyze BTC'},auth());f.eng.cognitive=()=>({
 short:{history:()=>[{role:'user',content:'Hello'}]},long:{readSelf:()=> 'supervisor'}
 });const c=f.eng.context({room:'alpha'},auth());assert.equal(c.working.objective,'analyze BTC');assert.equal(c.conversation.length,1);assert.equal(c.identity_summary,'supervisor');}finally{f.close();}
});
test('CTX-02: observation refresh follows changed gateway data',async()=>{
 const f=fixture();try{const g=mockGateway({response:{data:{price:123}}});await f.eng.observe({engine:'marketdata',command:'marketdata.health'},auth(),g.gateway);
 g.gateway.execute_authorized_command=async()=>({data:{price:124}});await f.eng.observe({engine:'marketdata',command:'marketdata.health'},auth(),g.gateway);
 const obs=f.eng.context({},auth()).working.observations;assert.equal(obs.length,2);assert.notEqual(obs[0].value,obs[1].value);}finally{f.close();}
});
test('SEC-03: changing objective resets old sensitive observations',async()=>{
 const f=fixture();try{const {gateway}=mockGateway();await f.eng.observe({engine:'risk',command:'risk.status'},auth(),gateway);f.eng.objective({objective:'new objective'},auth());
 assert.equal(f.eng.context({},auth()).working.observations.length,0);}finally{f.close();}
});
