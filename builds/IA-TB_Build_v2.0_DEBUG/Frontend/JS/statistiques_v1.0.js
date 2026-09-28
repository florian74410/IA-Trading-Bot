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
 var connected=state.exchanges.filter(function(x){return String(x.status).toLowerCase()==='en ligne'}).length;
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