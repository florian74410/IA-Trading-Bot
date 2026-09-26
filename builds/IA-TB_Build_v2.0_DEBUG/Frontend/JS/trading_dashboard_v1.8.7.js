(function(){
'use strict';
var VERSION='1.12-workspace';
function el(tag,cls,html){var n=document.createElement(tag);if(cls)n.className=cls;if(html!==undefined)n.innerHTML=html;return n}
function q(s){return document.querySelector(s)}
function byId(id){return document.getElementById(id)}
function setText(id,v){var n=byId(id);if(n)n.textContent=v}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function compact(s,n){return String(s||'').replace(/\s+/g,' ').trim().slice(0,n||220)}
function lastAiText(){var a=document.querySelectorAll('#msgs .msg.ai');return a.length?compact(a[a.length-1].textContent,235):'Le Supervisor agrège les données de marché, les indicateurs et le contexte fondamental pour produire une synthèse exploitable.'}
function cleanPrice(v){v=String(v||'').trim();return v&&v!=='--'?v:'--'}

function topUtilities(){var nav=q('.navActions');if(!nav||byId('iatbTopUtilities'))return;var u=el('div','iatbTopUtilities');u.id='iatbTopUtilities';u.innerHTML='<span class="iatbTopLive" title="Runtime actif"></span><span class="iatbTopUtility" title="Notifications">♢</span><span class="iatbTopUtility" title="État système">⚙</span>';nav.appendChild(u)}

function marketMaster(){var n=el('section','iatbMarketMaster');n.id='iatbMarketMaster';n.innerHTML='<b>MARCHÉ DE RÉFÉRENCE</b><strong class="masterPair" id="tdMasterPair">--</strong><small id="tdMasterTf">--</small><span class="masterProvider" id="tdMasterProvider">Market Data</span><span class="masterGuard">🛡 OHLCV lecture seule</span>';return n}
function indicatorDock(){var n=el('section','iatbIndicatorDock');n.id='iatbIndicatorDock';n.innerHTML='<div class="iatbIndicatorDockHead"><b>ƒx INDICATEURS</b><span>Indicator Engine · overlays et panneaux séparés du flux OHLCV</span></div><div class="iatbIndicatorDockBody" id="tdIndicatorDockBody"><div class="iatbIndicatorEmpty">Ajoute un indicateur avec le bouton ƒx Indicateurs ou via le Chat IA.</div></div>';return n}
function moduleDeck(){
  var wrap=el('section','iatbModuleWrap');wrap.id='iatbModuleWrap';
  wrap.innerHTML='<div class="iatbModuleLabel">MODULES</div>';
  var d=el('div','iatbModuleDeck');d.id='iatbModuleDeck';
  d.innerHTML=''
    +'<section class="iatbDashCard"><h3>VOLUME (24H) <span class="accent">◌</span></h3><div class="iatbMetricBig"><strong id="tdVolume">—</strong><span id="tdVolumeDelta">source en attente</span></div><div class="iatbBars"><i style="height:29%"></i><i style="height:44%"></i><i style="height:36%"></i><i style="height:61%"></i><i style="height:52%"></i><i style="height:72%"></i><i style="height:46%"></i><i style="height:80%"></i><i style="height:56%"></i><i style="height:68%"></i><i style="height:38%"></i><i style="height:62%"></i></div><a class="iatbMore" href="#" onclick="return false">Flux Market Data →</a></section>'
    +'<section class="iatbDashCard"><h3>STRATÉGIES EN COURS <span class="accent">◉</span></h3><table class="iatbMiniTable"><thead><tr><th>Stratégie</th><th>Paire</th><th>Statut</th></tr></thead><tbody id="tdStrategies"><tr><td colspan="3">Chargement…</td></tr></tbody></table><a class="iatbMore" href="#" id="tdStrategiesLink">Voir toutes les stratégies →</a></section>'
    +'<section class="iatbDashCard marketTile"><h3>PAIRE ACTIVE <span class="accent">◉</span></h3><div class="iatbMetricBig"><strong id="tdTilePair">--</strong><span id="tdTileProvider">Market Data</span></div><div class="iatbAiSummary"><p id="tdTileOhlc">O -- · H -- · L -- · C --</p></div></section>'
    +'<section class="iatbDashCard marketTile"><h3>DERNIÈRE BOUGIE <span class="accent">◌</span></h3><div class="iatbMetricBig"><strong id="tdTileClose">--</strong><span id="tdTileTf">--</span></div><div class="iatbAiSummary"><p id="tdTileTime">En attente du Collector</p></div></section>'
    +'<section class="iatbDashCard"><h3>SYNTHÈSE IA <span class="accent">✦</span></h3><div class="iatbAiSummary"><p id="tdAiSummary"></p><ul><li>Tendance : <b style="color:#35d98b">lecture temps réel</b></li><li>Source : <b id="tdAiSource">Market Data</b></li><li>Contrôle : <b style="color:#e8b63f">Risk Manager</b></li></ul></div><a class="iatbMore" href="#" onclick="return false">Voir l’analyse complète →</a></section>';
  wrap.appendChild(d);return wrap;
}

function exchangeRow(name,logo,sub,status,detail,planned){var enabled=!planned&&(['GMX','KRAKEN','BINANCE','OKX'].indexOf(name)>=0);return '<div class="iatbExchangeRow '+(enabled?'selectable':'planned')+'" data-td-ex="'+name+'" data-exchange-selectable="'+(enabled?'1':'0')+'" role="'+(enabled?'button':'group')+'" tabindex="'+(enabled?'0':'-1')+'" aria-pressed="false"><span class="iatbExLogo '+logo+'">'+name.charAt(0)+'</span><span class="iatbExName"><strong>'+name+'</strong><span>'+sub+'</span></span><span class="iatbExStatus '+(planned?'planned':'')+'"><strong>'+status+'</strong><span>'+detail+'</span></span><span class="iatbSwitch '+(planned?'off':'')+'" aria-hidden="true"></span></div>'}
function exchangePanel(){
  var s=el('aside','iatbExchangeColumn');s.id='iatbExchangeDashboard';
  s.innerHTML='<div class="iatbSideHead">EXCHANGES <button type="button" title="Réduire">×</button></div><div class="iatbExchangeScroll">'
    +'<div class="iatbSideSectionTitle">Connectés au Market Data Collector</div><div class="iatbExchangeList">'
    +exchangeRow('GMX','gmx','Perp · Arbitrum','PUBLIC','Oracle',false)
    +exchangeRow('KRAKEN','kraken','Spot','PUBLIC','API',false)
    +exchangeRow('BINANCE','binance','Spot','PUBLIC','API',false)
    +exchangeRow('COINBASE','coinbase','Spot','PRÉVU','—',true)
    +exchangeRow('OKX','okx','Spot','PUBLIC','API',false)
    +exchangeRow('FUTURS CEX/DEX','future','Architecture extensible','PRÉVU','—',true)
    +'</div>'
    +'<section class="iatbConsensus"><h3>VOLUME & PRICES CONSENSUS ⓘ</h3><div class="iatbConsensusTop"><div class="iatbConsensusBox"><small id="tdConsensusPair">BTC/USD</small><strong id="tdConsensusPrice">--</strong><small>Indice de consensus</small><strong class="iatbConsensusScore" id="tdConsensusScore">—</strong><div class="iatbGauge"><i id="tdConsensusGauge" style="width:0%"></i></div></div><div class="iatbConsensusBox"><small>Source principale</small><strong id="tdConsensusSource" style="font-size:12px">Market Data</strong><small style="margin-top:9px">Écart max prix</small><strong id="tdConsensusSpread" style="font-size:14px;color:#35d98b">—</strong></div></div><div class="iatbConsensusSources"><span class="iatbExLogo gmx">G</span><span class="iatbExLogo kraken">K</span><span class="iatbExLogo binance">B</span><span class="iatbExLogo coinbase">C</span><span class="iatbExLogo okx">O</span></div></section>'
    +'</div>';
  return s;
}


function syncExchangeSelection(){
  var active=String((window.IATBTradingState&&window.IATBTradingState.marketSource)||'').toUpperCase();
  var sel=byId('exchangeSelect');if(sel&&sel.value)active=String(sel.value).toUpperCase();
  document.querySelectorAll('.iatbExchangeRow[data-exchange-selectable="1"]').forEach(function(row){
    var ex=String(row.getAttribute('data-td-ex')||'').toUpperCase(),on=ex===active;
    row.classList.toggle('active',on);row.setAttribute('aria-pressed',on?'true':'false');
    var sw=row.querySelector('.iatbSwitch');if(sw)sw.classList.toggle('off',!on);
  });
}
function requestExchangeSwitch(exchange){
  exchange=String(exchange||'').toUpperCase();if(['GMX','KRAKEN','BINANCE','OKX'].indexOf(exchange)<0)return;
  var sel=byId('exchangeSelect');if(!sel)return;
  if(String(sel.value).toUpperCase()===exchange){syncExchangeSelection();return}
  sel.value=exchange;
  try{sel.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){if(typeof sel.onchange==='function')sel.onchange()}
  syncExchangeSelection();setTimeout(syncExchangeSelection,120);setTimeout(syncExchangeSelection,700);
}
function bindExchangeSwitches(root){
  if(!root)return;
  root.querySelectorAll('.iatbExchangeRow[data-exchange-selectable="1"]').forEach(function(row){
    if(row.dataset.exchangeBound==='1')return;row.dataset.exchangeBound='1';
    row.onclick=function(){requestExchangeSwitch(row.getAttribute('data-td-ex'))};
    row.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();requestExchangeSwitch(row.getAttribute('data-td-ex'))}};
  });
  syncExchangeSelection();
}

function serviceStrip(){
  var n=el('footer','iatbServiceStrip');n.id='iatbServiceStrip';
  var services=[['Core','8001'],['Market Data','8013'],['Indicators','8012'],['Liquidity','8014'],['Fundamental','8015'],['Risk Engine','8019'],['Trading Engine','8016'],['Strategy Engine','8010'],['UserData Server','8020'],['Router','8010'],['Trading FW','8017'],['Data FW','8018']];
  var h='<div class="iatbSvcTitle">ÉTAT DES SERVICES <span>runtime local v'+VERSION+'</span></div><div class="iatbSvcList">';
  for(var i=0;i<services.length;i++)h+='<div class="iatbSvc"><span class="iatbSvcTop"><i class="iatbSvcDot" data-svc="'+services[i][0]+'"></i>'+services[i][0]+'</span><span class="iatbSvcPort">'+services[i][1]+'</span></div>';
  h+='</div><div class="iatbSvcTail"><div><small>LATENCE</small><strong id="tdLatency">—</strong></div><div><small>UPTIME</small><strong id="tdUptime">—</strong></div></div>';n.innerHTML=h;return n;
}

function markDot(name,state){var x=document.querySelector('.iatbSvcDot[data-svc="'+name+'"]');if(x)x.className='iatbSvcDot '+(state||'')}
function chatShell(chat,logoWrap){
  var col=el('section','iatbChatColumn'),foot=el('div','iatbChatFooter');
  /* v1.8.10: the shared top navigation already owns the IA-TB logo.
     Do not move or duplicate the legacy logo inside the Supervisor rail. */
  var title=chat.querySelector('.panelTitle');if(title&&title.firstChild)title.firstChild.nodeValue='CHAT IA SUPERVISOR ';
  foot.innerHTML='<span>Les réponses IA ne constituent pas un conseil en investissement.</span><button class="iatbChatClear" type="button">⌫ Effacer</button>';
  foot.querySelector('button').onclick=function(){var msgs=byId('msgs');if(!msgs)return;var keep=msgs.querySelector('.msg.ai');msgs.innerHTML='';if(keep)msgs.appendChild(keep.cloneNode(true))};
  col.appendChild(chat);chat.appendChild(foot);return col;
}
function chartShell(chart){
  /* v1.8.10: remove the redundant chart header so the toolbar/chart starts
     directly at the top of the chart section. */
  return chart;
}

function syncSecondaryPageState(){
  var ids=['settingsPage','strategyPage','updatesPage'];
  var active=false;
  for(var i=0;i<ids.length;i++){
    var n=byId(ids[i]);
    if(n&&!n.classList.contains('hide')){active=true;break}
  }
  var root=document.documentElement;
  var before=root.classList.contains('iatb-secondary-page-active');
  root.classList.toggle('iatb-secondary-page-active',active);
  if(before&&!active){setTimeout(function(){try{window.dispatchEvent(new Event('resize'))}catch(e){}},80)}
}
function watchSecondaryPages(){
  var ids=['settingsPage','strategyPage','updatesPage'];
  var observer=new MutationObserver(syncSecondaryPageState),found=false;
  for(var i=0;i<ids.length;i++){
    var n=byId(ids[i]);
    if(n){observer.observe(n,{attributes:true,attributeFilter:['class']});found=true}
  }
  if(found)syncSecondaryPageState();
}

function build(){
  var body=q('.body[data-mosaic-root]'),chat=q('.chatPrimary'),chart=byId('chartArea'),top=q('.top');
  if(!body||!chat||!chart||body.dataset.dashboard186Final==='1')return;
  body.dataset.dashboard186Final='1';document.documentElement.classList.add('iatb-dashboard-v186-final','iatb-trading-workspace');
  var logoWrap=q('.top .appLogoWrap')||q('.appLogoWrap');
  if(byId('walletConnect'))byId('walletConnect').textContent='✦ Connecter Trust Wallet';
  if(byId('adminBtn'))byId('adminBtn').textContent='🛠 ADMIN';
  topUtilities();
  watchSecondaryPages();
  var center=el('main','iatbCenterColumn'),right=exchangePanel(),services=serviceStrip();
  center.appendChild(marketMaster());center.appendChild(chartShell(chart));center.appendChild(moduleDeck());
  body.appendChild(center);body.appendChild(right);body.appendChild(services);
  var legacyRight=q('.body[data-mosaic-root]>.right');if(legacyRight){legacyRight.setAttribute('aria-hidden','true');legacyRight.style.display='none'}
  var legacyLeft=q('.body[data-mosaic-root]>.left');if(legacyLeft){legacyLeft.setAttribute('aria-hidden','true');legacyLeft.style.display='none'}
  var sl=byId('tdStrategiesLink');if(sl)sl.onclick=function(e){e.preventDefault();var b=byId('strategyBtn');if(b)b.click()};
  var close=right.querySelector('.iatbSideHead button');if(close)close.onclick=function(){right.classList.toggle('iatbSideCollapsed')};bindExchangeSwitches(right);
  sync();loadStrategies();health();volume24h();
  setInterval(sync,1800);setInterval(loadStrategies,15000);setInterval(health,5000);setInterval(volume24h,30000);
  setTimeout(function(){try{window.dispatchEvent(new Event('resize'))}catch(e){}},120);
}

function loadStrategies(){
  fetch('/api/strategies',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(d){
    var tb=byId('tdStrategies');if(!tb)return;var items=(d.items||[]).slice(0,3),active=d.active||{};
    if(!items.length){tb.innerHTML='<tr><td>Aucune</td><td>—</td><td><span class="iatbPill ready">PRÊT</span></td></tr>';return}
    tb.innerHTML=items.map(function(x,i){var nm=x.name||x.label||x.id||('Stratégie '+(i+1)),pair=x.symbol||x.pair||'—',isActive=active&&(active.id===x.id||active.filename===x.filename),st=isActive?'ACTIVE':'READY';return '<tr><td title="'+esc(nm)+'">'+esc(nm).slice(0,16)+'</td><td>'+esc(pair)+'</td><td><span class="iatbPill '+(isActive?'':'ready')+'">'+st+'</span></td></tr>'}).join('');
  }).catch(function(){var tb=byId('tdStrategies');if(tb)tb.innerHTML='<tr><td>Strategy Engine</td><td>—</td><td><span class="iatbPill ready">PRÊT</span></td></tr>'})
}

/* Volume is never fabricated. GMX candle endpoint explicitly tells us when volume is absent. */
function volume24h(){
  var sym=byId('symbol'),interval='1h',symbol=sym&&sym.value?sym.value:'BTCUSD';
  fetch('/ui-data/market/candles?symbol='+encodeURIComponent(symbol)+'&interval='+interval+'&limit=100',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error();return r.json()}).then(function(d){
    if(d.volumeAvailable===false){setText('tdVolume','N/D');setText('tdVolumeDelta','GMX sans volume');return}
    var rows=d.candles||[],sum=0,valid=false;for(var i=0;i<rows.length;i++){var v=+rows[i][5];if(isFinite(v)&&v>0){sum+=v;valid=true}}
    if(!valid){setText('tdVolume','N/D');setText('tdVolumeDelta','source indisponible');return}
    setText('tdVolume',formatCompact(sum));setText('tdVolumeDelta','24 dernières heures');
  }).catch(function(){setText('tdVolume','—');setText('tdVolumeDelta','Market Data hors ligne')})
}
function formatCompact(n){n=+n;if(!isFinite(n))return'—';if(n>=1e9)return(n/1e9).toFixed(2)+'B';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n.toFixed(2)}

var providerHealth={GMX:false,KRAKEN:false,BINANCE:false,OKX:false};
function setProviderHealth(exchange,ok,detail){
  exchange=String(exchange||'').toUpperCase();providerHealth[exchange]=!!ok;
  var row=document.querySelector('[data-td-ex="'+exchange+'"]'),st=row&&row.querySelector('.iatbExStatus');
  if(st){st.className='iatbExStatus'+(ok?'':' planned');st.innerHTML='<strong>'+(ok?'CONNECTÉ':'HORS LIGNE')+'</strong><span>'+esc(detail||(ok?'Market Data':'indisponible'))+'</span>'}
}
function probeProvider(exchange,symbol){
  var url='/ui-data/market/candles?exchange='+encodeURIComponent(exchange)+'&symbol='+encodeURIComponent(symbol)+'&interval=1m&limit=100&force=1';
  return fetch(url,{credentials:'same-origin',cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(d){
    var ok=!!(d&&d.ok!==false&&Array.isArray(d.candles)&&d.candles.length);
    setProviderHealth(exchange,ok,ok?((d.provider||exchange)+' · '+d.candles.length+' bougies'):'OHLCV vide');return ok;
  }).catch(function(e){setProviderHealth(exchange,false,compact(e&&e.message||'indisponible',24));return false});
}
function probeMarketProviders(){
  return Promise.all([probeProvider('GMX','BTCUSD'),probeProvider('KRAKEN','BTCUSD'),probeProvider('BINANCE','BTCUSDT'),probeProvider('OKX','BTCUSDT')]).then(function(v){
    var connected=0;for(var i=0;i<v.length;i++)if(v[i])connected++;
    var score=v.length?connected/v.length:0;setText('tdConsensusScore',connected?score.toFixed(2):'—');var gauge=byId('tdConsensusGauge');if(gauge)gauge.style.width=Math.round(score*100)+'%';
  });
}
function health(){
  var start=Date.now();
  fetch('/api/health',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error();return r.json()}).then(function(){markDot('Core','ok');markDot('Router','ok');setText('tdLatency',(Date.now()-start)+' ms')}).catch(function(){markDot('Core','bad')});
  fetch('/api/status',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error();return r.json()}).then(function(){markDot('Market Data','ok');markDot('Trading Engine','ok');markDot('Trading FW','ok');setText('tdUptime','en ligne')}).catch(function(){});
  probeMarketProviders();
}

function syncIndicatorDock(){var box=byId('tdIndicatorDockBody');if(!box)return;var st=null;try{st=window.IATBIndicatorUI&&IATBIndicatorUI.state?IATBIndicatorUI.state():null}catch(e){}var a=st&&Array.isArray(st.selected)?st.selected:[];if(!a.length){box.innerHTML='<div class="iatbIndicatorEmpty">Ajoute un indicateur avec le bouton ƒx Indicateurs ou via le Chat IA.</div>';return}box.innerHTML=a.slice(0,12).map(function(x){var id=typeof x==='string'?x:(x.id||x.name||'Indicateur');return '<div class="iatbIndicatorChip"><b>'+esc(id)+'</b><small>Indicator Engine · actif</small></div>'}).join('')}
function sync(){
  syncExchangeSelection();
  var p=q('#price'),sym=q('#symbol'),src=q('#marketSourceBadge'),ws=q('#wsState');
  var pair=sym&&sym.options&&sym.selectedIndex>=0?sym.options[sym.selectedIndex].text:'BTC/USD';
  var source=src?String(src.textContent||'Market Data').split('·')[0].trim():'Market Data';
  setText('tdMasterPair',pair);setText('tdMasterTf',(byId('interval')&&byId('interval').value)||'--');setText('tdMasterProvider',source);setText('tdTilePair',pair);setText('tdTileProvider',source);var rows=window.IATBTradingState&&window.IATBTradingState.candles||null;var readout=byId('ohlc');setText('tdTileOhlc',readout?String(readout.textContent||'').replace(/^.*? · /,''):'O -- · H -- · L -- · C --');setText('tdTileClose',cleanPrice(p&&p.textContent));setText('tdTileTf',(byId('interval')&&byId('interval').value)||'--');setText('tdTileTime',ws?String(ws.textContent||'Market Data Collector'):'Market Data Collector');syncIndicatorDock();setText('tdConsensusPrice',cleanPrice(p&&p.textContent));setText('tdConsensusPair',pair);setText('tdChartPair',pair);setText('tdConsensusSource',source);setText('tdAiSource',src?String(src.textContent||'Market Data').replace(/·/g,' / '):'Market Data');setText('tdAiSummary',lastAiText());
  if(ws&&/connect|en ligne|online|ok/i.test(String(ws.textContent||'')))markDot('Market Data','ok');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();


/* Firewall read-only information feed: local UI only, no OpenAI/token usage. */
(function(){
var last=Date.now()-5000,busy=false,seen={};
function box(){return document.querySelector('[data-mosaic-id="chat"] .msgs')||document.querySelector('.chatPrimary .msgs')||document.querySelector('.chat .msgs');}
function label(e){var r=e.result?(' · '+e.result):'',why=e.reason?(' · '+e.reason):'';return '🛡 Firewall · '+String(e.component||'SYSTEM')+' · '+String(e.type||'EVENT')+r+why;}
function add(e){var k=[e.timestamp,e.component,e.type,e.result,e.reason].join('|');if(seen[k])return;seen[k]=1;var b=box();if(!b)return;var d=document.createElement('div');d.className='msg ai local firewallInfo';d.setAttribute('data-read-only','1');d.textContent=label(e);b.appendChild(d);b.scrollTop=b.scrollHeight;}
function poll(){if(busy)return;busy=true;fetch('/firewall-events?audience=user&limit=40&since='+encodeURIComponent(last),{cache:'no-store',headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(o){(o.events||[]).forEach(function(e){var t=Date.parse(e.timestamp)||0;if(t>last)last=t;add(e);});}).catch(function(){}).then(function(){busy=false;});}
setTimeout(poll,1200);setInterval(poll,2500);
})();
