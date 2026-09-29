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
 },
 cefi:{
  shares:[],volume:[],exchanges:[],assets:[],
  health:[['Données','Chargement…','warn']]
 },
 defi:{
  shares:[],volume:[],protocols:[],stableIn:[],stableOut:[],networks:[]
 }
};
state.cefi={shares:[],volume:[],exchanges:[],assets:[],health:[]};
state.defi={shares:[],volume:[],protocols:[],stableIn:[],stableOut:[],networks:[]};

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function q(s,r){return (r||document).querySelector(s)}
function qa(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function setText(selector,value){var n=q(selector);if(n)n.textContent=value}
function brandClass(b){return ['binance','coinbase','kraken','okx','gmx','chainlink','pyth','arbitrum'].indexOf(b)>=0?b:''}

function renderPlatforms(){
 var h=state.exchanges.map(function(x){
  var warn=String(x.status).toLowerCase().indexOf('dégrad')>=0||String(x.status).toLowerCase().indexOf('degrad')>=0;
  return '<div class="platformCard" data-platform="'+esc(x.id)+'"><div class="platformCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState '+(warn?'warn':'')+'">● '+esc(x.status)+'</span></div></div><span class="miniLatency" data-platform-ms="'+esc(x.id)+'">'+esc(x.latency)+' ms</span><div class="platformMeta"><span>Liquidité</span><strong class="'+(x.liquidity==='Moyenne'?'warn':'')+'">'+esc(x.liquidity)+'</strong><strong>'+esc(x.api)+'</strong></div></div>';
 }).join('');
 var host=q('#platformCards');if(host)host.innerHTML=h;
 var connected=state.exchanges.filter(function(x){var s=String(x.status||'').toLowerCase();return s.indexOf('hors ligne')<0&&s.indexOf('offline')<0&&s.indexOf('déconnect')<0&&s.indexOf('deconnect')<0;}).length;
 setText('#cexConnectedState','● '+connected+'/'+state.exchanges.length+' connectés');
 state.exchanges.forEach(function(x){setText('[data-stat="'+x.id+'-latency"]',x.latency+' ms')});
}
function renderOracles(){
 var h=state.oracles.map(function(x){
  var p=Math.max(0,Math.min(100,+x.uptime||0));
  return '<div class="oracleCard" data-oracle="'+esc(x.id)+'"><div class="oracleCardTop"><span class="brandIcon '+brandClass(x.brand)+'">'+esc(x.icon)+'</span><div><b>'+esc(x.name)+'</b><span class="miniState">● '+esc(x.status)+'</span><span class="miniLatency">'+esc(x.latency)+' ms</span></div></div><div class="oracleMeta"><span>Uptime</span><strong>'+p.toFixed(2)+'%</strong></div><div class="uptimeRing" style="--p:'+p+'"><span>'+Math.round(p)+'%</span></div></div>';
 }).join('');
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
 var labels='';a.labels.forEach(function(l,i){var x=pad+i*((w-pad*2)/(Math.max(1,count-1)));labels+='<text x="'+x.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle">'+esc(l)+'</text>'});
 var svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="chartGrid">'+grid+'</g><g class="chartBars">'+bars+'</g><path class="chartLineVolume" d="'+linePath(a.volume,w,h,pad)+'"/><path class="chartLineDefi" d="'+linePath(a.defi,w,h,pad)+'"/><g>'+points(a.volume,w,h,pad,'chartPointVolume')+points(a.defi,w,h,pad,'chartPointDefi')+'</g><g class="chartAxis">'+labels+'</g></svg>';
 var host=q('#adoptionChart');if(host)host.innerHTML=svg;
}

function barChart(values,klass){
 values=(values||[]).filter(function(v){return isFinite(+v)}).map(Number);
 if(values.length<2)return '<div class="financeChartEmpty"><b>Historique en cours de constitution</b><span>Le graphique apparaîtra dès que plusieurs points temporels auront été enregistrés.</span></div>';
 var w=760,h=210,pad=22,max=Math.max.apply(Math,values.concat([1])),bw=(w-pad*2)/values.length*.64,out='',grid='';
 for(var g=0;g<5;g++){var y=pad+g*((h-pad*2)/4);grid+='<line x1="'+pad+'" y1="'+y+'" x2="'+(w-pad)+'" y2="'+y+'"/>'}
 values.forEach(function(v,i){var step=(w-pad*2)/values.length,x=pad+i*step+step*.18,bh=(v/max)*(h-pad*2),y=h-pad-bh;out+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="2"/>'});
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><g class="financeGrid">'+grid+'</g><g class="financeBars '+klass+'">'+out+'</g></svg>';
}
var FINANCE_COLORS=['#17b9e8','#2bd9aa','#7665f0','#d754d9','#42667b','#f0b74b'];
function formatPct(v){v=+v;return isFinite(v)?v.toFixed(1).replace('.',',')+'%':'--'}
function compactShares(items){items=(items||[]).filter(function(x){return x&&isFinite(+x[1])&&+x[1]>0}).sort(function(a,b){return+b[1]-+a[1]});if(items.length<=6)return items;var top=items.slice(0,5),other=items.slice(5).reduce(function(z,x){return z+(+x[1]||0)},0);if(other>0)top.push(['Autres',other]);return top}
function donutGradient(items){var at=0,stops=[];(items||[]).forEach(function(x,i){var v=Math.max(0,+x[1]||0),next=Math.min(100,at+v),co=FINANCE_COLORS[i%FINANCE_COLORS.length];stops.push(co+' '+at.toFixed(2)+'% '+next.toFixed(2)+'%');at=next});if(at<100)stops.push('#163447 '+at.toFixed(2)+'% 100%');return 'conic-gradient('+stops.join(',')+')'}
function legendHtml(items){return (items||[]).map(function(x,i){return'<div class="financeLegendRow"><i class="legendDot" style="background:'+FINANCE_COLORS[i%FINANCE_COLORS.length]+'"></i><span title="'+esc(x[0])+'">'+esc(x[0])+'</span><b>'+esc(formatPct(x[1]))+'</b></div>'}).join('');}
function syncDonut(selector,items){var n=q(selector);if(n)n.style.background=donutGradient(items)}
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
 var d=state.defi;if(!d.stableIn.length||!d.stableOut.length)return '<div class="stableFlowEmpty"><b>Historique insuffisant</b><span>Les flux seront calculés à partir des variations successives de capitalisation des stablecoins.</span></div>';
 var w=620,h=180,p=20,max=Math.max.apply(Math,d.stableIn.concat(d.stableOut).concat([1])),step=(w-p*2)/d.stableIn.length,bars='';
 d.stableIn.forEach(function(v,i){var inH=(v/max)*(h/2-24),outH=(d.stableOut[i]/max)*(h/2-24),x=p+i*step+step*.18,bw=step*.28;bars+='<rect class="stableIn" x="'+x.toFixed(1)+'" y="'+(h/2-inH).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+inH.toFixed(1)+'"/><rect class="stableOut" x="'+(x+bw+2).toFixed(1)+'" y="'+(h/2).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+outH.toFixed(1)+'"/>'});
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><line class="stableAxis" x1="'+p+'" y1="'+(h/2)+'" x2="'+(w-p)+'" y2="'+(h/2)+'"/>'+bars+'</svg><div class="stableLegend"><span><i class="in"></i>Entrées</span><span><i class="out"></i>Sorties</span></div>';
}
function renderFinance(){
 var h=q('#cefiVolumeChart');if(h)h.innerHTML=barChart(state.cefi.volume,'cefi');
 var d=q('#defiVolumeChart');if(d)d.innerHTML=barChart(state.defi.volume,'defi');
 var l=q('#cefiShareLegend');if(l)l.innerHTML=legendHtml(state.cefi.shares);syncDonut('.cefiDonut',state.cefi.shares);
 var dl=q('#defiShareLegend');if(dl)dl.innerHTML=legendHtml(state.defi.shares);syncDonut('.defiDonut',state.defi.shares);
 var t=q('#cefiExchangeTable');if(t)t.innerHTML=financeTable(state.cefi.exchanges);
 var pt=q('#defiProtocolTable');if(pt)pt.innerHTML=financeTable(state.defi.protocols);
 var av=q('#cefiAssetVolumes');if(av)av.innerHTML=assetBars(state.cefi.assets,'cefi');
 var nw=q('#defiNetworks');if(nw)nw.innerHTML=assetBars(state.defi.networks,'defi');
 var hg=q('#cefiHealth');if(hg)hg.innerHTML=healthGrid(state.cefi.health);
 var sf=q('#defiStableFlow');if(sf)sf.innerHTML=stableFlow();
}


function money(v){
 v=+v;if(!isFinite(v))return'--';
 var a=Math.abs(v);
 if(a>=1e12)return(v/1e12).toFixed(2).replace('.',',')+' T$';
 if(a>=1e9)return(v/1e9).toFixed(1).replace('.',',')+' B$';
 if(a>=1e6)return(v/1e6).toFixed(1).replace('.',',')+' M$';
 return Math.round(v).toLocaleString('fr-FR')+' $';
}
function pctShare(v,total){v=+v;total=+total;return isFinite(v)&&isFinite(total)&&total>0?v/total*100:0}
function scaled(v,max){v=+v;max=+max;return max>0?Math.max(4,Math.min(100,v/max*100)):4}
function trend(values){
 values=(values||[]).filter(function(v){return isFinite(+v)}).map(Number);
 if(values.length<2||!values[0])return'En cours';
 var p=(values[values.length-1]-values[0])/Math.abs(values[0])*100;
 return(p>=0?'+':'')+p.toFixed(1).replace('.',',')+' %';
}
function setKpi(id,value,trendValue,note){
 var b=q('#'+id);if(!b)return;b.textContent=value;
 var card=b.parentNode,em=card&&card.querySelector('em'),sm=card&&card.querySelector('small');
 if(em)em.textContent=trendValue||'--';if(sm&&note)sm.textContent=note;
}
function uiRead(action,args){
 return fetch('/communication/v1/ui/read',{
  method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
  body:JSON.stringify({target:'marketdata',action:action,arguments:args||{}})
 }).then(function(r){return r.json().then(function(o){
  if(!r.ok||o.status==='ERROR')throw new Error(o.error||(o.data&&o.data.error)||('HTTP '+r.status));
  return o.data!==undefined?o.data:o;
 })});
}
function historyValues(h,family,pathName){
 var rows=(h&&h.items)||[],out=[],parts=String(pathName||'').split('.');
 rows.forEach(function(x){
  var cur=family==='CEFI'?x.cefi:x.defi;
  for(var i=0;i<parts.length&&cur!=null;i++)cur=cur[parts[i]];
  cur=+cur;if(isFinite(cur))out.push(cur);
 });
 return out.slice(-24);
}
function applyFinancialSnapshot(s,cefiHistory,defiHistory){
 s=s||{};var c=s.cefi||{},d=s.defi||{},meta=s.meta||{};
 if(c&&Object.keys(c).length){
  var exTotal=+c.spotVolume24hUsd||0;
  var cefiShares=(c.exchangeShares||[]).map(function(x){return[x.name,+x.sharePct||0]}),cefiKnown=cefiShares.reduce(function(z,x){return z+(+x[1]||0)},0);if(cefiKnown<99.95)cefiShares.push(['Autres',Math.max(0,100-cefiKnown)]);state.cefi.shares=compactShares(cefiShares);
  state.cefi.exchanges=(c.exchanges||[]).slice(0,8).map(function(x){
   return{name:x.name||x.id,volume:money(x.volume24hUsd),share:pctShare(x.volume24hUsd,exTotal).toFixed(1).replace('.',',')+'%',liquidity:(+x.trustScore||0)>=8?'Très élevée':(+x.trustScore||0)>=6?'Élevée':'Moyenne',status:'CoinGecko'};
  });
  var assets=(c.assets||[]).slice(0,8),maxAsset=Math.max.apply(Math,assets.map(function(x){return+x.volume24hUsd||0}).concat([1]));
  state.cefi.assets=assets.map(function(x){return[x.symbol||x.name,money(x.volume24hUsd),scaled(x.volume24hUsd,maxAsset)]});
  var cv=historyValues(cefiHistory,'CEFI','global.totalVolume24hUsd');
  var spotHist=historyValues(cefiHistory,'CEFI','spotVolume24hUsd');
  if(spotHist.length)state.cefi.volume=spotHist;
  setKpi('cefiVolume24',money(c.cexVolume24hUsdSampled||c.spotVolume24hUsd),trend(spotHist),'CoinGecko · échantillon des exchanges CEX suivis');
  setKpi('cefiSpot24',money(c.global&&c.global.totalVolume24hUsd),trend(cv),'CoinGecko · volume global du marché crypto');
  setKpi('cefiOi','--','--','Provider dérivés / OI requis');
  setKpi('cefiLiq','--','--','Provider liquidations requis');
  var donut=q('.cefiDonut b');if(donut)donut.textContent=money(c.spotVolume24hUsd);
  var fresh=meta.freshness&&meta.freshness.cefi,age=fresh&&fresh.observedAt?Math.max(0,Date.now()-fresh.observedAt):null;
  state.cefi.health=[
   ['Market cap',money(c.global&&c.global.marketCapUsd),'good'],
   ['Volume marché 24h',money(c.global&&c.global.totalVolume24hUsd),'good'],
   ['Provider','CoinGecko','good'],
   ['Fraîcheur',age==null?'--':Math.round(age/1000)+' s',age!=null&&fresh&&age<=fresh.ttlMs?'good':'warn']
  ];
 }
 if(d&&Object.keys(d).length){
  var cats=(d.categories||[]).slice(0,12),catTotal=cats.reduce(function(z,x){return z+(+x.tvlUsd||0)},0);
  state.defi.shares=compactShares(cats.map(function(x){return[x.name,pctShare(x.tvlUsd,catTotal)]}));
  var dx=(d.dexProtocols||[]).slice(0,8),dxTotal=+d.dexVolume24hUsd||dx.reduce(function(z,x){return z+(+x.volume24hUsd||0)},0);
  state.defi.protocols=dx.map(function(x){return{name:x.name||x.slug,volume:money(x.volume24hUsd),share:pctShare(x.volume24hUsd,dxTotal).toFixed(1).replace('.',',')+'%',liquidity:'DEX',status:'DeFiLlama'}});
  var chains=(d.chains||[]).slice(0,8),maxTvl=Math.max.apply(Math,chains.map(function(x){return+x.tvlUsd||0}).concat([1]));
  state.defi.networks=chains.map(function(x){return[x.name,money(x.tvlUsd),scaled(x.tvlUsd,maxTvl)]});
  var dv=historyValues(defiHistory,'DEFI','dexVolume24hUsd');
  var tvlHist=historyValues(defiHistory,'DEFI','tvlUsd');
  var stableHist=historyValues(defiHistory,'DEFI','stablecoinMarketCapUsd');
  if(dv.length)state.defi.volume=dv;
  setKpi('defiTvl',money(d.tvlUsd),trend(tvlHist),'DeFiLlama · TVL protocoles/chains');
  setKpi('defiDexVolume',money(d.dexVolume24hUsd),trend(dv),'DeFiLlama · DEX 24h');
  setKpi('defiStable',money(d.stablecoinMarketCapUsd),trend(stableHist),'DeFiLlama · stablecoins');
  setKpi('defiBridgeVolume','N/D','Non suivi','Donnée non disponible · provider de volume bridge non connecté');
  var dd=q('.defiDonut b');if(dd)dd.textContent=money(d.tvlUsd);
  var stable=stableHist,ins=[],outs=[];
  for(var i=1;i<stable.length;i++){var delta=stable[i]-stable[i-1];ins.push(delta>0?delta/1e9:0);outs.push(delta<0?-delta/1e9:0)}
  if(ins.length){state.defi.stableIn=ins.slice(-12);state.defi.stableOut=outs.slice(-12)}
 }
 renderFinance();
}
function loadFinancialData(){
 Promise.all([
  uiRead('marketdata.financial.snapshot',{force:false}),
  uiRead('marketdata.financial.history',{family:'CEFI',limit:96}),
  uiRead('marketdata.financial.history',{family:'DEFI',limit:96})
 ]).then(function(x){applyFinancialSnapshot(x[0],x[1],x[2])}).catch(function(e){
  if(window.console&&console.warn)console.warn('[STATISTICS] financial data unavailable:',e.message);
 });
}

function currentSection(){
 var h=String(location.hash||'#server').toLowerCase();
 return h==='#cefi'?'cefi':h==='#defi'?'defi':'server';
}
function showSection(name){
 name=name||currentSection();
 qa('[data-stats-section]').forEach(function(n){n.classList.toggle('active',n.getAttribute('data-stats-section')===name)});
 qa('[data-stats-nav]').forEach(function(n){n.classList.toggle('active',n.getAttribute('data-stats-nav')===name)});
 document.body.setAttribute('data-stats-view',name);
 window.scrollTo(0,0);
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
function renderAll(){
 renderPlatforms();renderOracles();renderEngines();renderSummary();renderAdoption();renderFinance();showSection();
}
function bind(){
 qa('.rangeBtns button').forEach(function(b){b.onclick=function(){qa('.rangeBtns button').forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
 qa('.financeRanges button').forEach(function(b){b.onclick=function(){var p=b.parentNode;qa('button',p).forEach(function(x){x.classList.remove('active')});b.classList.add('active')}});
 window.addEventListener('hashchange',function(){showSection()});
}
function liveProbe(){
 fetch('/ui-health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;state.engines.ui=1;renderEngines()}).catch(function(){});
 fetch('/api/status',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;var s=q('#engineGlobalState');if(s&&o.version)s.title='Core IA-TB '+o.version}).catch(function(){});
}

window.IATBStats={state:state,update:apply,render:renderAll,section:showSection};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){renderAll();bind();liveProbe();loadFinancialData();setInterval(loadFinancialData,60000)});else{renderAll();bind();liveProbe();loadFinancialData();setInterval(loadFinancialData,60000)}
})()
