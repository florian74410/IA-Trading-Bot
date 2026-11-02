import ELK from 'elkjs/lib/elk.bundled.js';
import publicArchitecture from '../data/public-architecture.json';
export const baseModel=publicArchitecture;
export const WIDTH=264;
export const HEIGHT=104;
export const EXPANDED_HEIGHT=264;
export const hues={logical:'#77c6ae',security:'#f6b675',external:'#c8a4fd',cp1:'#63c7f0'};
export const staticPositions={
 supervisor:{x:622,y:30},core:{x:622,y:210},router:{x:622,y:390},firewall:{x:622,y:570},
 providers:{x:120,y:765},marketdata:{x:464,y:765},fundamental:{x:808,y:765},indicator:{x:1152,y:765},
 strategy:{x:120,y:965},risk:{x:464,y:965},liquidity:{x:808,y:965},trading:{x:1152,y:965},
 portfolio:{x:636,y:1165}
};
export const exists=(model,id)=>model.systems.some(n=>n.id===id);
export function validateModel(input){
 if(!input||input.schemaVersion!==3||!Array.isArray(input.systems)||!Array.isArray(input.edges))throw new Error('Schéma Atlas v3 invalide');
 if(input.systems.length>120||input.edges.length>400)throw new Error('Diagramme trop volumineux');
 const idPattern=/^[a-zA-Z0-9_-]{1,60}$/;
 const ids=new Set();
 const systems=input.systems.map(n=>{
  if(!n||!idPattern.test(n.id)||ids.has(n.id))throw new Error('ID système absent ou dupliqué');
  ids.add(n.id);
  const title=String(n.title||'').trim().slice(0,80),subtitle=String(n.subtitle||'').slice(0,100);
  if(!title)throw new Error('Nom de système vide');
  if(!['control','router','firewall','engine','external'].includes(n.kind))throw new Error('Type de système inconnu');
  return {id:n.id,title,subtitle,kind:n.kind,icon:String(n.icon||'server').slice(0,30),
   summary:String(n.summary||'').slice(0,650),
   note:String(n.note||'').slice(0,650),
   modules:(Array.isArray(n.modules)?n.modules:[]).slice(0,9).map((m,i)=>({id:n.id+'-m'+(i+1),label:String(m.label||'Module').slice(0,75)}))};
 });
 const edges=input.edges.map(e=>{
  if(!e||!idPattern.test(e.id)||!ids.has(e.source)||!ids.has(e.target))throw new Error('Connexion invalide');
  if(!Object.hasOwn(hues,e.protocol))throw new Error('Protocole inconnu');
  return {id:e.id,source:e.source,target:e.target,protocol:e.protocol,label:String(e.label||e.protocol).slice(0,80),priority:e.priority===1?1:2};
 });
 const eids=edges.map(e=>e.id);if(new Set(eids).size!==eids.length)throw new Error('Liaisons dupliquées');
 return {schemaVersion:3,revision:String(input.revision||'draft').slice(0,60),audience:'public',
  disclaimer:String(input.disclaimer||baseModel.disclaimer).slice(0,300),systems,edges};
}
export function deriveNodes(model, expanded, positions, editorEnabled){
 const items=[];
 for(const sys of model.systems){
  const open=expanded.includes(sys.id);
  items.push({id:sys.id,type:'system',position:positions[sys.id]||staticPositions[sys.id]||{x:0,y:0},
   data:{...sys,open,editorEnabled},draggable:editorEnabled,connectable:editorEnabled,
   style:{width:WIDTH,height:open?EXPANDED_HEIGHT:HEIGHT},zIndex:open?3:2});
  if(open)for(const [i,m] of sys.modules.entries()){
   items.push({id:m.id,type:'satellite',parentId:sys.id,extent:'parent',
    position:{x:12,y:121+i*44},data:{...m,owner:sys.title},
    draggable:false,selectable:true,connectable:false,style:{width:WIDTH-24,height:34},zIndex:4});
  }
 }
 return items;
}
export function deriveEdges(model,selected,detail){
 return model.edges.filter(e=>detail||e.priority===1||selected&&(selected===e.source||selected===e.target)).map(e=>({
   ...e,type:'named',animated:false,
   style:{stroke:hues[e.protocol],strokeWidth:selected&&(selected===e.source||selected===e.target)?2.9:1.7},
   data:{label:e.label,protocol:e.protocol,dimmed:!!selected&&selected!==e.source&&selected!==e.target}
 }));
}
const elk=new ELK();
export async function autoLayout(model, expanded){
 const graph={id:'atlas',layoutOptions:{
  'elk.algorithm':'layered','elk.direction':'DOWN','elk.edgeRouting':'ORTHOGONAL',
  'elk.spacing.nodeNode':'65','elk.layered.spacing.nodeNodeBetweenLayers':'100',
  'elk.layered.considerModelOrder.strategy':'NODES_AND_EDGES',
  'elk.padding':'[top=45,left=45,bottom=45,right=45]'
 },children:model.systems.map(n=>({id:n.id,width:WIDTH,height:expanded.includes(n.id)?EXPANDED_HEIGHT:HEIGHT})),
 edges:model.edges.map(e=>({id:e.id,sources:[e.source],targets:[e.target]}))};
 const next=await elk.layout(graph);
 return Object.fromEntries(next.children.map(n=>[n.id,{x:n.x,y:n.y}]));
}
export function validatePositions(input,model){
 if(!input||typeof input!=='object')throw new Error('Disposition invalide');
 const result={};
 for(const n of model.systems){const p=input[n.id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=50000&&Math.abs(p.y)<=50000)result[n.id]={x:p.x,y:p.y};}
 return result;
}
export function exportDraft(model,positions){return {format:'iatb-atlas-draft-v3',schemaVersion:3,
 exportedAt:new Date().toISOString(),architecture:model,positions:validatePositions(positions,model)};}
