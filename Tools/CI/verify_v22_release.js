'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),json=file=>JSON.parse(read(file));
const version=read('App/VERSION').trim();assert.equal(version,'2.2.0');
for(const value of [read('App/Frontend/Settings/VERSION').trim(),json('App/package.json').version,json('App/package-lock.json').version,json('App/package-lock.json').packages[''].version,json('App/manifest.json').version])assert.equal(value,version);
assert.equal(json('App/manifest.json').status,'TEST');
if(process.argv[2]){
 const compose=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 assert.equal(Object.keys(compose.services).length,13);
 for(const [name,service] of Object.entries(compose.services)){
  assert.notEqual(name,'trading');assert(!service.ports?.length);assert.equal(service.read_only,true);assert.equal(service.image,'iatb:2.2.0');
  assert.equal(service.environment.IATB_AUTH_MODE,'authenticated');assert.equal(service.environment.IATB_TRADING_LIVE,'0');assert.equal(service.environment.IATB_TRADING_ENGINE_ENABLED,'0');
  assert(!service.command.some(arg=>/fixture|preload|--require/.test(arg)));
  assert(!Object.keys(service.environment).some(k=>/IATB_QA_|_TRIAL$/.test(k)));
 }
}
console.log('V2.2_RELEASE_METADATA_OK');
