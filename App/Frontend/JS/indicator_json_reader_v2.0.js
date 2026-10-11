'use strict';
(function(global){
 var COLORS=['#45c8ff','#3de19a','#ffd45e','#b58cff','#ff7f91','#67a6ff','#f59c5c','#6ee7d8'];
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function fmt(v){v=+v;if(!isFinite(v))return'--';var a=Math.abs(v);if(a>=1e6)return v.toExponential(3);if(a>=1000)return v.toFixed(2);if(a>=10)return v.toFixed(3);return v.toFixed(5)}
 function finiteSeries(a){return Array.isArray(a)&&a.some(function(v){return v!=null&&isFinite(+v)})}
 function Reader(){
  this.host=document.getElementById('indicatorDockBody');
  this.state=document.getElementById('indicatorDockState');
  this.batch=[];
  this.ro=null;
  if(this.host&&global.ResizeObserver){var self=this;this.ro=new ResizeObserver(function(){self.drawAll()});this.ro.observe(this.host)}
 }
 Reader.prototype.accept=function(results){
  this.batch=Array.isArray(results)?results.slice():[];
  this.render();
 };
 Reader.prototype.render=function(){
  if(!this.host)return;
  var self=this,ok=0;
  if(!this.batch.length){
   this.host.innerHTML='<div class="indicatorReaderEmpty">Lecteur universel prêt · sélectionne un indicateur avec ƒx Indicateurs ou importe un <b>.indicator.json</b>.</div>';
   if(this.state)this.state.textContent='Lecteur JSON · prêt';
   return;
  }
  this.host.innerHTML='';
  this.batch.forEach(function(x,idx){
   if(!x||x.ok===false||!x.result){var e=document.createElement('div');e.className='indicatorReaderError';e.innerHTML='<b>INDICATEUR</b><span>'+esc(x&&x.error||'Résultat invalide')+'</span>';self.host.appendChild(e);return}
   ok++;var r=x.result||{},wrap=document.createElement('section');wrap.className='indicatorPane indicatorJsonPane';wrap.setAttribute('data-indicator-id',r.id||('indicator-'+idx));
   var title=document.createElement('div');title.className='indicatorPaneTitle';title.textContent=(r.name||r.id||'Indicateur')+' · '+String(r.state||'READY');wrap.appendChild(title);
   if(r.display&&r.display.render==='zones'){
    var z=Array.isArray(r.zones)?r.zones:[],box=document.createElement('div');box.className='indicatorReaderOverlay';
    box.innerHTML='<div><b>'+esc(r.name||r.id)+'</b><span>ZONES</span></div><small>'+z.length+' zone(s) · '+esc((r.disclaimer||r.mode||'').toString())+'</small>';
    wrap.appendChild(box);
   }else{
    var canvas=document.createElement('canvas');canvas.setAttribute('data-indicator-canvas','1');wrap.appendChild(canvas);
    var vals=r.values||{},outputs=r.outputs||{},keys=Object.keys(vals).filter(function(k){return !(outputs[k]&&outputs[k].chart===false)&&finiteSeries(vals[k])});
    wrap.__indicator={result:r,keys:keys};
    if(!keys.length){var nd=document.createElement('div');nd.className='indicatorReaderNoData';nd.textContent='Aucune série graphique exploitable dans ce JSON.';wrap.appendChild(nd)}
   }
   var latest=document.createElement('div');latest.className='indicatorReaderLatest';var parts=[];Object.keys(r.latest||{}).forEach(function(k){if(!(r.outputs&&r.outputs[k]&&r.outputs[k].chart===false))parts.push(k+' '+fmt(r.latest[k]))});latest.textContent=parts.join(' · ')||'--';wrap.appendChild(latest);
   self.host.appendChild(wrap);
  });
  if(this.state)this.state.textContent='Lecteur JSON · '+ok+'/'+this.batch.length+' rendu'+(ok>1?'s':'');
  setTimeout(function(){self.drawAll()},0);
 };
 Reader.prototype.drawAll=function(){
  if(!this.host)return;
  var self=this;[].slice.call(this.host.querySelectorAll('.indicatorJsonPane')).forEach(function(p){self.drawPane(p)});
 };
 Reader.prototype.drawPane=function(pane){
  var meta=pane.__indicator,cv=pane.querySelector('canvas[data-indicator-canvas="1"]');if(!meta||!cv||!meta.keys.length)return;
  var r=meta.result,keys=meta.keys,w=Math.max(40,pane.clientWidth),h=Math.max(70,pane.clientHeight),d=Math.min(global.devicePixelRatio||1,2);
  cv.width=Math.round(w*d);cv.height=Math.round(h*d);cv.style.width=w+'px';cv.style.height=h+'px';
  var x=cv.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);x.fillStyle='#070b10';x.fillRect(0,0,w,h);
  var L=8,R=8,T=26,B=18,cw=Math.max(10,w-L-R),ch=Math.max(25,h-T-B),min=r.display&&r.display.min!=null?+r.display.min:Infinity,max=r.display&&r.display.max!=null?+r.display.max:-Infinity;
  if(!isFinite(min)||!isFinite(max)){min=Infinity;max=-Infinity;keys.forEach(function(k){(r.values[k]||[]).forEach(function(v){if(v!=null&&isFinite(+v)){min=Math.min(min,+v);max=Math.max(max,+v)}})});if(!isFinite(min)||!isFinite(max)){min=0;max=1}if(min===max){min-=1;max+=1}}
  var rg=max-min||1,n=0;keys.forEach(function(k){n=Math.max(n,(r.values[k]||[]).length)});
  x.strokeStyle='#142a37';x.lineWidth=1;for(var gy=0;gy<3;gy++){var yy=T+ch*gy/2;x.beginPath();x.moveTo(L,yy+.5);x.lineTo(L+cw,yy+.5);x.stroke()}
  function X(i){return L+(n<=1?0:(i/(n-1))*cw)}function Y(v){return T+(max-v)/rg*ch}
  keys.forEach(function(k,ki){var a=r.values[k]||[];x.strokeStyle=COLORS[ki%COLORS.length];x.lineWidth=1.6;x.beginPath();var started=false;for(var i=0;i<a.length;i++){var v=+a[i];if(a[i]==null||!isFinite(v))continue;var px=X(i),py=Y(v);if(!started){x.moveTo(px,py);started=true}else x.lineTo(px,py)}if(started)x.stroke();x.fillStyle=COLORS[ki%COLORS.length];x.font='8px Menlo,monospace';x.fillText(k,L+ki*78,h-5)});
 };
 function mount(){
  var reader=new Reader();global.IATBIndicatorJsonReader=reader;
  global.addEventListener('ia-tb:indicator-json-batch',function(e){reader.accept(e&&e.detail&&e.detail.results||[])});
  if(global.IATBIndicatorBatch&&Array.isArray(global.IATBIndicatorBatch.results))reader.accept(global.IATBIndicatorBatch.results);else reader.render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(window);