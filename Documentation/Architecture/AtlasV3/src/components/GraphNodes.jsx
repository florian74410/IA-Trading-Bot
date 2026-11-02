import React from 'react';
import {Handle,Position,getSmoothStepPath} from '@xyflow/react';
import {BrainCircuit,ServerCog,Network,Shield,Activity,Newspaper,ChartNoAxesCombined,Target,ShieldCheck,Waves,ArrowLeftRight,BriefcaseBusiness,Globe2,Box,ChevronDown,ChevronUp,Code2} from 'lucide-react';
const symbols={brain:BrainCircuit,server:ServerCog,network:Network,shield:Shield,activity:Activity,newspaper:Newspaper,
 chart:ChartNoAxesCombined,target:Target,shieldCheck:ShieldCheck,waves:Waves,arrowRightLeft:ArrowLeftRight,briefcase:BriefcaseBusiness,globe:Globe2};
const edgeHues={logical:'#77c6ae',security:'#f6b675',external:'#c8a4fd',cp1:'#63c7f0'};
export function SystemNode({id,data,selected}){
 const Icon=symbols[data.icon]||Box;
 return <div className={'atlas-system atlas-'+data.kind+(selected?' selected':'')+(data.open?' expanded':'')}>
   <Handle type="target" position={Position.Top} className="atlas-handle"/>
   <div className="system-top"><span className="system-icon"><Icon size={20} strokeWidth={1.75}/></span><div className="system-head"><strong>{data.title}</strong><small>{data.subtitle}</small></div></div>
   <div className="system-bottom"><span className="system-type">{data.kind==='engine'?'ENGINE':data.kind==='firewall'?'SECURITY':data.kind==='external'?'EXTERNAL':data.kind==='router'?'ROUTER':'SYSTEM'}</span>
     <button type="button" className="system-more nodrag" title={data.open?'Replier les modules':'Afficher les modules'} onClick={e=>{e.stopPropagation();data.onExpand?.(id)}}>
       <span>{data.modules.length} modules</span>{data.open?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
     </button>
   </div>
   <Handle type="source" position={Position.Bottom} className="atlas-handle"/>
 </div>
}
export function SatelliteNode({data}){
 return <div className="atlas-satellite"><Code2 size={13}/><span>{data.label}</span><span className="sat-tag">LOCAL</span></div>
}
export function NamedEdge({id,sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,data,style,markerEnd}){
 const [path]=getSmoothStepPath({sourceX,sourceY,sourcePosition,targetX,targetY,targetPosition,borderRadius:12,offset:25});
 const pathId='atlas-route-'+id;
 const label=(data?.label||'').slice(0,45);
 return <g opacity={data?.dimmed?.28:1} className="atlas-route">
  <path id={pathId} d={path} fill="none" stroke={style?.stroke||edgeHues[data?.protocol]||'#91b9d6'} strokeWidth={style?.strokeWidth||1.7} markerEnd={markerEnd}/>
  <text className="route-name" dy="-8" textAnchor="middle">
   <textPath href={'#'+pathId} startOffset="50%">{label}</textPath>
  </text>
 </g>
}
export const nodeTypes={system:SystemNode,satellite:SatelliteNode};
export const edgeTypes={named:NamedEdge};
