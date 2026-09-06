(function(){
'use strict';
var NAV_ID='iatbGlobalNav';
var mounted=false;
function qs(s){return document.querySelector(s);}
function byId(id){return document.getElementById(id);}
function path(){return String(location.pathname||'/').replace(/\/+$/,'')||'/';}
function pageName(){var p=path();if(p==='/portfolio')return'portfolio';if(p==='/fundamental')return'fundamental';if(p==='/chart-viewer'||p==='/charts')return'chart';if(p==='/settings')return'settings';if(p==='/strategy'||p==='/strategies')return'strategies';if(p==='/admin')return'admin';return'trading';}
function activeName(){var p=pageName(),h=String(location.hash||'').toLowerCase();if(p==='trading'&&h==='#settings')return'settings';if(p==='trading'&&h==='#strategies')return'strategies';return p;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function navHTML(){return '<div class="iatbGlobalInner">'+
 '<a class="iatbGlobalBrand" href="/ia-trading" title="IA-TB · IA Trading Bot"><img src="/assets/ia_tb_logo_v1.7.2.png" alt="IA-TB"></a>'+
 '<nav class="iatbGlobalLinks" aria-label="Navigation principale IA-TB">'+
  '<a data-iatb-page="trading" href="/ia-trading">Trading IA</a>'+
  '<a data-iatb-page="chart" href="/chart-viewer">Chart Viewer</a>'+
  '<a data-iatb-page="portfolio" href="/portfolio">Portfolio</a>'+
  '<a data-iatb-page="fundamental" href="/fundamental">Fondamental</a>'+
  '<a data-iatb-page="settings" href="/settings">Paramètres</a>'+
  '<a data-iatb-page="strategies" href="/strategy">Stratégies</a>'+
 '</nav>'+
 '<div class="iatbGlobalRight">'+
  '<a class="iatbWalletLink" data-iatb-action="wallet" href="/ia-trading#wallet">↕&nbsp; Connecter Trust Wallet</a>'+
  '<a class="iatbAdminLink" data-iatb-page="admin" href="/admin">⚒&nbsp; ADMIN</a>'+
  '<span class="iatbGlobalStatus" title="Interface IA-TB active"><i></i></span>'+
 '</div></div>';}
function markActive(){var a=activeName(),links=document.querySelectorAll('#'+NAV_ID+' [data-iatb-page]');for(var i=0;i<links.length;i++){links[i].classList.toggle('active',links[i].getAttribute('data-iatb-page')===a);}}
function invokeLocal(action){var id=action==='settings'?'settingsBtn':action==='strategies'?'strategyBtn':action==='wallet'?'walletConnect':'';var el=id&&byId(id);if(el&&typeof el.click==='function'){el.click();return true;}return false;}
function handleClick(e){var a=e.target.closest?e.target.closest('a'):null;if(!a||!a.closest('#'+NAV_ID))return;var act=a.getAttribute('data-iatb-action');if(act==='wallet'){if(pageName()==='trading'){e.preventDefault();location.hash='wallet';invokeLocal('wallet');}return;}}
function openHashTarget(){var pg=pageName(),h=String(location.hash||'').toLowerCase();if(pg==='settings')invokeLocal('settings');else if(pg==='strategies')invokeLocal('strategies');else if(pg==='trading'){if(h==='#settings')invokeLocal('settings');else if(h==='#strategies')invokeLocal('strategies');else if(h==='#wallet')invokeLocal('wallet');}markActive();}
function watchTradingOverlays(){if(['trading','settings','strategies'].indexOf(pageName())<0||!window.MutationObserver)return;var settings=byId('settingsPage'),strategies=byId('strategyPage');function update(){if(settings&&!settings.classList.contains('hide')){history.replaceState(null,'','#settings');}else if(strategies&&!strategies.classList.contains('hide')){history.replaceState(null,'','#strategies');}else if(location.hash==='#settings'||location.hash==='#strategies'){history.replaceState(null,'',location.pathname);}markActive();}var mo=new MutationObserver(update);if(settings)mo.observe(settings,{attributes:true,attributeFilter:['class']});if(strategies)mo.observe(strategies,{attributes:true,attributeFilter:['class']});}
function mount(role){if(mounted)return;mounted=true;var n=document.createElement('header');n.id=NAV_ID;n.setAttribute('role','banner');n.innerHTML=navHTML();document.body.insertBefore(n,document.body.firstChild);document.body.classList.add('iatb-global-nav-ready','iatb-page-'+pageName());var admin=qs('#'+NAV_ID+' .iatbAdminLink');if(admin&&String(role||'').toUpperCase()!=='ADMIN'&&pageName()!=='admin')admin.classList.add('iatbNavHidden');markActive();document.addEventListener('click',handleClick,false);window.addEventListener('hashchange',function(){openHashTarget();markActive();},false);setTimeout(function(){openHashTarget();watchTradingOverlays();},80);}
function tryBootstrap(){fetch('/api/bootstrap',{credentials:'same-origin',cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('bootstrap '+r.status);return r.json();}).then(function(b){if(b&&b.authenticated)mount(b.role||'');}).catch(function(){});}
function observeLogin(){var app=byId('app');if(!app||!window.MutationObserver)return;var mo=new MutationObserver(function(){if(!app.classList.contains('hide')){tryBootstrap();}});mo.observe(app,{attributes:true,attributeFilter:['class']});}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){tryBootstrap();observeLogin();});}else{tryBootstrap();observeLogin();}
})();
