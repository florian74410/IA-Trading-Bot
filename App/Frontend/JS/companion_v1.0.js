(function(){'use strict';if(window.__IATB_COMPANION)return;window.__IATB_COMPANION=1;
var MOODS={1:{id:'HELLO',icon:'👋',words:'bonjour coucou bienvenue'},2:{id:'FUNNY',icon:'😊',words:'marrant sourire sympa'},3:{id:'LAUGH',icon:'🤣',words:'xd rire hilarant'},4:{id:'CONGRATS',icon:'👍',words:'bravo félicitation bien joué validé réussi'},5:{id:'MARKET_ANALYSIS',icon:'📊',words:'marché analyse chart liquidité prix trade'},6:{id:'THINKING',icon:'🤔',words:'réfléchir écrire attente'},7:{id:'IDEA',icon:'💡',words:'idée solution proposition'},8:{id:'SUCCESS',icon:'🚀',words:'gros gain excellente stratégie excellent trade profit'},9:{id:'ERROR',icon:'⚠️',words:'erreur problème échec impossible'},10:{id:'IDLE',icon:'💤',words:'inactif repos'},11:{id:'CRYPTO',icon:'₿',words:'bitcoin crypto portefeuille defi staking vault'},12:{id:'EXPLAIN',icon:'📈',words:'explique fonctionnement tutoriel stratégie trade'}},root,panel,msgs,input,mic,face,moodBadge,idleTimer,lastHover='',drag=null,speech=window.speechSynthesis||null,rec=null,voiceEnabled=false,mode='commands',busy=false,historyLoaded=false,chatForm=null,engineBox=null,tabBar=null,contextLabel=null,sendButton=null;
function el(t,c,txt){var x=document.createElement(t);if(c)x.className=c;if(txt!==undefined)x.textContent=txt;return x}function pageCtx(){var a=document.activeElement,h=document.elementFromPoint(window.__iatbMouseX||0,window.__iatbMouseY||0),view=document.querySelector('.view:not(.hide)');return{path:location.pathname,hash:location.hash,title:document.title,section:view&&view.id||'',active:a&&((a.id||a.name||a.tagName))||'',hover:lastHover||(h&&((h.id||h.getAttribute&&h.getAttribute('data-view')||h.tagName))||'')}}function setMood(n){n=MOODS[n]?n:2;face.textContent=n===10?'◡':'●‿●';moodBadge.textContent=MOODS[n].icon;root.dataset.mood=MOODS[n].id;resetIdle()}function chooseMood(text){var s=String(text||'').toLowerCase(),best=2,score=0;Object.keys(MOODS).forEach(function(k){if(+k===6||+k===10)return;var z=MOODS[k].words.split(' '),q=0;z.forEach(function(w){if(s.indexOf(w)>=0)q++});if(q>score){score=q;best=+k}});return best}function resetIdle(){clearTimeout(idleTimer);idleTimer=setTimeout(function(){setMood(10)},180000)}function add(w,t){var d=el('div','iatbCompMsg '+w,t);msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}function speak(t){if(!voiceEnabled||!speech||!window.SpeechSynthesisUtterance)return;try{speech.cancel();var u=new SpeechSynthesisUtterance(String(t).slice(0,1800));u.lang='fr-FR';u.rate=1;u.onstart=function(){root.classList.add('iatbCompSpeak')};u.onend=function(){root.classList.remove('iatbCompSpeak')};speech.speak(u)}catch(e){}}
function authenticated(){return !!(window.IATBSession&&window.IATBSession.authenticated&&window.IATBSession.role!=='GUEST')}
function request(url,payload){var opt=payload===undefined?{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}:{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)};return fetch(url,opt).then(function(r){return r.json().catch(function(){throw Error('Réponse Core illisible')}).then(function(j){if(!r.ok||j.error)throw Error(j.error||('HTTP '+r.status));return j})})}
function setBusy(flag){busy=flag;if(input)input.disabled=flag;if(sendButton)sendButton.disabled=flag;root.classList.toggle('iatbCompBusy',flag)}
function statusLine(t){if(contextLabel)contextLabel.textContent=t}
function changeMode(value){
 if(busy)return;
 mode=value;
 Array.prototype.forEach.call(tabBar.querySelectorAll('button'),function(b){b.classList.toggle('active',b.dataset.mode===value)});
 var eng=value==='engines';
 msgs.classList.toggle('hide',eng);chatForm.classList.toggle('hide',eng);engineBox.classList.toggle('hide',!eng);
 statusLine(value==='cognitive'?'Supervisor · conversation privée, mémoire persistante':value==='commands'?'Chat historique · commandes graphiques avec confirmation CP/1':'Engines · commandes explicites et contrôlées par Core');
 if(value==='cognitive'){
  if(!authenticated()){add('ai','Connexion Auth21 requise pour accéder à la mémoire du Supervisor. Aucun dialogue non authentifié ne sera envoyé.');return}
  restoreHistory();
 }
}
function restoreHistory(){
 if(historyLoaded||!authenticated())return;
 historyLoaded=true;
 request('/api/companion/history').then(function(j){
  if(mode!=='cognitive'){historyLoaded=false;return;}
  if(j.messages&&j.messages.length){msgs.textContent='';j.messages.forEach(function(x){add(x.role==='user'?'me':'ai',x.content)})}
 }).catch(function(e){historyLoaded=false;add('ai','Historique indisponible : '+e.message)});
}
function send(text){
 text=String(text||'').trim();if(!text||busy||mode==='engines')return;
 if(mode==='cognitive'&&!authenticated()){add('ai','Connexion Auth21 requise pour discuter avec le Supervisor.');return}
 add('me',text);input.value='';setMood(6);setBusy(true);
 var requestedMode=mode,payload={message:text,mode:requestedMode,context:pageCtx(),state:{symbol:'',interval:''}};
 request('/api/companion/chat',payload).then(function(j){
  var t=j.message||(j.command&&j.command.message)||'Réponse reçue.';
  add('ai',t);setMood(j.mood||chooseMood(t));speak(t);
  if(requestedMode==='commands')window.dispatchEvent(new CustomEvent('iatb-companion-command',{detail:j}));
  statusLine(requestedMode==='cognitive'?'Supervisor · '+String(j.model||'modèle configuré')+' · mémorisé':'Chat historique · actions contrôlées');
 }).catch(function(e){setMood(9);add('ai','Requête non exécutée : '+e.message)}).finally(function(){setBusy(false)});
}
var ENGINE_READS=[
 {target:'supervisor',action:'supervisor.cognitive.status',label:'Supervisor · Santé cognitive'},
 {target:'supervisor',action:'supervisor.llm.models',label:'Supervisor · Modèles LLM'},
 {target:'marketdata',action:'marketdata.health',label:'Market Data · Santé'},
 {target:'fundamental',action:'fundamental.health',label:'Fundamental · Santé'},
 {target:'fundamental',action:'fundamental.summary',label:'Fundamental · Synthèse'},
 {target:'strategy',action:'strategy.state',label:'Strategy · État'},
 {target:'strategy',action:'strategy.stats',label:'Strategy · Statistiques'},
 {target:'portfolio',action:'portfolio.overview',label:'Portfolio · Vue générale'}
];
function engineCall(target,action,write,out){
 if(busy)return;
 if(!authenticated()){out.textContent='Connexion Auth21 (USER/ADMIN) requise.';return}
 if(write&&!window.confirm('Confirmer la commande '+action+' sur '+target+' ?\\nUne confirmation réelle du Core est nécessaire.'))return;
 setBusy(true);out.textContent='Envoi authentifié à Core → Router CP/1 → '+target+'…';setMood(6);
 request('/communication/v1/ui/'+(write?'write':'read'),{target:target,action:action,arguments:{}})
 .then(function(j){var result=j.data===undefined?j:j.data;if(result&&result.ok===false)throw Error(String(result.error||'ENGINE_OPERATION_FAILED'));out.textContent=JSON.stringify(result,null,2).slice(0,4500);setMood(8);statusLine(target+' · '+action+' · accusé de réception Core');})
 .catch(function(e){out.textContent='Échec / refus : '+e.message;setMood(9);statusLine(target+' · commande refusée ou indisponible')})
 .finally(function(){setBusy(false)});
}
function setupEnginePanel(){
 engineBox=el('section','iatbCompEngines hide');
 var info=el('div','iatbCompInfo','Choisissez une opération. Les permissions sont contrôlées par Core ; aucune commande n\u2019est générée par le LLM.');
 var sel=el('select','iatbCompEngineSelect');
 ENGINE_READS.forEach(function(c,i){var o=el('option','',c.label);o.value=String(i);sel.appendChild(o)});
 var read=el('button','iatbCompAction','Consulter');read.type='button';
 var row=el('div','iatbCompEngineRow');row.appendChild(sel);row.appendChild(read);
 var title=el('div','iatbCompInfo','Commandes Strategy (modifient uniquement votre état Strategy personnel) :');
 var controls=el('div','iatbCompEngineControls');
 var pause=el('button','iatbCompAction','Pause Strategy');pause.type='button';
 var resume=el('button','iatbCompAction','Reprendre Strategy');resume.type='button';
 var output=el('pre','iatbCompEngineOutput','Aucune requête envoyée.');
 read.onclick=function(){var a=ENGINE_READS[Number(sel.value)];engineCall(a.target,a.action,false,output)};
 pause.onclick=function(){engineCall('strategy','strategy.pause',true,output)};
 resume.onclick=function(){engineCall('strategy','strategy.resume',true,output)};
 if(!authenticated()){pause.disabled=true;resume.disabled=true;read.disabled=true;info.textContent='Authentification Auth21 requise pour accéder aux Engines.'}
 controls.appendChild(pause);controls.appendChild(resume);
 engineBox.appendChild(info);engineBox.appendChild(row);engineBox.appendChild(title);engineBox.appendChild(controls);
 if(window.IATBSession&&window.IATBSession.role==='ADMIN'){
  var modelLabel=el('div','iatbCompInfo','ADMIN · Choisir le modèle utilisé par le Supervisor :');
  var modelRow=el('div','iatbCompModelRow'),modelSelect=el('select','iatbCompEngineSelect'),provider=el('select','iatbCompEngineSelect');
  [['OPENAI_API','OpenAI API'],['MOCK','Simulation MOCK']].forEach(function(v){var o=el('option','',v[1]);o.value=v[0];provider.appendChild(o)});
  var loadModel=el('button','iatbCompAction','Modèles');loadModel.type='button';
  var saveModel=el('button','iatbCompAction','Appliquer');saveModel.type='button';saveModel.disabled=true;
  loadModel.onclick=function(){
   if(busy)return;setBusy(true);
   request('/communication/v1/ui/read',{target:'supervisor',action:'supervisor.llm.models',arguments:{}})
    .then(function(j){var c=j.data===undefined?j:j.data;if(!Array.isArray(c.available))throw Error('Catalogue de modèles indisponible');modelSelect.textContent='';
     c.available.forEach(function(name){var opt=el('option','',name);opt.value=name;modelSelect.appendChild(opt)});
     modelSelect.value=c.selected||c.available[0]||'';provider.value=c.provider||'OPENAI_API';
     saveModel.disabled=!modelSelect.value;output.textContent='Modèles disponibles : '+c.available.join(', ');})
    .catch(function(e){output.textContent='Erreur catalogue : '+e.message;setMood(9)}).finally(function(){setBusy(false)});
  };
  saveModel.onclick=function(){
   if(busy||!modelSelect.value)return;
   if(!window.confirm('ADMIN : appliquer '+provider.value+' / '+modelSelect.value+' au Supervisor ?'))return;
   setBusy(true);
   request('/communication/v1/ui/write',{target:'supervisor',action:'supervisor.llm.select',arguments:{provider:provider.value,model:modelSelect.value}})
    .then(function(j){var o=j.data===undefined?j:j.data;if(o.ok!==true)throw Error(o.error||'MODEL_SAVE_FAILED');
      output.textContent=JSON.stringify(o,null,2);setMood(8);statusLine('Supervisor · modèle enregistré dans Settings');})
    .catch(function(e){output.textContent='Configuration refusée : '+e.message;setMood(9)}).finally(function(){setBusy(false)});
  };
  modelRow.appendChild(provider);modelRow.appendChild(modelSelect);modelRow.appendChild(loadModel);modelRow.appendChild(saveModel);
  engineBox.appendChild(modelLabel);engineBox.appendChild(modelRow);
 }
 engineBox.appendChild(output);
 return engineBox;
}
function setupVoice(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){add('ai',"La reconnaissance vocale n'est pas disponible dans ce navigateur.");return}if(rec){try{rec.stop()}catch(e){}rec=null;mic.classList.remove('on');return}rec=new SR();rec.lang='fr-FR';rec.interimResults=false;rec.continuous=false;rec.onstart=function(){mic.classList.add('on');setMood(6)};rec.onresult=function(e){var t=e.results[e.results.length-1][0].transcript;input.value=t;send(t)};rec.onerror=function(e){setMood(9);add('ai','Micro : '+e.error)};rec.onend=function(){mic.classList.remove('on');rec=null};try{rec.start()}catch(e){rec=null}}
function mount(){root=el('div');root.id='iatbCompanion';var bot=el('div','iatbCompBot'),f=el('span','iatbCompFace','●‿●');face=f;moodBadge=el('span','iatbCompMood','👋');mic=el('button','iatbCompMicMini','🎙');mic.title='Parler à IA-TB';bot.appendChild(f);bot.appendChild(moodBadge);bot.appendChild(mic);panel=el('section','iatbCompPanel hide');var head=el('div','iatbCompHead');head.appendChild(el('span','', '🤖'));head.appendChild(el('b','', 'Compagnon IA-TB'));var v=el('button','', '🔊');v.title='Réponse vocale';v.onclick=function(e){e.stopPropagation();voiceEnabled=!voiceEnabled;v.textContent=voiceEnabled?'🔊':'🔇'};var close=el('button','', '×');close.onclick=function(){panel.classList.add('hide')};head.appendChild(v);head.appendChild(close);msgs=el('div','iatbCompMsgs');addLater(msgs,'ai',"Coucou 👋 Je suis ton compagnon IA-TB. Je connais la page ouverte et je peux utiliser les actions autorisées du Chat IA.");var ctx=el('div','iatbCompCtx');ctx.textContent='Contexte : '+location.pathname;var form=el('form','iatbCompForm');input=el('input');input.placeholder='Demande quelque chose…';var m=el('button','', '🎙');m.type='button';m.onclick=setupVoice;var go=el('button','', '➤');form.appendChild(input);form.appendChild(m);form.appendChild(go);form.onsubmit=function(e){e.preventDefault();send(input.value)};tabBar=el('div','iatbCompTabs');
 [['cognitive','🧠 Supervisor'],['commands','⚙ Actions UI'],['engines','🛰 Engines']].forEach(function(pair){
  var b=el('button','',pair[1]);b.type='button';b.dataset.mode=pair[0];b.onclick=function(){changeMode(pair[0])};tabBar.appendChild(b);
 });
 chatForm=form;sendButton=go;contextLabel=ctx;
 panel.appendChild(head);panel.appendChild(tabBar);panel.appendChild(msgs);panel.appendChild(setupEnginePanel());panel.appendChild(ctx);panel.appendChild(form);root.appendChild(panel);root.appendChild(bot);document.body.appendChild(root);bot.onclick=function(e){if(e.target===mic)return;if(drag&&drag.moved)return;panel.classList.toggle('hide');setMood(1)};mic.onclick=function(e){e.stopPropagation();voiceEnabled=true;setupVoice()};bot.onmousedown=function(e){if(e.target===mic)return;drag={x:e.clientX,y:e.clientY,left:root.offsetLeft,top:root.offsetTop,moved:false};e.preventDefault()};document.addEventListener('mousemove',function(e){window.__iatbMouseX=e.clientX;window.__iatbMouseY=e.clientY;var h=e.target;if(h)lastHover=(h.id||h.getAttribute&&h.getAttribute('data-view')||h.tagName||'').slice(0,80);if(!drag)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;root.style.right='auto';root.style.bottom='auto';root.style.left=Math.max(0,Math.min(innerWidth-74,drag.left+dx))+'px';root.style.top=Math.max(0,Math.min(innerHeight-74,drag.top+dy))+'px'});document.addEventListener('mouseup',function(){drag=null});resetIdle();changeMode(authenticated()?'cognitive':'commands')}
function addLater(box,w,t){var d=el('div','iatbCompMsg '+w,t);box.appendChild(d)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();})();