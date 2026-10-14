'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {MARKER,CONTENT}=require('../../Core/Backup/auth21_core_local_trial_wiring');
const {createRouterProbe}=require('../../Core/Clients/auth21_ipc_probe');
const {proofCodec}=require('../../Core/Clients/auth21_ipc_proof');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-auth21-core-runtime-'));fs.chmodSync(root,0o700);
 fs.writeFileSync(path.join(root,MARKER),CONTENT,{mode:0o600});
 const folder=path.join(root,'userdata','Security');fs.mkdirSync(folder,{recursive:true});
 const key=Buffer.alloc(32,8);fs.writeFileSync(path.join(folder,'auth21_ipc.key'),key,{mode:0o600});
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const env={IATB_AUTH21_IPC_PROBE_TRIAL:'1',IATB_AUTH21_CORE_AUTH_TRIAL:'1',
 IATB_AUTH21_LOCAL_SNAPSHOT_TRIAL:'1',IATB_DEBUG_MODE:'1',IATB_DEBUG_BOOTSTRAP:'0',
 IATB_AUTH21_LOCAL_TRIAL_ROOT:root,IATB_RUNTIME_ROOT:path.join(root,'runtime'),
 IATB_DATA_ROOT:path.join(root,'userdata'),IATB_ANNEX_ROOT:path.join(root,'annexes'),
 IATB_UPDATES_ROOT:path.join(root,'updates'),IATB_STATE_ROOT:path.join(root,'legacy')};
 return {root,env,key};
}
function invoke(handler,proof,method='GET'){
 const req={method,headers:proof?{'x-iatb-auth21-proof':proof}:{}};
 const res={writeHead(status){this.status=status},end(data){this.body=JSON.parse(data)}};
 handler(req,res);return res;
}
test('Router IPC probe allows one valid proof and rejects replay or missing credentials',t=>{
 const f=fixture(t),handler=createRouterProbe(f),codec=proofCodec({secret:f.key});
 const p=codec.issue({principal:{clientId:'CL000001',role:'GUEST'},audience:'router',
  operation:'shared.read',method:'GET'});
 assert.equal(invoke(handler,p).status,200);
 assert.equal(invoke(handler,p).status,403);
 assert.equal(invoke(handler,null).status,403);
 assert.equal(invoke(handler,codec.issue({principal:{clientId:'CL000001',role:'USER'},
  audience:'portfolio',operation:'shared.read',method:'GET'})).status,403);
});
test('Router IPC probe does not start without private key and explicit opt-in',t=>{
 const f=fixture(t);
 assert.throws(()=>createRouterProbe({...f,env:{...f.env,IATB_AUTH21_IPC_PROBE_TRIAL:'0'}}),/AUTH21_PROBE_EXPLICIT_OPTIN_REQUIRED/);
 fs.chmodSync(path.join(f.root,'userdata','Security','auth21_ipc.key'),0o644);
 assert.throws(()=>createRouterProbe(f),/AUTH21_IPC_KEY_UNSAFE/);
});

test('separate Node process verifies Core-style signed IPC proof from private trial file',t=>{
 const f=fixture(t);
 const {execFileSync}=require('node:child_process');
 const proof=proofCodec({secret:f.key}).issue({
  principal:{clientId:'CL000001',role:'USER'},audience:'router',operation:'shared.read',method:'GET'
 });
 const loader=path.resolve(__dirname,'../../Core/Clients/auth21_ipc_probe.js');
 const child="const probe=require(process.argv[1]).createRouterProbe({env:process.env,root:process.env.IATB_AUTH21_LOCAL_TRIAL_ROOT});"+
  "let status=0;probe({method:'GET',headers:{'x-iatb-auth21-proof':process.env.IATB_TEST_PROOF}}, {writeHead(s){status=s},end(){process.stdout.write(String(status))}});";
 const status=execFileSync(process.execPath,['-e',child,loader],{
  env:{...process.env,...f.env,IATB_TEST_PROOF:proof},encoding:'utf8',timeout:5000
 });
 assert.equal(status,'200');
});
