(function(){
'use strict';
var VERSION='1.8.5';
function el(tag,cls,html){var n=document.createElement(tag);if(cls)n.className=cls;if(html!==undefined)n.innerHTML=html;return n}
function q(s){return document.querySelector(s)}
function text(id,v){var n=document.getElementById(id);if(n)n.textContent=v}
function cleanPrice(v){v=String(v||'').trim();return v&&v!=='--'?v:'--'}
function lastAiText(){var a=document.querySelectorAll('#msgs .msg.ai');if(!a.length)return'Le Supervisor centralise les données de marché, les indicateurs et le contexte fondamental avant décision.';return String(a[a.length-1].textContent||'').replace(/\s+/g,' ').slice(0,230)}

function cardDeck(){
  var d=el('div','iatbModuleDeck');
  d.id='iatbModuleDeck';
  d.innerHTML=''
    +'<section class="iatbDashCard"><h3>VOLUME (24H) <span class="accent">◌</span></h3><div class="iatbMetricBig"><strong id="tdVolume">—</strong><span id="tdVolumeDelta">temps réel</span></div><div class="iatbBars"><i style="height:29%"></i><i style="height:44%"></i><i style="height:36%"></i><i style="height:61%"></i><i style="height:52%"></i><i style="height:72%"></i><i style="height:46%"></i><i style="height:80%"></i><i style="height:56%"></i><i style="height:68%"></i><i style="height:38%"></i><i style="height:62%"></i></div><a class="iatbMore" href="#" onclick="return false">Flux Market Data →</a></section>'
    +'<section class="iatbDashCard"><h3>STRATÉGIES ACTIVES <span class="accent">◉</span></h3><table class="iatbMiniTable"><thead><tr><th>Stratégie</th><th>Paire</th><th>Statut</th></tr></thead><tbody id="tdStrategies"><tr><td colspan="3">Chargement…</td></tr></tbody></table><a class="iatbMore" href="#" id="tdStrategiesLink">Voir toutes les stratégies →</a></section>'
    +'<section class="iatbDashCard"><h3>SYNTHÈSE IA <span class="accent">✦</span></h3><div class="iatbAiSummary"><p id="tdAiSummary"></p><ul><li>Tendance : <b style="color:#39d98a">lecture temps réel</b></li><li>Source : <b id="tdAiSource">Market Data</b></li><li>Contrôle : <b style="color:#e7b655">Risk Manager</b></li></ul></div><a class="iatbMore" href="#" onclick="return false">Voir l’analyse complète →</a></section>';
  return d;
}
function exchangePanel(){
  var s=el('aside','iatbExchangeColumn');s.id='iatbExchangeDashboard';
  s.innerHTML='<div class="iatbSideHead">EXCHANGES <button type="button" title="Panneau Exchanges">×</button></div>'
    +'<div class="iatbExchangeScroll"><div class="iatbSideSectionTitle">Connectés au Market Data Collector</div>'
    +exchangeRow('GMX','gmx','Perp · Arbitrum','API PUBLIQUE','—',false)
    +exchangeRow('KRAKEN','kraken','Spot','PUBLIC','—',false)
    +exchangeRow('BINANCE','binance','Spot & Futures','PRÉVU','—',true)
    +exchangeRow('COINBASE','coinbase','Spot','PRÉVU','—',true)
    +exchangeRow('OKX','okx','Spot & Futures','PRÉVU','—',true)
    +exchangeRow('FUTURS CEX/DEX','future','Architecture extensible','PRÉVU','—',true)
    +'<button class="iatbAddEx" type="button">＋ Ajouter un Exchange</button>'
    +'<section class="iatbConsensus"><h3>Volume & Prices Consensus ⓘ</h3><div class="iatbConsensusTop"><div class="iatbConsensusBox"><small id="tdConsensusPair">BTC/USD</small><strong id="tdConsensusPrice">--</strong><small>Indice de consensus</small><strong class="iatbConsensusScore">0.98</strong><div class="iatbGauge"><i></i></div></div><div class="iatbConsensusBox"><small>Source principale</small><strong id="tdConsensusSource" style="font-size:13px">GMX</strong><small style="margin-top:10px">Écart max prix</small><strong style="font-size:16px;color:#37d58a">—</strong></div></div><div class="iatbConsensusSources"><span class="iatbExLogo gmx">G</span><span class="iatbExLogo kraken">K</span><span class="iatbExLogo binance">B</span><span class="iatbExLogo coinbase">C</span><span class="iatbExLogo okx">O</span></div></section></div>';
  return s;
}
function exchangeRow(name,logo,sub,status,latency,planned){return '<div class="iatbExchangeRow" data-td-ex="'+name+'"><span class="iatbExLogo '+logo+'">'+name.charAt(0)+'</span><span class="iatbExName"><strong>'+name+'</strong><span>'+sub+'</span></span><span class="iatbExStatus '+(planned?'planned':'')+'"><strong>'+status+'</strong><span>'+latency+'</span></span><span class="iatbSwitch '+(planned?'off':'')+'"></span></div>'}
function serviceStrip(){
  var n=el('div','iatbServiceStrip');n.id='iatbServiceStrip';
  var services=[['Core','8001'],['Market Data','8013'],['Indicators','8012'],['Liquidity','8014'],['Fundamental','8015'],['Risk Engine','8019'],['Trading Engine','8016'],['Strategy Engine','8010'],['UserData Server','8020'],['Router','8010'],['Trading FW','8017'],['Data FW','8018']];
  var h='<div class="iatbSvcTitle">ÉTAT DES SERVICES <span>Vue compacte du runtime local</span></div><div class="iatbSvcList">';
  for(var i=0;i<services.length;i++)h+='<div class="iatbSvc"><span class="iatbSvcTop"><i class="iatbSvcDot" data-svc="'+services[i][0]+'"></i>'+services[i][0]+'</span><span class="iatbSvcPort">'+services[i][1]+'</span></div>';
  h+='</div><div class="iatbSvcTail"><div><small>LATENCE</small><strong id="tdLatency">—</strong></div><div><small>UPTIME</small><strong id="tdUptime">—</strong></div></div>';n.innerHTML=h;return n;
}
function markDot(name,state){var x=document.querySelector('.iatbSvcDot[data-svc="'+name+'"]');if(x)x.className='iatbSvcDot '+(state||'')}
function build(){
  var body=q('.body[data-mosaic-root]'),chat=q('.chatPrimary'),chart=document.getElementById('chartArea');if(!body||!chat||!chart||body.dataset.dashboard185==='1')return;
  body.dataset.dashboard185='1';document.documentElement.classList.add('iatb-dashboard-v185');
  var chatCol=el('section','iatbChatColumn'),center=el('main','iatbCenterColumn'),right=exchangePanel(),svc=serviceStrip();
  chatCol.appendChild(chat);center.appendChild(chart);center.appendChild(cardDeck());
  body.appendChild(chatCol);body.appendChild(center);body.appendChild(right);body.appendChild(svc);
  var legacyRight=q('.body[data-mosaic-root]>.right');if(legacyRight)legacyRight.setAttribute('aria-hidden','true');
  var legacyLeft=q('.body[data-mosaic-root]>.left');if(legacyLeft)legacyLeft.setAttribute('aria-hidden','true');
  var sl=document.getElementById('tdStrategiesLink');if(sl)sl.onclick=function(e){e.preventDefault();var b=document.getElementById('strategyBtn');if(b)b.click()};
  var close=right.querySelector('.iatbSideHead button');if(close)close.onclick=function(){right.classList.toggle('iatbSideCollapsed')};
  sync();setInterval(sync,2500);loadStrategies();setInterval(loadStrategies,15000);health();setInterval(health,5000);
  setTimeout(function(){try{window.dispatchEvent(new Event('resize'))}catch(e){}},80);
}
function loadStrategies(){fetch('/api/strategies',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(d){var tb=document.getElementById('tdStrategies');if(!tb)return;var items=(d.items||[]).slice(0,3),active=d.active||{};if(!items.length){tb.innerHTML='<tr><td>Aucune</td><td>—</td><td><span class="iatbPill">PRÊT</span></td></tr>';return}tb.innerHTML=items.map(function(x,i){var nm=x.name||x.label||x.id||('Stratégie '+(i+1)),pair=x.symbol||x.pair||'—',st=(active&&active.id===x.id)?'ACTIVE':'READY';return '<tr><td>'+esc(nm).slice(0,18)+'</td><td>'+esc(pair)+'</td><td><span class="iatbPill">'+st+'</span></td></tr>'}).join('')}).catch(function(){var tb=document.getElementById('tdStrategies');if(tb)tb.innerHTML='<tr><td>Engine</td><td>—</td><td><span class="iatbPill">PRÊT</span></td></tr>'})}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function health(){var start=Date.now();fetch('/api/health',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(){markDot('Core','ok');markDot('Router','ok');text('tdLatency',(Date.now()-start)+' ms')}).catch(function(){markDot('Core','warn')});
  fetch('/api/status',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error();return r.json()}).then(function(d){markDot('Market Data','ok');markDot('Trading Engine','ok');var g=document.querySelector('[data-td-ex="GMX"] .iatbExStatus');if(g){g.className='iatbExStatus';g.innerHTML='<strong>CONNECTÉ</strong><span>API publique</span>'}text('tdUptime','en ligne')}).catch(function(){});
}
function sync(){var p=q('#price'),sym=q('#symbol'),src=q('#marketSourceBadge'),state=q('#aiState');text('tdConsensusPrice',cleanPrice(p&&p.textContent));text('tdConsensusPair',sym&&sym.options&&sym.selectedIndex>=0?sym.options[sym.selectedIndex].text:'BTC/USD');text('tdConsensusSource',src?String(src.textContent||'Market Data').split('·')[0].trim():'Market Data');text('tdAiSource',src?String(src.textContent||'Market Data').replace(/·/g,' / '):'Market Data');text('tdAiSummary',lastAiText());
  var kd=document.getElementById('krakenDot'),gd=document.getElementById('gmxDot');if(kd&&kd.classList.contains('ok')){var k=document.querySelector('[data-td-ex="KRAKEN"] .iatbExStatus');if(k){k.className='iatbExStatus';k.innerHTML='<strong>CONNECTÉ</strong><span>Public API</span>'}}if(gd&&gd.classList.contains('ok')){var g=document.querySelector('[data-td-ex="GMX"] .iatbExStatus');if(g){g.className='iatbExStatus';g.innerHTML='<strong>CONNECTÉ</strong><span>Arbitrum</span>'}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
