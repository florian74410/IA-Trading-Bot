"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const app=path.resolve(__dirname,'../..');
test('Engine layout preserves the existing Fundamental SQLite database and private roots',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-layout-data-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'Shared Data/Fundamental/fundamental.db');fs.mkdirSync(path.dirname(file),{recursive:true});
 const D=require('better-sqlite3'),db=new D(file);db.exec("CREATE TABLE layout_sentinel(value TEXT);INSERT INTO layout_sentinel VALUES('PREEXISTING_DATA')");db.close();
 const script=`const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
 const P=require(${JSON.stringify(path.join(app,'Core/Shared/paths'))});
 assert.equal(P.PersistentData.fundamentalDb,${JSON.stringify(file)},'Persistent Fundamental location changed');
 assert.equal(P.PersistentData.clientDb,path.join(process.env.IATB_DATA_ROOT,'Database/clients.sqlite'));
 assert.equal(P.PersistentData.clientMasterKey,path.join(process.env.IATB_DATA_ROOT,'Security/client_master.key'));
 const Storage=require(${JSON.stringify(path.join(app,'Engines/Fundamental/Engine/database'))}),s=new Storage();
 assert.equal(s.db.prepare('SELECT value FROM layout_sentinel').get().value,'PREEXISTING_DATA');s.db.close();
 assert(!fs.existsSync(path.join(process.env.IATB_DATA_ROOT,'Shared Data/Engines')),'Unexpected empty replacement database directory');`;
 const r=spawnSync(process.execPath,['-e',script],{env:{...process.env,IATB_PATHS_PREFLIGHT_READONLY:'1',IATB_DATA_ROOT:dir,IATB_RUNTIME_ROOT:path.join(dir,'runtime')},encoding:'utf8',timeout:20000});
 assert.equal(r.status,0,r.stderr||r.error?.message);
 const check=new D(file,{readonly:true});assert.equal(check.prepare('SELECT value FROM layout_sentinel').get().value,'PREEXISTING_DATA');check.close();
});
test('relocated Indicator code keeps preexisting shared custom definitions in their data directory',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-indicator-layout-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const code=path.join(dir,'App/Engines/Indicators'),data=path.join(dir,'App/Indicators'),custom=path.join(data,'Custom');fs.mkdirSync(path.join(code,'BuiltIn'),{recursive:true});fs.mkdirSync(custom,{recursive:true});
 const d=JSON.parse(fs.readFileSync(path.join(app,'Engines/Indicators/BuiltIn/RSI.indicator.json')));d.id='preexisting_rsi';d.name='Preserved shared RSI';const file=path.join(custom,'preexisting_rsi.indicator.json'),bytes=JSON.stringify(d);fs.writeFileSync(file,bytes);
 const {Registry}=require('../../Engines/Indicators/Engine/indicator_registry'),r=new Registry(code,{customRoot:custom,quarantineRoot:path.join(data,'Quarantine')});
 assert.equal(r.get(d.id).name,d.name);r.reload();assert.equal(r.items[d.id].path,file);assert.equal(fs.readFileSync(file,'utf8'),bytes);assert(!fs.existsSync(path.join(code,'Custom')));
});
