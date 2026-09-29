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
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.6 2.6 0 1 1 4.4 1.9c-1.2 1-2 1.4-2 3M12 17.5h.01"/>'
 }[name]||'';
 return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</g></svg>';
}
function active(){
 var p=location.pathname,h=location.hash;
 if(p.indexOf('/statistiques')===0)return'stats';
 if(p.indexOf('/keys')===0||p.indexOf('/bank/keys')===0)return'keys';
 if(p.indexOf('/bank')===0){
  if(h==='#wallets')return'wallets';
  if(h==='#accounting')return'accounting';
  if(h==='#keys')return'keys';
  if(h.indexOf('#vault')===0)return'vault';
  if(h==='#loans')return'loans';
  if(h==='#swap')return'swap';
  return'home';
 }
 return'';
}
function link(key,href,label,ico,arrow){
 return '<a class="iatb-side-link '+(active()===key?'active':'')+'" href="'+href+'"><span class="iatb-side-icon">'+icon(ico)+'</span><span class="iatb-side-label">'+label+'</span>'+(arrow?'<i>›</i>':'')+'</a>';
}
function markup(){
 return '<div class="iatb-side-title"><span class="iatb-side-icon titleIcon">'+icon('bank')+'</span><b>BANQUE</b></div>'+
 '<nav class="iatb-side-nav" aria-label="Navigation latérale IA-TB">'+
 link('home','/bank','Accueil','home')+
 '<div class="iatb-side-group"><div class="iatb-side-group-title"><span class="iatb-side-icon">'+icon('account')+'</span><span class="iatb-side-label">Comptes Personnelle</span><i>›</i></div>'+
 link('wallets','/bank#wallets','Mes Portefeuilles','wallet')+
 link('accounting','/bank#accounting','Ma Comptabilités','ledger')+
 link('keys','/bank#keys','Mes Clés','key')+'</div>'+
 link('vault','/bank#vault-personal','Coffres Forts','vault',true)+
 link('loans','/bank#loans','Prets','loan',true)+
 link('swap','/bank#swap','Swap et Bridges','swap',true)+
 link('stats','/statistiques','Statistiques','stats')+
 link('help','/admin','Aide & Support','help')+
 '</nav>';
}
function mount(){
 if(location.pathname.indexOf('/bank')!==0)return;
 if(document.getElementById('iatb-global-side'))return;
 var a=document.createElement('aside');a.id='iatb-global-side';a.innerHTML=markup();
 var spacer=document.getElementById('iatb-global-nav-spacer');
 if(spacer&&spacer.parentNode)spacer.parentNode.insertBefore(a,spacer.nextSibling);else document.body.insertBefore(a,document.body.firstChild);
 document.body.classList.add('iatb-global-side-ready');
 window.addEventListener('hashchange',function(){var old=document.getElementById('iatb-global-side');if(old)old.innerHTML=markup();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();