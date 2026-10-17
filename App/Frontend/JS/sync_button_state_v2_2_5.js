/* IA-TB v2.2.5 — Shared refresh/sync button state model (no network calls).
 * Consumers wire their existing authenticated refresh action into run().
 */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.IATBSyncButtonState=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var LABELS=Object.freeze({idle:'Actualiser',loading:'Actualisation…',success:'À jour',error:'Erreur'});
function create(run,onChange){
 if(typeof run!=='function')throw new TypeError('run must be a function');
 var state='idle',pending=null;
 function set(next){state=next;if(typeof onChange==='function')onChange({state:state,label:LABELS[state],busy:state==='loading'});}
 return {getState:function(){return state;},getLabel:function(){return LABELS[state];},
  trigger:function(){
   if(pending)return pending;
   set('loading');
   pending=Promise.resolve().then(run).then(function(result){
    if(result&&result.ok===false)throw new Error('SYNC_FAILED');
    set('success');return result;
   },function(error){set('error');throw error;}).finally(function(){pending=null;});
   return pending;
  },reset:function(){if(!pending)set('idle');}
 };
}
function bind(button,run){
 if(!button||!button.addEventListener)throw new TypeError('button required');
 var controller=create(run,function(x){button.textContent=x.label;button.disabled=x.busy;button.setAttribute('aria-busy',String(x.busy));button.dataset.syncState=x.state;});
 button.textContent=LABELS.idle;
 function click(){controller.trigger().catch(function(){/* failure shown by button state; backend logs stay available */});}
 button.addEventListener('click',click);
 return {controller:controller,destroy:function(){button.removeEventListener('click',click);}};
}
return {LABELS:LABELS,create:create,bind:bind};
});
