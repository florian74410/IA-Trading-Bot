"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync,execFileSync}=require('node:child_process');
const started=Date.now();
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'../artifacts/engine-units')),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-engine-units-'));
const files=JSON.parse(fs.readFileSync(path.join(__dirname,'Tests/consolidation_engine_units.json'))).files;
fs.mkdirSync(out,{recursive:true});
try{
 const guard=path.join(root,'Tools/Tests/loopback_only_preload.js'),env={...process.env,IATB_QA_LOOPBACK_ONLY:'1',NODE_OPTIONS:'--require '+guard,IATB_RUNTIME_ROOT:path.join(tmp,'runtime'),IATB_DATA_ROOT:path.join(tmp,'data'),IATB_STATE_ROOT:path.join(tmp,'state'),IATB_USER_DB:path.join(tmp,'user.db'),IATB_USERDATA_USER:'qa',IATB_ENGINE_BACKGROUND_WORK:'0',IATB_MARKETDATA_OFFLINE_DIAGNOSTIC:'1'};
 const r=spawnSync(process.execPath,['--test','--test-concurrency=1',...files],{cwd:root,env,encoding:'utf8',timeout:300000,maxBuffer:32e6}),log=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(out,'engine-units.tap'),log);
 const count=k=>Number(log.match(new RegExp('^# '+k+' (\\d+)$','m'))?.[1]||0),result={commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),node:process.version,started_at:new Date(started).toISOString(),duration_ms:Date.now()-started,status:r.status===0&&!r.error?'PASS':'FAIL',exit_code:r.status,error:r.error?.code||null,files:files.length,passed:count('pass'),failed:count('fail'),skipped:count('skipped'),real_orders:0,network:'loopback only; no real exchange domains',failed_cases:[...log.matchAll(/^not ok \d+ - (.+)$/gm)].map(m=>m[1])};
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
