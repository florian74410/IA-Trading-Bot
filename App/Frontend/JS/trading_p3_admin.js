(function(){'use strict';
var button=document.getElementById('p3BridgeCheck'),state=document.getElementById('p3BridgeState');if(!button||!state)return;
button.addEventListener('click',async function(){
 button.disabled=true;state.textContent='VALIDATING · vérification de la chaîne sécurisée…';
 try{
  var auth=await fetch('/auth21/csrf',{credentials:'same-origin',cache:'no-store'});if(!auth.ok)throw Error('AUTH_UNAVAILABLE');var csrf=await auth.json();
  var response=await fetch('/auth21/admin/trading/command',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-IATB-CSRF':csrf.csrfToken},body:JSON.stringify({command:'STATUS',command_id:crypto.randomUUID(),timestamp:Date.now(),confirmed:true})});
  var result=await response.json();if(!result.bridge)throw Error(response.status===401||response.status===403?'AUTH_UNAVAILABLE':'DIAGNOSTIC_UNAVAILABLE');
  state.textContent=result.bridge.state+' · '+result.bridge.reason+' · LIVE non autorisé · commandes mutantes désactivées';
 }catch(e){state.textContent=(e.message==='AUTH_UNAVAILABLE'?'AUTH_UNAVAILABLE':'ERROR')+' · diagnostic indisponible';}
 finally{button.disabled=false;}
});
})();
