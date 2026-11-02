import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {baseModel,deriveNodes,deriveEdges,validateModel,validatePositions,autoLayout,exportDraft,hues} from '../src/lib/graph.js';
const here=dirname(fileURLToPath(import.meta.url));
const source=(rel)=>readFileSync(join(here,'..',rel),'utf8');
test('Public IA-TB project model is complete and excludes runtime secrets',()=>{
 const model=validateModel(baseModel);
 assert.equal(model.schemaVersion,3);
 assert.equal(model.systems.filter(s=>s.kind==='engine').length,8);
 assert.equal(model.systems.filter(s=>s.kind==='firewall').length,1);
 assert.equal(model.systems.filter(s=>s.kind==='router').length,1);
 assert.equal(model.systems.find(s=>s.id==='firewall').modules.length,3);
 assert.equal(model.systems.find(s=>s.id==='providers').kind,'external');
 assert.equal(model.systems.length,13);
 assert.ok(model.systems.every(s=>s.modules.length===3));
 for(const e of model.edges)assert.ok(Object.hasOwn(hues,e.protocol));
 const allText=JSON.stringify(model);
 for(const p of ['127.0.0.1','169.58.','ssh-rsa','BEGIN PRIVATE','Authorization: Bearer','/opt/iatb','/srv/iatb','ASUS-G11CD','Hardware Lab','configurator','MCP_TOKEN']){
  assert.ok(!allText.includes(p),'public model leak: '+p);
 }
});
test('Diagram has public overview and drill-down without merging engines',()=>{
 const model=validateModel(baseModel);
 const simple=deriveNodes(model,[],{},false);
 assert.equal(simple.length,13);
 const engines=simple.filter(n=>n.data.kind==='engine');
 assert.equal(engines.length,8);
 const deep=deriveNodes(model,['fundamental','marketdata'],{},false);
 assert.equal(deep.length,19);
 assert.equal(deep.filter(n=>n.type==='satellite').length,6);
 assert.equal(deep.find(n=>n.id==='fundamental-m1').parentId,'fundamental');
 assert.equal(deriveEdges(model,null,false).length,model.edges.filter(e=>e.priority===1).length);
 assert.equal(deriveEdges(model,null,true).length,model.edges.length);
 assert.ok(deriveEdges(model,'indicator',false).some(e=>e.target==='indicator'));
});
test('Manually moved blocks are validated and exports roundtrip',()=>{
 const model=validateModel(baseModel);
 const positions=validatePositions({core:{x:150,y:80},router:{x:NaN,y:Infinity},unknown:{x:2,y:3}},model);
 assert.deepEqual(positions.core,{x:150,y:80});
 assert.equal(Object.hasOwn(positions,'router'),false);
 assert.equal(Object.hasOwn(positions,'unknown'),false);
 const copy=exportDraft(model,positions);
 assert.equal(copy.format,'iatb-atlas-draft-v3');
 assert.equal(validateModel(copy.architecture).systems.length,13);
 assert.throws(()=>validateModel({...model,systems:[...model.systems,model.systems[0]]}),/dupliqué/);
 assert.throws(()=>validateModel({...model,edges:[...model.edges,{id:'bad',source:'unknown',target:'core',protocol:'cp1'}]}),/invalide/);
});
test('Automatic layered layout produces finite positions for every root system',async()=>{
 const layout=await autoLayout(baseModel,[]);
 assert.equal(Object.keys(layout).length,13);
 for(const p of Object.values(layout)){assert.equal(Number.isFinite(p.x),true);assert.equal(Number.isFinite(p.y),true);}
},{timeout:30000});
test('Public client build has no deployment or authentication secrets',()=>{
 const app=source('src/App.jsx'),config=source('vite.config.js'),graph=source('src/components/ArchitectureGraph.jsx');
 assert.match(app,/présentation publique|présentation technique|Présentation technique/i);
 assert.match(config,/mode==='editor'/);
 assert.match(config,/VITE_ENABLE_EDITOR==='true'/);
 assert.match(graph,/exportDraft/);
 assert.match(graph,/onToggleFull/);
 assert.match(source('src/components/GraphNodes.jsx'),/textPath/);
 for(const rel of ['src/App.jsx','src/lib/graph.js','src/components/ArchitectureGraph.jsx']){
   assert.ok(!/Hardware Lab|ASUS G11|TopAchat|configurator PC/i.test(source(rel)),'foreign project reference in '+rel);
 }
});
