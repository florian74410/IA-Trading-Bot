(function(){'use strict';
function icon(name){
 var p={
  bank:'<path d="m12 3 8 4H4l8-4Z"/><path d="M5 9h14M6.5 9v7M10 9v7M14 9v7M17.5 9v7M4 18h16M3 21h18"/>',
  home:'<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  account:'<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20c.7-4.2 2.9-6.3 6.5-6.3s5.8 2.1 6.5 6.3"/>',
  wallet:'<path d="M5 6h13a3 3 0 0 1 3 3v9H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h11v2"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z"/>',
  ledger:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h6M9 19h4"/>',
  key:'<circle cx="8" cy="13" r="4"/><path d="m11 10 8-8M15 6l3 3M17 4l3 3"/>',
  vault:'<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M12 8v8M8 12h8"/>',
  loan:'<path d="M4 8h16v11H4Z"/><path d="M7 8V5h10v3M7 12h5M7 15h8"/><circle cx="17" cy="14.5" r="1.5"/>',
  swap:'<path d="M4 8h13l-3-3M20 16H7l3 3"/><path d="m17 8-3 3M7 16l3-3"/>',
  stats:'<path d="M4 20V11h4v9M10 20V5h4v15M16 20V8h4v12"/><path d="M3 20h18"/>',
  fundamental:'<path d="M6 3h9l4 4v14H6Z"/><path d="M15 3v5h5M9 11h7M9 15h7M9 19h5"/>',
  news:'<path d="M5 4h12v16H5Z"/><path d="M17 8h3v12h-3M8 8h6M8 12h6M8 16h4"/>',
  source:'<ellipse cx="12" cy="6" rx="6" ry="3"/><path d="M6 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3V6M6 12v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6"/>',
  ai:'<rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="11" r="1"/><path d="M9 15c2 1.4 4 1.4 6 0M12 2v3M12 19v3"/>',
  collector:'<path d="M4 5h16M6 9h12M8 13h8M10 17h4"/><path d="M12 17v4"/>',
  diagnostic:'<circle cx="11" cy="11" r="6"/><path d="m16 16 5 5M8 11h6M11 8v6"/>',
  logs:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12h3M2 12h3M12 2v3M12 19v3M17 7l2-2M5 19l2-2M17 17l2 2M5 5l2 2"/>',
  security:'<path d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6Z"/><path d="m9 12 2 2 4-5"/>',
  data:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.8 3.1 3 7 3s7-1.2 7-3V6M5 12v6c0 1.8 3.1 3 7 3s7-1.2 7-3v-6"/>',
  strategy:'<path d="M4 18 9 8l4 5 7-9"/><path d="M16 4h4v4"/><circle cx="4" cy="18" r="1.5"/>',
  risk:'<path d="M12 3 20 20H4Z"/><path d="M12 9v5M12 17h.01"/>',
  liquidity:'<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z"/><path d="M9 15c1 2 4 2 6 0"/>',
  portfolio:'<path d="M12 3v9h9A9 9 0 1 1 12 3Z"/><path d="M15 3.7A8 8 0 0 1 20.3 9H15Z"/>',
  chart:'<path d="M4 20V5M4 20h16"/><path d="m7 16 4-5 3 2 5-7"/>',
  notification:'<path d="M6 17h12l-2-3V10a4 4 0 0 0-8 0v4Z"/><path d="M10 20h4"/>',
  version:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
  console:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12 15h5"/>',
  firewall:'<path d="M4 6h16v12H4Z"/><path d="M8 6v4h4V6M12 10v4h4v4M4 14h4v4"/>',
  process:'<circle cx="7" cy="12" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="m10 11 4-3M10 13l4 3"/>',
  maintenance:'<path d="m4 20 7-7M14 5l5 5M13 6l5 5M10 14l-3-3"/><path d="M15 4 20 9"/>',
  updates:'<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 20h14"/>',
  project:'<path d="M4 5h6l2 2h8v12H4Z"/><path d="M8 11h8M8 15h5"/>',
  restart:'<path d="M19 8a8 8 0 1 0 1 7"/><path d="M19 3v5h-5"/>',
  backtest:'<path d="M4 18h16M6 15l3-4 3 2 5-7"/><path d="M17 6h3v3"/>',
  import:'<path d="M12 4v11M8 8l4-4 4 4"/><path d="M5 20h14"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.6 2.6 0 1 1 4.4 1.9c-1.2 1-2 1.4-2 3M12 17.5h.01"/>',
  server:'<rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/>',
  cefi:'<path d="M3 9h18L12 4Z"/><path d="M5 11v7M9 11v7M15 11v7M19 11v7M3 20h18"/>',
  defi:'<circle cx="12" cy="12" r="3"/><circle cx="5" cy="7" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><path d="m7 8 3 2M17 8l-3 2M7 16l3-2M17 16l-3-2"/>'
 }[name]||'<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>';
 return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</g></svg>';
}
function item(label,ico,opts){opts=opts||{};return{label:label,icon:ico||'data',href:opts.href||'',selector:opts.selector||'',sourceList:opts.sourceList||'',sourceIndex:opts.sourceIndex,active:opts.active||'',arrow:opts.arrow===true,danger:opts.danger===true};}
function group(label,ico,items){return{label:label,icon:ico||'data',items:items||[]};}
function bankConfig(){
 var h=location.hash,p=location.pathname,active=p.indexOf('/statistiques')===0?'stats':h==='#wallets'?'wallets':h==='#accounting'?'accounting':h==='#keys'?'keys':h.indexOf('#vault')===0?'vault':h==='#loans'?'loans':h==='#swap'?'swap':h==='#help'?'help':'home';
 return{key:'bank',title:'BANQUE',icon:'bank',active:active,items:[
  item('Accueil','home',{href:'/bank',active:'home'}),
  group('Comptes Personnelle','account',[
   item('Mes Portefeuilles','wallet',{href:'/bank#wallets',active:'wallets'}),
   item('Ma Comptabilités','ledger',{href:'/bank#accounting',active:'accounting'}),
   item('Mes Clés','key',{href:'/bank#keys',active:'keys'})
  ]),
  item('Coffres Forts','vault',{href:'/bank#vault-personal',active:'vault',arrow:true}),
  item('Prets','loan',{href:'/bank#loans',active:'loans',arrow:true}),
  item('Swap et Bridges','swap',{href:'/bank#swap',active:'swap',arrow:true}),
  item('Aide & Support','help',{href:'/bank#help',active:'help'})
 ]};
}
function statsConfig(){
 var h=String(location.hash||'#server').toLowerCase(),active=h==='#cefi'?'cefi':h==='#defi'?'defi':'server';
 return{key:'stats',title:'STATISTIQUES',icon:'stats',active:active,items:[
  item('Serveur / Réseaux','server',{href:'/statistiques#server',active:'server'}),
  item('CeFi','cefi',{href:'/statistiques#cefi',active:'cefi'}),
  item('DeFi','defi',{href:'/statistiques#defi',active:'defi'})
 ]};
}
function fundamentalConfig(){return{key:'fundamental',title:'FONDAMENTAL',icon:'fundamental',sourceRoot:'.fundSidebar',items:[
 item("Vue d'ensemble",'home',{selector:'.fundSidebar button[data-view="overview"]'}),
 item('News & Événements','news',{selector:'.fundSidebar button[data-view="news"]'}),
 item('Analyse IA','ai',{selector:'.fundSidebar button[data-view="ai"]'}),
 item('Sources & Providers','source',{selector:'.fundSidebar button[data-view="sources"]'}),
 item('Source Manager','settings',{selector:'.fundSidebar button[data-view="source-manager"]'}),
 item('Fundamental Console','console',{selector:'.fundSidebar button[data-view="console"]'})
]};}
function settingsConfig(){return{key:'settings',title:'PARAMÈTRES',icon:'settings',sourceRoot:'.settingsSectionBar',items:[
 item("Vue d'ensemble",'home',{selector:'#nav button[data-view="overview"]'}),
 group('Compte & Sécurité','account',[
  item('Profile','account',{selector:'#nav button[data-view="profile"]'}),
  item('Sécurité','security',{selector:'#nav button[data-view="security"]'}),
  item('API & Data','data',{selector:'#nav button[data-view="api"]'}),
  item('Crédits / Tokens','credits',{selector:'#nav button[data-view="credits"]'})
 ]),
 group('Moteurs IA & Trading','ai',[
  item('IA','ai',{selector:'#nav button[data-view="ai"]'}),
  item('Fundamental','fundamental',{selector:'#nav button[data-view="fundamental"]'}),
  item('Indicateurs','chart',{selector:'#nav button[data-view="indicators"]'}),
  item('Stratégie','strategy',{selector:'#nav button[data-view="strategy"]'}),
  item('Trading','chart',{selector:'#nav button[data-view="trading"]'}),
  item('Risk Manager','risk',{selector:'#nav button[data-view="risk"]'}),
  item('Liquidité','liquidity',{selector:'#nav button[data-view="liquidity"]'}),
  item('Portfolio','portfolio',{selector:'#nav button[data-view="portfolio"]'})
 ]),
 group('Données & Système','data',[
  item('Collecteur','collector',{selector:'#nav button[data-view="collector"]'}),
  item('Providers','source',{selector:'#nav button[data-view="providers"]'}),
  item('CoinGecko','stats',{selector:'#nav button[data-view="coingecko"]'}),
  item('Registry','project',{selector:'#nav button[data-view="registry"]'}),
  item('Communication','communication',{selector:'#nav button[data-view="communication"]'}),
  item('Mosaïque','data',{selector:'#nav button[data-view="mosaic"]'}),
  item('Graphique','chart',{selector:'#nav button[data-view="chart"]'}),
  item('Notifications','notification',{selector:'#nav button[data-view="notifications"]'}),
  item('Versions','version',{selector:'#nav button[data-view="versions"]'})
 ])
]};}
function strategyConfig(){return{key:'strategy',title:'STRATÉGIES',icon:'strategy',sourceRoot:'.strategySide',items:[
 item("Vue d'ensemble",'home',{sourceList:'.strategySideNav button',sourceIndex:0}),
 group('Stratégies','strategy',[
  item('Catalogue des stratégies','project',{sourceList:'.strategySideNav button',sourceIndex:1}),
  item('Instance active','process',{sourceList:'.strategySideNav button',sourceIndex:2}),
  item('Indicateurs & signaux','chart',{sourceList:'.strategySideNav button',sourceIndex:3})
 ]),
 group('Recherche & Risque','risk',[
  item('Backtest','backtest',{sourceList:'.strategySideNav button',sourceIndex:4}),
  item('Optimisation','ai',{sourceList:'.strategySideNav button',sourceIndex:5}),
  item('Gestion des risques','risk',{sourceList:'.strategySideNav button',sourceIndex:6})
 ]),
 group('Historique & Outils','logs',[
  item('Historique des trades','ledger',{sourceList:'.strategySideNav button',sourceIndex:7}),
  item('Imports / Exports','import',{sourceList:'.strategySideNav button',sourceIndex:8}),
  item('Diagnostics','diagnostic',{sourceList:'.strategySideNav button',sourceIndex:9}),
  item('Logs','logs',{sourceList:'.strategySideNav button',sourceIndex:10})
 ])
]};}
function adminConfig(){return{key:'admin',title:'ADMIN',icon:'console',sourceRoot:'.adminSidebar',items:[
 item('Console','console',{selector:'#adminSectionNav .sideLink[data-target="console"]'}),
 group('Administration','settings',[
  item('Firewall','firewall',{selector:'#adminSectionNav .sideLink[data-target="firewall"]'}),
  item('Processus','process',{selector:'#adminSectionNav .sideLink[data-target="processus"]'}),
  item('Engines & Services','settings',{selector:'#adminSectionNav .sideLink[data-target="engines"]'}),
  item('Maintenance','maintenance',{selector:'#adminSectionNav .sideLink[data-target="maintenance"]'}),
  item('Diagnostics','diagnostic',{selector:'#adminSectionNav .sideLink[data-target="diagnostics"]'}),
  item('Mises à jour','updates',{selector:'#adminSectionNav .sideLink[data-target="updates"]'}),
  item('Project Explorer','project',{selector:'#adminSectionNav .sideLink[data-target="project-explorer"]'})
 ]),
 group('Application','project',[
  item('Trading IA','chart',{href:'/ia-trading'}),
  item('Chart Viewer','chart',{href:'/chart-viewer'}),
  item('Portfolio','portfolio',{href:'/portfolio'}),
  item('Banque','bank',{href:'/bank'}),
  item('Vault Creator','vault',{href:'/admin/vaults'}),
  item('Fondamental','fundamental',{href:'/fundamental'})
 ]),
 item('Redémarrer IA-TB','restart',{selector:'#restartAllSide',danger:true})
]};}
function config(){
 var p=location.pathname;
 if(p.indexOf('/statistiques')===0)return statsConfig();
 if(p.indexOf('/bank')===0)return bankConfig();
 if(p.indexOf('/fundamental')===0)return fundamentalConfig();
 if(p.indexOf('/settings')===0)return settingsConfig();
 if(p.indexOf('/strategy')===0)return strategyConfig();
 if(p==='/admin'||p==='/admin/')return null;
 return null;
}
function sourceNode(x){
 if(x.selector)return document.querySelector(x.selector);
 if(x.sourceList&&x.sourceIndex!=null)return document.querySelectorAll(x.sourceList)[x.sourceIndex]||null;
 return null;
}
function renderItem(x,cfg){
 var src=sourceNode(x),active=(x.active&&cfg.active===x.active)||(!x.href&&src&&src.classList.contains('active')),tag=x.href?'a':'button',attrs=x.href?' href="'+x.href+'"':' type="button" data-iatb-proxy="1"';
 return '<'+tag+attrs+' class="iatb-side-link'+(active?' active':'')+(x.danger?' danger':'')+'" data-iatb-label="'+String(x.label).replace(/"/g,'&quot;')+'"><span class="iatb-side-icon">'+icon(x.icon)+'</span><span class="iatb-side-label">'+x.label+'</span>'+(x.arrow?'<i>›</i>':'')+'</'+tag+'>';
}
function renderGroup(g,cfg){
 var collapsible=cfg&&cfg.key==='settings',label=String(g.label||'').replace(/"/g,'&quot;');
 return '<div class="iatb-side-group'+(collapsible?' iatb-collapsible-group':'')+'" data-iatb-group="'+label+'">'+
  (collapsible?'<button type="button" class="iatb-side-group-title" aria-expanded="true" data-iatb-group-toggle="'+label+'">':'<div class="iatb-side-group-title">')+
  '<span class="iatb-side-icon">'+icon(g.icon)+'</span><span class="iatb-side-label">'+g.label+'</span><i>›</i>'+
  (collapsible?'</button>':'</div>')+
  '<div class="iatb-side-group-items">'+g.items.map(function(x){return renderItem(x,cfg);}).join('')+'</div></div>';
}
function markup(cfg){return '<div class="iatb-side-title"><span class="iatb-side-icon titleIcon">'+icon(cfg.icon)+'</span><b>'+cfg.title+'</b></div><nav class="iatb-side-nav" aria-label="Navigation latérale '+cfg.title+'">'+cfg.items.map(function(x){return x.items?renderGroup(x,cfg):renderItem(x,cfg);}).join('')+'</nav>';}
function allItems(cfg){var a=[];cfg.items.forEach(function(x){if(x.items)a=a.concat(x.items);else a.push(x);});return a;}
function bind(a,cfg){
 var items=allItems(cfg),buttons=[].slice.call(a.querySelectorAll('[data-iatb-proxy="1"]'));
 buttons.forEach(function(btn){
  var label=btn.getAttribute('data-iatb-label'),x=items.filter(function(it){return it.label===label&&!it.href;})[0];
  btn.onclick=function(){
    if(cfg.key==='fundamental'&&x&&x.selector){
      var m=String(x.selector).match(/data-view=["']([^"']+)["']/);
      if(m&&m[1]){window.dispatchEvent(new CustomEvent('iatb-fund-view',{detail:{view:m[1]}}));setTimeout(function(){sync(a,cfg)},0);return;}
    }
    var src=x&&sourceNode(x);if(src&&typeof src.click==='function'){src.click();sync(a,cfg);}
   };
 });
 if(cfg.key==='settings'){
  var toggles=[].slice.call(a.querySelectorAll('[data-iatb-group-toggle]'));
  toggles.forEach(function(t){
   var group=t.closest?t.closest('.iatb-side-group'):t.parentNode,label=t.getAttribute('data-iatb-group-toggle')||'',key='iatb.settings.group.'+label,collapsed=false;
   try{collapsed=sessionStorage.getItem(key)==='0';}catch(e){}
   function apply(open){group.classList.toggle('collapsed',!open);t.setAttribute('aria-expanded',open?'true':'false');}
   apply(!collapsed);
   t.onclick=function(){
    var open=t.getAttribute('aria-expanded')!=='true';
    apply(open);
    try{sessionStorage.setItem(key,open?'1':'0');}catch(e){}
   };
  });
 }
}
function sync(a,cfg){
 var items=allItems(cfg),links=[].slice.call(a.querySelectorAll('.iatb-side-link'));
 links.forEach(function(link){
  var label=link.getAttribute('data-iatb-label'),x=items.filter(function(it){return it.label===label;})[0],src=x&&sourceNode(x),on=!!(x&&x.active&&cfg.active===x.active)||!!(src&&src.classList.contains('active'));
  link.classList.toggle('active',on);
 });
}
function hideLegacy(cfg){if(!cfg.sourceRoot)return;var n=document.querySelector(cfg.sourceRoot);if(n)n.classList.add('iatb-side-source-hidden');}
function mount(){
 var cfg=config();if(!cfg)return;
 if(document.getElementById('iatb-global-side'))return;
 hideLegacy(cfg);
 var a=document.createElement('aside');a.id='iatb-global-side';a.setAttribute('data-page',cfg.key);a.innerHTML=markup(cfg);
 var spacer=document.getElementById('iatb-global-nav-spacer');
 if(spacer&&spacer.parentNode)spacer.parentNode.insertBefore(a,spacer.nextSibling);else document.body.insertBefore(a,document.body.firstChild);
 document.body.classList.remove('iatb-no-bank-side');document.body.classList.add('iatb-global-side-ready','iatb-unified-sidebar');
 bind(a,cfg);sync(a,cfg);
 if(cfg.sourceRoot){var root=document.querySelector(cfg.sourceRoot);if(root&&window.MutationObserver){new MutationObserver(function(){sync(a,cfg);}).observe(root,{attributes:true,subtree:true,attributeFilter:['class']});}}
 window.addEventListener('hashchange',function(){if(cfg.key==='bank'||cfg.key==='stats'){var next=cfg.key==='stats'?statsConfig():bankConfig();a.innerHTML=markup(next);bind(a,next);sync(a,next);}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();