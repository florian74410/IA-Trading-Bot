(function(){'use strict';
var state={
 exchanges:[
  {id:'binance',name:'Binance',icon:'◆',brand:'binance',status:'En ligne',latency:8,liquidity:'Très élevée',api:'API OK'},
  {id:'coinbase',name:'Coinbase',icon:'C',brand:'coinbase',status:'En ligne',latency:12,liquidity:'Élevée',api:'API OK'},
  {id:'kraken',name:'Kraken',icon:'K',brand:'kraken',status:'En ligne',latency:18,liquidity:'Élevée',api:'API OK'},
  {id:'okx',name:'OKX',icon:'✣',brand:'okx',status:'En ligne',latency:15,liquidity:'Moyenne',api:'API OK'},
  {id:'gmx',name:'GMX (DEX)',icon:'▲',brand:'gmx',status:'Dégradé',latency:22,liquidity:'Moyenne',api:'API OK'}
 ],
 oracles:[
  {id:'chainlink',name:'Chainlink',icon:'⬡',brand:'chainlink',status:'En ligne',latency:3,uptime:99.98},
  {id:'pyth',name:'Pyth Network',icon:'P',brand:'pyth',status:'En ligne',latency:7,uptime:99.95},
  {id:'gmxoracle',name:'GMX Oracle',icon:'▲',brand:'gmx',status:'En ligne',latency:12,uptime:99.90},
  {id:'arbitrum',name:'Arbitrum Bridge',icon:'A',brand:'arbitrum',status:'En ligne',latency:18,uptime:99.92}
 ],
 engines:{router:5,market:3,indicator:7,strategy:9,trading:6,risk:4,portfolio:8,fundamental:12,supervisor:6,ui:3},
 summary:[
  {icon:'⇄',value:'5',label:'Exchanges suivis'},
  {icon:'⚙',value:'9',label:'Engines actifs'},
  {icon:'⛓',value:'4',label:'Oracles surveillés'},
  {icon:'↔',value:'2',label:'Bridges actifs'},
  {icon:'◔',value:'11 ms',label:'Temps moyen API'},
  {icon:'◷',value:'99.96%',label:'Uptime global',good:true}
 ],
 cefi:{
  shares:[['Binance',34],['OKX',22],['Coinbase',18],['Kraken',14],['Autres',12]],
  volume:[38,44,52,48,46,43,41,39,42,47,58,66,72,81,76,69,63,59,55,51,48,46,44,43],
  exchanges:[
   {name:'Binance',volume:'29,3 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}

function barChart(values,klass){
 var w=760,h=210,pad=22,max=Math.max.apply(Math,values.concat([1])),bw=(w-pad*2)/values.length*.64,out='',grid='';
 for(var g=0;g<5;g++){var y=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+y+'" x2="'+(w-pad)+'" y2="'+y+'"/>'}
 values.forEach(function(v,i){var x=pad+i*((w-pad*2)/values.length)+(w-pad*2)/values.length*.18,bh=(v/max)*(h-pad*2),y=h-pad-bh;out+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="2"/>'});
 return'<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="financeGrid">'+grid+'</g><g class="financeBars '+klass+'">'+out+'</g></svg>';
}
function legendHtml(items){
 return items.map(function(x,i){return'<div class="financeLegendRow"><i class="legendDot d'+i+'"></i><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'%</b></div>'}).join('');
}
function financeTable(rows){
 return rows.map(function(x){return'<div class="financeTableRow"><div><b>'+esc(x.name)+'</b><small>'+esc(x.status)+'</small></div><span>'+esc(x.volume)+'</span><span>'+esc(x.share)+'</span><span>'+esc(x.liquidity)+'</span></div>'}).join('');
}
function assetBars(rows,tone){
 return rows.map(function(x){return'<div class="assetBarRow"><div><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></div><div class="assetBar"><i class="'+tone+'" style="width:'+Math.max(4,Math.min(100,+x[2]||0))+'%"></i></div></div>'}).join('');
}
function healthGrid(rows){
 return rows.map(function(x){return'<div class="marketHealthCell '+esc(x[2])+'"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b></div>'}).join('');
}
function stableFlow(){
 var d=state.defi,w=620,h=180,p=20,max=Math.max.apply(Math,d.stableIn.concat(d.stableOut).concat([1])),step=(w-p*2)/d.stableIn.length,bars='';
 d.stableIn.forEach(function(v,i){var inH=(v/max)*(h/2-24),outH=(d.stableOut[i]/max)*(h/2-24),x=p+i*step+step*.18,bw=step*.28;bars+='<rect class="stableIn" x="'+x.toFixed(1)+'" y="'+(h/2-inH).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+inH.toFixed(1)+'"/><rect class="stableOut" x="'+(x+bw+2).toFixed(1)+'" y="'+(h/2).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+outH.toFixed(1)+'"/>'});
 return'<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><line class="stableAxis" x1="'+p+'" y1="'+(h/2)+'" x2="'+(w-p)+'" y2="'+(h/2)+'"/>'+bars+'</svg><div class="stableLegend"><span><i class="in"></i>Entrées</span><span><i class="out"></i>Sorties</span></div>';
}
function renderFinance(){
 var h=q('#cefiVolumeChart');if(h)h.innerHTML=barChart(state.cefi.volume,'cefi');
 var d=q('#defiVolumeChart');if(d)d.innerHTML=barChart(state.defi.volume,'defi');
 var l=q('#cefiShareLegend');if(l)l.innerHTML=legendHtml(state.cefi.shares);
 var dl=q('#defiShareLegend');if(dl)dl.innerHTML=legendHtml(state.defi.shares);
 var t=q('#cefiExchangeTable');if(t)t.innerHTML=financeTable(state.cefi.exchanges);
 var pt=q('#defiProtocolTable');if(pt)pt.innerHTML=financeTable(state.defi.protocols);
 var av=q('#cefiAssetVolumes');if(av)av.innerHTML=assetBars(state.cefi.assets,'cefi');
 var nw=q('#defiNetworks');if(nw)nw.innerHTML=assetBars(state.defi.networks,'defi');
 var hg=q('#cefiHealth');if(hg)hg.innerHTML=healthGrid(state.cefi.health);
 var sf=q('#defiStableFlow');if(sf)sf.innerHTML=stableFlow();
}
function currentSection(){var h=String(location.hash||'#server').toLowerCase();return h==='#cefi'?'cefi':h==='#defi'?'defi':'server'}
function showSection(name){
 name=name||currentSection();
 qa('[data-stats-section]').forEach(function(n){n.classList.toggle('active',n.getAttribute('data-stats-section')===name)});
 qa('[data-stats-nav]').forEach(function(n){n.classList.toggle('active',n.getAttribute('data-stats-nav')===name)});
 document.body.setAttribute('data-stats-view',name);
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 if(data.cefi)state.cefi=data.cefi;
 if(data.defi)state.defi=data.defi;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption();renderFinance();showSection()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
 qa('.financeRanges button').forEach(function(b){b.onclick=function(){var p=b.parentNode;qa('button',p).forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
 window.addEventListener('hashchange',function(){showSection()});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,share:'34%',liquidity:'Très élevée',status:'En ligne'},
   {name:'OKX',volume:'19,0 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,share:'22%',liquidity:'Très élevée',status:'En ligne'},
   {name:'Coinbase',volume:'15,5 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,share:'18%',liquidity:'Élevée',status:'En ligne'},
   {name:'Kraken',volume:'12,1 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,share:'14%',liquidity:'Élevée',status:'En ligne'}
  ],
  assets:[['BTC','31,8 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,92],['ETH','22,4 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,74],['USDT','18,7 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,63],['SOL','8,1 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,37],['BNB','5,3 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,27]],
  health:[['Liquidité globale','Très élevée','good'],['Spread moyen','0,08 %','good'],['Volatilité 24h','Moyenne','warn'],['Disponibilité API','99,97 %','good']]
 },
 defi:{
  shares:[['Lending',29],['DEX',24],['Liquid Staking',19],['Perps',13],['Autres',15]],
  volume:[9,11,10,12,15,14,13,12,14,16,18,21,19,17,16,20,24,27,23,20,19,17,15,14],
  protocols:[
   {name:'Uniswap',volume:'3,8 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,share:'30%',liquidity:'Élevée',status:'En ligne'},
   {name:'Aave',volume:'2,4 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,share:'19%',liquidity:'Élevée',status:'En ligne'},
   {name:'Curve',volume:'1,9 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,share:'15%',liquidity:'Élevée',status:'En ligne'},
   {name:'GMX',volume:'1,4 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,share:'11%',liquidity:'Moyenne',status:'En ligne'}
  ],
  stableIn:[6,8,11,7,10,14,9,13,16,12,18,15],
  stableOut:[5,6,7,9,8,10,12,8,11,9,13,10],
  networks:[['Ethereum','41,2 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,100],['Arbitrum','12,8 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,62],['Base','10,6 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,52],['Solana','9,4 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,47],['BNB Chain','7,1 B
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();,36]]
 },
 adoption:{
  labels:['1 Mars','4 Mars','7 Mars','10 Mars','13 Mars','16 Mars','19 Mars','22 Mars','25 Mars','28 Mars','31 Mars'],
  users:[18,23,28,31,35,39,36,38,42,48,58],
  volume:[20,24,28,33,36,44,46,49,55,59,62],
  defi:[42,52,53,60,58,64,67,66,72,74,77]
 }
};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}
function renderPlatforms(){
 var h=state.exchanges.map(function(x){var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>'}).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){var p=Math.max(0,Math.min(100,+x.uptime||0));return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>'}).join('');
 var host=q('#oracleCards');if(host)host.innerHTML=h;
}
function renderEngines(){
 Object.keys(state.engines).forEach(function(k){setText('[data-engine-ms="'+k+'"]',state.engines[k]+' ms')});
 var values=Object.keys(state.engines).map(function(k){return +state.engines[k]||0});
 var ok=values.length&&values.every(function(v){return v>=0&&v<1000});
 var n=q('#engineGlobalState');if(n){n.textContent=ok?'● Tous les services opérationnels':'● Service dégradé';n.classList.toggle('good',ok)}
}
function renderSummary(){
 var h=state.summary.map(function(x){return '<div class="summaryCell '+(x.good?'good':'')+'"><i>'+esc(x.icon)+'</i><div><b>'+esc(x.value)+'</b><span>'+esc(x.label)+'</span></div></div>'}).join('');
 var host=q('#summaryGrid');if(host)host.innerHTML=h;
}
function linePath(values,w,h,pad){
 var max=Math.max.apply(Math,values.concat([1])),min=0,dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-((v-min)/(max-min||1))*(h-pad*2);return(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ');
}
function points(values,w,h,pad,klass){
 var max=Math.max.apply(Math,values.concat([1])),dx=(w-pad*2)/Math.max(1,values.length-1);
 return values.map(function(v,i){var x=pad+i*dx,y=h-pad-(v/max)*(h-pad*2);return'<circle class="'+klass+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.7"/>'}).join('');
}
function renderAdoption(){
 var a=state.adoption,w=760,h=150,pad=24,count=a.users.length,barW=Math.max(6,Math.min(24,(w-pad*2)/(count*1.8))),max=Math.max.apply(Math,a.users.concat([1])),bars='';
 a.users.forEach(function(v,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)))-barW/2,bh=(v/max)*(h-pad*2),y=h-pad-bh;bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1"/>'});
 var grid='';for(var g=0;g<5;g++){var gy=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'"/>'}
 var labels='';a.labels.forEach(function(l,i){if(i%1===0){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'}});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}
function apply(data){
 data=data||{};
 if(Array.isArray(data.exchanges))state.exchanges=data.exchanges;
 if(Array.isArray(data.oracles))state.oracles=data.oracles;
 if(data.engines)Object.keys(data.engines).forEach(function(k){state.engines[k]=data.engines[k]});
 if(Array.isArray(data.summary))state.summary=data.summary;
 if(data.adoption)state.adoption=data.adoption;
 renderAll();
}
function renderAll(){renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption()}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}
window.IATBStats={state:state,update:apply,render:renderAll};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe()});else{renderAll();bind();liveProbe()}
})();