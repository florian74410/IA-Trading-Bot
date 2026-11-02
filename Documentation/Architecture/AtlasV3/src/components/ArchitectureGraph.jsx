import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ReactFlow,ReactFlowProvider,MiniMap,Controls,Background,BackgroundVariant,Panel,MarkerType,useReactFlow} from '@xyflow/react';
import {Search,Scan,Maximize2,Minimize2,Layers3,GitBranch,ShieldCheck,Download,Upload,RotateCcw,LockKeyhole,Save,Move,Info,Check,X,AlignCenter} from 'lucide-react';
import {nodeTypes,edgeTypes} from './GraphNodes.jsx';
import {deriveNodes,deriveEdges,autoLayout,staticPositions,validateModel,validatePositions,exportDraft,hues,WIDTH} from '../lib/graph.js';
const EDITOR=typeof __ATLAS_EDITOR_ENABLED__!=='undefined'&&__ATLAS_EDITOR_ENABLED__===true;
const getLocal=()=>{try{return JSON.parse(localStorage.getItem('iatb-atlas-v3-draft-layout')||'null')}catch{return null}};
const safeSave=(positions,expanded)=>{try{localStorage.setItem('iatb-atlas-v3-draft-layout',JSON.stringify({positions,expanded}))}catch{}};
const initial=EDITOR?getLocal():null;
const overviewIds=new Set(['supervisor','core','router','firewall','providers','marketdata','trading']);
const overviewPositions={supervisor:{x:440,y:20},core:{x:440,y:175},router:{x:440,y:330},firewall:{x:440,y:485},providers:{x:80,y:665},marketdata:{x:440,y:665},trading:{x:800,y:665}};
function EditorToolbar({model,setModel,positions,setPositions,expanded,setExpanded,selected,setSelected,selectedEdge,setSelectedEdge}){
 const fileRef=useRef(null);
 function download(){
  const content=JSON.stringify(exportDraft(model,positions),null,2);
  const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='iatb-atlas-v3-draft.json';anchor.click();URL.revokeObjectURL(url);
 }
 async function importFile(file){
  if(!file||file.size>1024*1024)throw Error('Fichier absent ou supérieur à 1 Mo');
  const raw=JSON.parse(await file.text());
  if(raw.format!=='iatb-atlas-draft-v3')throw Error('Format de brouillon inconnu');
  const next=validateModel(raw.architecture);
  setModel(next);setPositions(validatePositions(raw.positions,next));setExpanded([]);setSelectedEdge(null);
 }
 const system=model.systems.find(s=>s.id===selected);
 const edge=model.edges.find(e=>e.id===selectedEdge);
 const createBlock=()=>{const id='draft_'+Date.now().toString(36);setModel(m=>validateModel({...m,systems:[...m.systems,{
  id,title:'Nouveau système (brouillon)',subtitle:'À qualifier',kind:'engine',icon:'server',
  summary:'Module conceptuel à vérifier avant toute publication.',note:'Brouillon non validé',
  modules:[{label:'Satellite A'},{label:'Satellite B'},{label:'Satellite C'}]
 }]}));setPositions(prev=>({...prev,[id]:{x:250,y:350}}));setSelected(id)};
 const deleteBlock=()=>{if(!system||!window.confirm('Supprimer ce système et ses routes du brouillon ?'))return;
  setModel(m=>validateModel({...m,systems:m.systems.filter(n=>n.id!==selected),edges:m.edges.filter(e=>e.source!==selected&&e.target!==selected)}));
  setExpanded(prev=>prev.filter(id=>id!==selected));setSelected(null)};
 const deleteEdge=()=>{if(!edge||!window.confirm('Supprimer cette liaison du brouillon ?'))return;
  setModel(m=>validateModel({...m,edges:m.edges.filter(e=>e.id!==selectedEdge)}));setSelectedEdge(null)};

 const editSystem=(patch)=>setModel(m=>validateModel({...m,systems:m.systems.map(s=>s.id===selected?{...s,...patch}:s)}));
 const editEdge=(patch)=>setModel(m=>validateModel({...m,edges:m.edges.map(e=>e.id===selectedEdge?{...e,...patch}:e)}));
 return <div className="editor-box">
  <div className="editor-flag"><LockKeyhole size={14}/> ATELIER PRIVÉ — BROUILLON LOCAL</div>
  <p>Les modifications ne publient jamais le site client. Exporter le JSON pour une revue et une publication Git versionnée.</p>
  <div className="editor-actions">
   <button onClick={()=>safeSave(positions,expanded)}><Save size={15}/> Sauvegarde locale</button>
   <button onClick={download}><Download size={15}/> Export JSON</button>
   <button onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import JSON</button>
   <button onClick={createBlock}><Box size={15}/> Ajouter un bloc</button>
   {system&&<button onClick={deleteBlock}><X size={15}/> Retirer le bloc</button>}
   {edge&&<button onClick={deleteEdge}><X size={15}/> Retirer la route</button>}
   <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={async e=>{try{await importFile(e.target.files?.[0]);alert('Brouillon importé localement.')}catch(err){alert(err.message)}e.target.value=''}}/>
  </div>
  {system&&<div className="editor-fields">
   <label>Nom du bloc<input value={system.title} onChange={e=>editSystem({title:e.target.value})} maxLength={80}/></label>
   <label>Type de bloc<select value={system.kind} onChange={e=>editSystem({kind:e.target.value})}>
    {['engine','control','router','firewall','external'].map(k=><option key={k} value={k}>{k}</option>)}</select></label>
   <label>Introduction<textarea rows={3} value={system.summary} onChange={e=>editSystem({summary:e.target.value})} maxLength={650}/></label>
   <label>Satellites (un par ligne)<textarea rows={4} value={system.modules.map(m=>m.label).join('\n')} onChange={e=>editSystem({modules:e.target.value.split('\n').slice(0,9).map(x=>({label:x.slice(0,75)}))})}/></label>
  </div>}
  {edge&&<div className="editor-fields">
   <label>Nom de liaison<input value={edge.label} onChange={e=>editEdge({label:e.target.value})} maxLength={80}/></label>
   <label>Protocole<select value={edge.protocol} onChange={e=>editEdge({protocol:e.target.value})}>
    {Object.keys(hues).map(k=><option key={k} value={k}>{k}</option>)}</select></label>
   <label>Visibilité<select value={edge.priority} onChange={e=>editEdge({priority:Number(e.target.value)})}><option value={1}>Synthèse</option><option value={2}>Détail</option></select></label>
  </div>}
 </div>
}
function DetailPanel({selected,setSelected,model,detail,selectedEdge,editor,setModel,positions,setPositions,expanded,setExpanded,setSelectedEdge}){
 const sys=model.systems.find(s=>s.id===selected),edge=model.edges.find(e=>e.id===selectedEdge);
 return <aside className="map-inspector">
  <div className="inspector-eyebrow"><Info size={14}/> LECTURE DE L'ARCHITECTURE</div>
  {sys?<><div className="inspector-category">{sys.kind.toUpperCase()}</div><h3>{sys.title}</h3><p className="inspector-subtitle">{sys.subtitle}</p><p>{sys.summary}</p>
    <h4>Modules et responsabilités</h4><div className="inspector-modules">{sys.modules.map(m=><div key={m.id}><span/> {m.label}</div>)}</div>
    <h4>Interconnexions</h4>
    {model.edges.filter(e=>e.source===sys.id||e.target===sys.id).map(e=><button key={e.id} className="inspector-link" onClick={()=>setSelectedEdge(e.id)}>
      <span className={'protocol-dot '+e.protocol}/><span>{e.label}</span><small>{e.protocol.toUpperCase()}</small></button>)}
    <p className="inspector-note">{sys.note}</p>
   </>:<><div className="inspector-category">PLATEFORME IA-TB</div><h3>Une architecture, plusieurs moteurs.</h3>
   <p>Sélectionne un système du diagramme pour comprendre sa mission, ses modules et ses communications. Passe en mode Détail pour explorer les satellites.</p>
   <div className="inspector-stat">{model.systems.length} systèmes documentés</div></>}
  {edge&&<div className="selected-edge"><strong>Liaison sélectionnée</strong><span>{edge.label}</span>
    <small>{edge.source} → {edge.target} · {edge.protocol}</small><button onClick={()=>setSelectedEdge(null)}>Fermer</button></div>}
  {editor&&<EditorToolbar {...{model,setModel,positions,setPositions,expanded,setExpanded,selected,setSelected,selectedEdge,setSelectedEdge}}/>}
  {!editor&&<div className="public-disclaimer"><ShieldCheck size={16}/><span>Présentation conceptuelle. Aucun accès aux secrets ni à l'administration IA-TB.</span></div>}
 </aside>;
}
function GraphBody({model,setModel,full,onToggleFull,editorEnabled,preview=false}){
 const reactFlow=useReactFlow();
 const [selected,setSelected]=useState(null);
 const [selectedEdge,setSelectedEdge]=useState(null);
 const [detail,setDetail]=useState((!preview&&full)||editorEnabled);
 const [expanded,setExpanded]=useState(initial?.expanded||[]);
 const [positions,setPositions]=useState(()=>({...staticPositions,...(initial?.positions||{})}));
 const [search,setSearch]=useState('');
 const [showMinimap,setShowMinimap]=useState(!preview);
 const [layoutBusy,setLayoutBusy]=useState(false);
 const [error,setError]=useState('');
 const toggleExpand=useCallback(id=>{setDetail(true);setExpanded(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);setSelected(id)},[]);
 const visibleModel=useMemo(()=>detail?model:{...model,systems:model.systems.filter(s=>overviewIds.has(s.id))},[model,detail]);
 const currentPositions=detail?positions:overviewPositions;
 const nodes=useMemo(()=>deriveNodes(visibleModel,detail?expanded:[],currentPositions,editorEnabled&&detail).map(n=>n.type==='system'?{...n,data:{...n.data,onExpand:toggleExpand}}:n),[visibleModel,expanded,currentPositions,editorEnabled,detail,toggleExpand]);
 const edges=useMemo(()=>deriveEdges(model,selected,detail).filter(e=>detail||(overviewIds.has(e.source)&&overviewIds.has(e.target))).map(e=>({...e,markerEnd:{type:MarkerType.ArrowClosed,color:hues[e.protocol]}})),[model,selected,detail]);
 const onNodesChange=useCallback(changes=>{if(!editorEnabled)return;setPositions(prev=>{
   let update=null;for(const c of changes)if(c.type==='position'&&c.position&&model.systems.some(n=>n.id===c.id)){if(!update)update={...prev};update[c.id]={x:c.position.x,y:c.position.y}}
   return update||prev;
  })},[editorEnabled,model]);
 useEffect(()=>{const id=requestAnimationFrame(()=>reactFlow.fitView({padding:0.12,duration:350,maxZoom:1}));return()=>cancelAnimationFrame(id)},[reactFlow,preview,detail]);
 const focus=useCallback(id=>{if(!overviewIds.has(id)&&!detail)setDetail(true);const pos=(detail?positions:overviewPositions)[id]||positions[id];if(pos){reactFlow.setCenter(pos.x+WIDTH/2,pos.y+60,{duration:450,zoom:1.12});setSelected(id)}},[positions,reactFlow]);
 async function arrange(){
  if(!detail){setError('Passe en vue Détail pour recalculer la disposition complète.');return;}setLayoutBusy(true);setError('');
  try{const next=await autoLayout(model,expanded);setPositions(next);requestAnimationFrame(()=>reactFlow.fitView({duration:550,padding:0.18,maxZoom:1.05}))}
  catch(e){setError('Placement automatique indisponible : '+e.message)}
  finally{setLayoutBusy(false)}
 }
 const onConnect=useCallback(connection=>{if(!editorEnabled||!connection.source||!connection.target||connection.source===connection.target)return;
   setModel(m=>{if(m.edges.some(e=>e.source===connection.source&&e.target===connection.target))return m;
   return validateModel({...m,edges:[...m.edges,{id:'custom_'+Date.now(),source:connection.source,target:connection.target,protocol:'logical',label:'Nouvelle liaison — à qualifier',priority:2}]})})},[setModel,editorEnabled]);
 return <div className={'graph-shell'+(full?' graph-full':'')+(preview?' graph-preview':'')}>
  <div className="graph-topbar"><div className="graph-heading"><span className="graph-indicator"/> <span>ARCHITECTURE INTERACTIVE</span><small>IA-TB / ATLAS V3</small></div>
   <div className="graph-tools">
    {!preview&&<><div className="graph-search"><Search size={15}/><input aria-label="Rechercher un système" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){const match=model.systems.find(x=>x.title.toLowerCase().includes(search.toLowerCase()));if(match)focus(match.id)}}} placeholder="Rechercher un moteur…"/>{search&&<button title="Effacer la recherche" onClick={()=>setSearch('')}><X size={13}/></button>}</div>
    <div className="segment-toggle" aria-label="Niveau du diagramme">
     <button className={!detail?'current':''} onClick={()=>{setDetail(false);setExpanded([])}}><Layers3 size={14}/> Synthèse</button>
     <button className={detail?'current':''} onClick={()=>setDetail(true)}><GitBranch size={14}/> Détail</button>
    </div>
    <button className="graph-icon-button" disabled={layoutBusy} onClick={arrange} title="Recalculer le placement automatique"><AlignCenter size={17}/></button>
    <button className="graph-icon-button" onClick={()=>reactFlow.fitView({padding:0.18,duration:400})} title="Recentrer"><Scan size={17}/></button>
    <button className={'graph-icon-button'+(showMinimap?' active':'')} onClick={()=>setShowMinimap(v=>!v)} title="Afficher ou masquer la minimap"><Layers3 size={17}/></button></>}
    {!preview&&<button className="graph-full-button" onClick={onToggleFull}>{full?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {full?'Quitter le plein écran':'Plein écran'}</button>}
    {preview&&<button className="graph-full-button" onClick={onToggleFull}><Maximize2 size={16}/> Explorer en grand</button>}
   </div></div>
  <div className="graph-body"><div className="graph-canvas">
   <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange}
     onNodeClick={(_,node)=>{const id=node.parentId||node.id;setSelected(id);setSelectedEdge(null)}}
     onEdgeClick={(_,edge)=>{setSelectedEdge(edge.id);setSelected(null)}}
     onPaneClick={()=>{setSelected(null);setSelectedEdge(null)}}
     onConnect={onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
     nodesDraggable={editorEnabled&&detail} nodesConnectable={editorEnabled&&detail} elementsSelectable={!preview} fitView
     fitViewOptions={{padding:0.16}} minZoom={0.16} maxZoom={2} zoomOnDoubleClick={false}
     proOptions={{hideAttribution:false}}>
    <Background color="#1a3549" variant={BackgroundVariant.Dots} gap={26} size={1}/>
    <Controls position="bottom-left" showInteractive={false}/>
    {showMinimap&&<MiniMap nodeStrokeWidth={2} zoomable pannable position="bottom-right"
      nodeColor={n=>n.data?.kind==='firewall'?'#f6b675':n.data?.kind==='engine'?'#51bddb':'#60829f'}/>}
   </ReactFlow>
   <div className="graph-legend"><span><i style={{background:hues.logical}}/>Logique</span><span><i style={{background:hues.cp1}}/>CP/1</span><span><i style={{background:hues.security}}/>Firewall</span><span><i style={{background:hues.external}}/>API externe</span></div>
   {error&&<div role="alert" className="graph-error">{error}</div>}
   </div>
   {!preview&&<DetailPanel {...{selected,setSelected,model,detail,selectedEdge,setSelectedEdge,editor:editorEnabled&&EDITOR,setModel,positions,setPositions,expanded,setExpanded}}/>}
   </div>
  <div className="graph-status"><span><span className="status-dot"/> {detail?'Carte détaillée':'Synthèse — 7 systèmes structurants, 8 moteurs en vue Détail'} · aucune télémétrie LIVE</span>
   <span>{model.systems.length} systèmes · {edges.length} routes visibles</span></div>
 </div>;
}
export default function ArchitectureGraph(props){return <ReactFlowProvider><GraphBody {...props}/></ReactFlowProvider>}
