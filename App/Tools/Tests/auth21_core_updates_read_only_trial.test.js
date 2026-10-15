'use strict';
/* Auth21 UpdateManager and AI-builder opt-in read-only tests. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const managerPath=path.resolve(__dirname,'../../Core/Updates/update_manager_v1.0.js');
const builderPath=path.resolve(__dirname,'../../Core/Updates/ai_update_builder_v1.0.js');
const serverPath=path.resolve(__dirname,'../../Core/Server/server.js');
function root(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-auth21-update-trial-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 return {dir,updates:path.join(dir,'Updates'),runtime:path.join(dir,'Runtime'),
  userdata:path.join(dir,'UserData')};
}
function child(f,code,{pathsReadOnly=true}={}){
 const lines=[
  'const fs=require("node:fs"),path=require("node:path");',
  'const UpdateManager=require('+JSON.stringify(managerPath)+');',
  'const AIUpdateBuilder=require('+JSON.stringify(builderPath)+');',
  'const fixture='+JSON.stringify(f.dir)+';'
 ];
 const r=spawnSync(process.execPath,['-e',lines.join('\n')+'\n'+code],{
  timeout:5000,encoding:'utf8',
  env:{...process.env,IATB_PATHS_PREFLIGHT_READONLY:pathsReadOnly?'1':'0',
   IATB_RUNTIME_ROOT:f.runtime,IATB_DATA_ROOT:f.userdata,
   IATB_UPDATES_ROOT:f.updates,IATB_ANNEX_ROOT:path.join(f.dir,'annex'),
   IATB_STATE_ROOT:path.join(f.dir,'legacy')}
 });
 if(r.error)throw r.error;
 assert.equal(r.status,0,r.stderr);
 return JSON.parse(r.stdout.trim());
}
test('readonly constructors do not create staging, history or AI builds',t=>{
 const f=root(t);
 const r=child(f,'const u=new UpdateManager(fixture,"2.1",{readOnlyTrial:true});'+
  'const b=new AIUpdateBuilder(fixture,{readOnlyTrial:true});'+
  'console.log(JSON.stringify({readOnly:u.readOnlyTrial,builder:b.readOnlyTrial,history:u.history().installed,list:b.list()}));');
 assert.equal(r.readOnly,true);assert.equal(r.builder,true);
 assert.deepEqual(r.history,[]);assert.deepEqual(r.list,[]);
 assert.equal(fs.existsSync(f.updates),false);
 assert.equal(fs.existsSync(f.runtime),false);
});
test('mutating update actions all fail before touching HTTP, ZIP or filesystem',t=>{
 const f=root(t);
 const r=child(f,'const u=new UpdateManager(fixture,"2.1",{readOnlyTrial:true}),errors=[];'+
  'for(const fn of [()=>u.record({}),()=>u.newInboxPath()]){try{fn();errors.push("BYPASS")}catch(e){errors.push(e.message)}}'+
  'for(const run of [cb=>u.receiveUpload({pipe(){throw Error("PIPE_CALLED")}},"f.zip",cb),'+
  'cb=>u.download("https://example.invalid/f.zip",cb),'+
  'cb=>u.inspectArchive("/missing.zip","local",cb),cb=>u.install("FAKE",cb)])'+
  'run(error=>errors.push(error?error.message:"BYPASS"));'+
  'console.log(JSON.stringify(errors));');
 assert.deepEqual(r,Array(6).fill('AUTH21_UPDATES_READ_ONLY'));
 assert.equal(fs.existsSync(f.updates),false);
});
test('readonly retention and cleanup never delete previews or backups',t=>{
 const f=root(t),sentinel=path.join(f.dir,'retention-sentinel');
 fs.writeFileSync(sentinel,'KEEP');
 const r=child(f,'const u=new UpdateManager(fixture,"2.1",{readOnlyTrial:true});'+
  'u.previews.fake={stage:fixture,zipPath:'+JSON.stringify(sentinel)+',createdAt:0};'+
  'u.cleanupPreview("fake");u.cleanupOld();'+
  'console.log(JSON.stringify({pending:Object.keys(u.previews),sentinel:fs.existsSync('+JSON.stringify(sentinel)+')}));');
 assert.deepEqual(r.pending,['fake']);assert.equal(r.sentinel,true);
 assert.equal(fs.readFileSync(sentinel,'utf8'),'KEEP');
});
test('AI builder refuses any build or code validation before filesystem writes',t=>{
 const f=root(t);
 const r=child(f,'const b=new AIUpdateBuilder(fixture,{readOnlyTrial:true}),errors=[];'+
  'for(const fn of [()=>b.applyPlan({operations:[]},"fixture"),()=>b.validateGenerated("/fake",[])])'+
  '{try{fn();errors.push("BYPASS")}catch(e){errors.push(e.message)}}'+
  'console.log(JSON.stringify(errors));');
 assert.deepEqual(r,['AUTH21_UPDATES_READ_ONLY','AUTH21_UPDATES_READ_ONLY']);
 assert.equal(fs.existsSync(f.updates),false);
});
test('version/status reads are preserved without history creation',t=>{
 const f=root(t);
 const r=child(f,'const u=new UpdateManager(fixture,"2.1",{readOnlyTrial:true});'+
  'console.log(JSON.stringify({application:u.status().application,history:u.history().installed,'+
  'compare:UpdateManager.compareVersions("2.0","2.1")}));');
 assert.equal(r.application,'IA-Trading-Bot');assert.deepEqual(r.history,[]);
 assert.equal(r.compare,-1);assert.equal(fs.existsSync(f.updates),false);
});
test('server injects readOnlyTrial into both update components during Core trial',()=>{
 const s=fs.readFileSync(serverPath,'utf8');
 assert.ok((s.match(/readOnlyTrial:!!AUTH21_LOCAL_WRITERS/g)||[]).length>=2);
 assert.match(s,/function installAIUpdate\(build,cb\)\{if\(AUTH21_LOCAL_WRITERS\)return cb\(new Error\('AUTH21_UPDATES_READ_ONLY'\)\)/);
});

test('historical update initialization still creates only synthetic update directories without opt-in flag',t=>{
 const f=root(t);
 const r=child(f,'const u=new UpdateManager(fixture,"2.1");'+
  'const b=new AIUpdateBuilder(fixture);'+
  'console.log(JSON.stringify({readOnly:u.readOnlyTrial,builder:b.readOnlyTrial,'+
  'history:fs.existsSync(u.historyFile),generated:fs.existsSync(b.dir)}));',
  {pathsReadOnly:false});
 assert.equal(r.readOnly,false);assert.equal(r.builder,false);
 assert.equal(r.history,true);assert.equal(r.generated,true);
 assert.equal(fs.existsSync(path.join(f.updates,'update_history.dat')),true);
 assert.equal(fs.existsSync(path.join(f.updates,'AI-Generated')),true);
});
