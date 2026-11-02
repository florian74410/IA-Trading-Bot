import React,{useEffect,useState} from 'react';
import {ArrowUpRight,ArrowRight,BrainCircuit,Network,ShieldCheck,Layers3,Blocks,GitBranch,ChevronRight,Box,CheckCircle2,ArrowLeft,LockKeyhole,Database,Activity,Code2,Menu,X} from 'lucide-react';
import ArchitectureGraph from './components/ArchitectureGraph.jsx';
import {baseModel} from './lib/graph.js';
const editorEnabled=typeof __ATLAS_EDITOR_ENABLED__!=='undefined'&&__ATLAS_EDITOR_ENABLED__===true;
const details=[
 {icon:BrainCircuit,number:'01',title:'Analyse multi-moteurs',body:'Indicateurs, microstructure, contexte fondamental et stratégies organisés en services spécialisés.'},
 {icon:Network,number:'02',title:'Architecture modulaire',body:'Une circulation des messages documentée autour du Router CP/1 et de frontières d’intégration explicites.'},
 {icon:ShieldCheck,number:'03',title:'Sécurité par conception',body:'Pare-feu fonctionnels, contrôles de risques et garde-fous autour des opérations sensibles.'},
 {icon:Database,number:'04',title:'Données et observabilité',body:'Collecte multi-sources, cache, suivi des événements et composants de portfolio dans un ensemble cohérent.'}
];
const capabilities=[
 {id:'data',index:'01',title:'Observer',area:'Collecte & contexte',summary:'Rassembler, normaliser et contextualiser les informations de marché.',engines:['Market Data Collector','Fundamental Engine','Liquidity Engine'],facts:['Sources de marché indépendantes','Événements macroéconomiques','Mesures de microstructure'],accent:'cyan'},
 {id:'analysis',index:'02',title:'Interpréter',area:'Analyse & stratégie',summary:'Transformer les données en analyses techniques et intentions structurées.',engines:['Indicator Engine','Strategy Engine','IA Supervisor'],facts:['Indicateurs calculés','Stratégies séparées de l’exécution','Synthèse et orchestration'],accent:'purple'},
 {id:'control',index:'03',title:'Contrôler',area:'Risque & sécurité',summary:'Confronter les intentions aux contraintes et protections avant toute action sensible.',engines:['Risk Engine','Firewall System','Trading Engine'],facts:['Vérifications R1 / R2','Points de passage Firewall','Exécution non présentée comme active'],accent:'orange'},
 {id:'governance',index:'04',title:'Coordonner',area:'Architecture & suivi',summary:'Garantir la cohérence des échanges et la lisibilité de l’état système.',engines:['Core Server','Router Switch CP/1','Portfolio Engine'],facts:['Contrats de communication CP/1','Séparation des responsabilités','Événements et suivi de portefeuille'],accent:'green'}
];
function AtlasLogo(){return <span className="atlas-brand-symbol"><span>IA</span><i/></span>}
export default function App(){
 const [page,setPage]=useState('home');
 const [full,setFull]=useState(false);
 const [menu,setMenu]=useState(false);
 const [model,setModel]=useState(baseModel);
 const [capability,setCapability]=useState('data');
 const [activeSection,setActiveSection]=useState('home');
 function navigate(to){setPage(to);setFull(false);setMenu(false);window.scrollTo({top:0,behavior:'smooth'});}
 useEffect(()=>{function escape(e){if(e.key==='Escape'&&full)setFull(false)}document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape)},[full]);
 useEffect(()=>{document.title=(page==='map'?'Carte du système · ':'')+'IA-TB | Architecture Atlas'},[page]);
 return <div className="atlas-page">
  <header className="site-header">
   <div className="header-inside">
    <button className="site-brand" onClick={()=>navigate('home')} aria-label="Retour à la présentation"><AtlasLogo/><span className="brand-words"><strong>IA-TB</strong><small>ARCHITECTURE ATLAS</small></span></button>
    <nav className={'site-nav'+(menu?' open':'')} aria-label="Navigation principale">
      <button className={page==='home'?'active':''} onClick={()=>navigate('home')}>Présentation</button>
      <button className={page==='map'?'active':''} onClick={()=>navigate('map')}>Architecture interactive</button>
      <a target="_blank" rel="noopener noreferrer" href="https://github.com/florian74410/IA-Trading-Bot">Référentiel <ArrowUpRight size={14}/></a>
    </nav>
    <div className="header-side"><span className="header-version">CONCEPT / DEV SNAPSHOT</span>
      <button className="header-cta" onClick={()=>navigate('map')}><Blocks size={15}/> Explorer l'Atlas</button>
      <button className="mobile-menu" onClick={()=>setMenu(v=>!v)} aria-label="Ouvrir ou fermer le menu">{menu?<X size={21}/>:<Menu size={21}/>}</button></div>
   </div>
  </header>
  {page==='home'&&<main>
   <section className="hero">
    <div className="hero-grid">
      <div className="hero-copy">
       <div className="eyebrow"><span className="signal-pulse"/> PLATEFORME D'ARCHITECTURE · IA-TB</div>
       <h1>Une intelligence.<br/><span>Plusieurs moteurs.</span><br/>Une architecture.</h1>
       <p className="hero-lead">Découvrez comment IA-TB structure l'analyse des marchés, la collecte des données, la prise de décision et la gestion du risque à travers une plateforme de services spécialisés.</p>
       <div className="hero-actions">
        <button className="btn-primary" onClick={()=>navigate('map')}>Explorer l'architecture <ArrowRight size={18}/></button>
        <a className="btn-outline" href="#overview">Comprendre la plateforme <ChevronRight size={17}/></a>
       </div>
       <div className="hero-footnote"><ShieldCheck size={15}/> Présentation technique et conceptuelle · aucune opération réelle</div>
      </div>
      <div className="hero-illustration" aria-hidden="true">
       <div className="orb orb1"/><div className="orb orb2"/>
       <svg className="hero-network" viewBox="0 0 500 430" fill="none">
        <g stroke="#2c5876" strokeWidth="1.4"><path d="M250 82V145M250 214V260M250 331V378"/><path d="M250 270H91V324M250 270H413V324"/><path d="M250 174H100V205M250 174H408V205"/></g>
        <g stroke="#4ad2e4" opacity=".65" strokeWidth="1.5"><path d="M250 82V145"/><path d="M250 214V260"/></g>
        <rect x="168" y="20" width="164" height="62" rx="12" fill="#142b3b" stroke="#5bbdc6"/><text x="250" y="44" textAnchor="middle" fontSize="11" fill="#72dded" fontWeight="700">SUPERVISOR</text><text x="250" y="64" textAnchor="middle" fontSize="12" fill="#e5f7fb">IA / ORCHESTRATION</text>
        <rect x="168" y="145" width="164" height="70" rx="12" fill="#132b39" stroke="#5abca5"/><text x="250" y="173" textAnchor="middle" fontSize="14" fill="#e5f7fb" fontWeight="700">CORE SERVER</text><text x="250" y="193" textAnchor="middle" fontSize="10" fill="#82bea9">GOVERNANCE · AUTH</text>
        <rect x="168" y="260" width="164" height="70" rx="12" fill="#153148" stroke="#469dda"/><text x="250" y="291" textAnchor="middle" fontSize="14" fill="#e5f7fb" fontWeight="700">ROUTER CP/1</text><text x="250" y="311" textAnchor="middle" fontSize="10" fill="#89cbe5">SERVICE SWITCH</text>
        {[[21,320,'MARKET DATA'],[332,320,'ENGINES'],[14,202,'PROVIDERS'],[341,202,'RISK GATE']].map(([x,y,l])=><g key={l}><rect x={x} y={y} width="154" height="55" rx="9" fill="#0f2637" stroke="#345979"/><text x={x+77} y={y+31} textAnchor="middle" fontSize="11" fill="#afcddf">{l}</text></g>)}
        <circle cx="250" cy="82" r="4" fill="#64dfec"/><circle cx="250" cy="145" r="4" fill="#64dfec"/><circle cx="250" cy="260" r="4" fill="#56b3e1"/>
       </svg><div className="hero-overlay-tag"><Activity size={13}/> MODULES INTERCONNECTÉS</div>
      </div>
    </div>
    <div className="hero-metrics"><div><strong>08</strong><span>moteurs spécialisés</span></div><div><strong>CP/1</strong><span>échanges interservices</span></div><div><strong>03</strong><span>familles de contrôles Firewall</span></div><div><strong>V3</strong><span>exploration interactive</span></div></div>
   </section>
   <section id="overview" className="overview-section">
     <div className="section-intro"><div><div className="eyebrow light">CONCEPTION & CAPACITÉS</div><h2>Une architecture pensée<br/>par responsabilités.</h2></div><p>Chaque moteur possède une mission précise. Les échanges sont organisés autour de contrats explicites et de contrôles dédiés. Voici les grands principes du projet.</p></div>
     <div className="feature-grid">{details.map(d=><article className="feature-card" key={d.number}><span className="feature-number">{d.number}</span><div className="feature-icon"><d.icon size={23} strokeWidth={1.6}/></div><h3>{d.title}</h3><p>{d.body}</p></article>)}</div>
   </section>
   <section className="capability-section" aria-labelledby="capabilities-heading">
    <div className="capability-intro"><div className="eyebrow light">PARCOURS DE LA PLATEFORME</div><h2 id="capabilities-heading">Du marché à la décision.<br/><span>Des rôles toujours identifiables.</span></h2>
      <p>Quatre points de vue pour découvrir le projet complet sans noyer le visiteur dans les détails de son infrastructure.</p>
    </div>
    <div className="capability-shell">
      <div className="capability-tabs" role="tablist" aria-label="Explorer les domaines IA-TB">{capabilities.map(c=>
        <button key={c.id} id={'tab-'+c.id} role="tab" aria-controls="capability-panel" aria-selected={capability===c.id} className={capability===c.id?'active':''} onClick={()=>setCapability(c.id)}>
         <small>{c.index}</small><strong>{c.title}</strong><span>{c.area}</span><ChevronRight size={15}/></button>)}</div>
      <div className="capability-content" id="capability-panel" role="tabpanel" aria-labelledby={'tab-'+capability}>
       {capabilities.filter(c=>c.id===capability).map(c=><div key={c.id}>
        <div className={'capability-mark '+c.accent}><Layers3 size={25}/><span>SYSTÈME {c.index} / 04</span></div>
        <h3>{c.area}</h3><p>{c.summary}</p>
        <div className="capability-label">COMPOSANTS IMPLIQUÉS</div><div className="capability-engines">{c.engines.map(e=><span key={e}><Box size={12}/>{e}</span>)}</div>
        <div className="capability-label">CAPACITÉS DOCUMENTÉES</div><div className="capability-facts">{c.facts.map(f=><div key={f}><CheckCircle2 size={15}/>{f}</div>)}</div>
       </div>)}
       <button className="capability-map-link" onClick={()=>navigate('map')}>Voir les interconnexions dans l'Atlas <ArrowUpRight size={16}/></button>
      </div>
    </div>
   </section>
   <section className="diagram-section">
    <div className="diagram-intro"><div><div className="eyebrow light">VISUALISATION DU SYSTÈME</div><h2>Explorer, plutôt que déchiffrer.</h2><p>Une carte claire pour une première lecture. En plein écran, chaque système dévoile ses modules, ses connexions et son rôle.</p></div>
    <button className="diagram-open" onClick={()=>navigate('map')}>Ouvrir l'explorateur <ArrowUpRight size={18}/></button></div>
    <ArchitectureGraph model={model} setModel={setModel} preview onToggleFull={()=>{setPage('map');setFull(true)}} editorEnabled={false}/>
   </section>
   <section className="trust-section">
    <div className="trust-icon"><LockKeyhole size={28}/></div><div><div className="eyebrow light">VISITEURS & EXPLOITATION</div><h2>La démonstration, pas l'administration.</h2><p>Cette présentation publique explique les composants et leurs relations sans exposer la configuration interne du serveur, les secrets, les autorisations ni les états de trading. Les outils de développement et de publication appartiennent à un espace privé distinct.</p></div>
   </section>
  </main>}
  {page==='map'&&<main className="map-page">
    {!full&&<div className="map-page-head"><div><button className="back-link" onClick={()=>navigate('home')}><ArrowLeft size={15}/> Présentation</button><div className="eyebrow light">ATLAS V3 · EXPLORATION</div><h1>Carte du système IA-TB</h1><p>Les composants sont regroupés par responsabilité. Sélectionnez un système, découvrez ses modules et examinez les routes en détail.</p></div></div>}
    <ArchitectureGraph model={model} setModel={setModel} full={full} onToggleFull={()=>setFull(v=>!v)} editorEnabled={editorEnabled}/>
   </main>}
  <footer className="site-footer"><div><AtlasLogo/><div><strong>IA-TB / Architecture Atlas</strong><small>Présentation technique de l'architecture logicielle</small></div></div>
   <span>Prototype documenté · fonctionnalités et statuts à qualifier avant toute offre commerciale.</span></footer>
 </div>
}
