(function(){'use strict';
 const $=id=>document.getElementById(id);if(!$('okxAccountPanel'))return;
 async function json(url,options={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options}),x=await r.json();if(!r.ok||x.error)throw Error(x.error||'ACCOUNT_UNAVAILABLE');return x;}
 const format=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('fr-FR',{maximumFractionDigits:8}):'Indisponible';
 async function refresh(){const button=$('okxAccountRefresh');button.disabled=true;$('okxAccountValues').replaceChildren();$('okxAccountBalances').replaceChildren();
  try{if(!$('okxProfileAccount').value)throw Error('NO_ACCOUNT');const csrf=(await json('/auth21/csrf')).csrfToken;
   const reply=await json('/communication/v1/ui/read',{method:'POST',headers:{'Content-Type':'application/json','X-IATB-CSRF':csrf},body:JSON.stringify({target:'portfolio',action:'portfolio.account.snapshot',arguments:{exchange:'OKX',account:$('okxProfileAccount').value,symbol:$('okxAccountSymbol').value}})}),s=reply.data.snapshot;
   $('okxAccountValues').textContent='Capital total : '+format(s.equityUSD)+' USD · Disponible : '+format(s.availableQuote)+' '+(s.quoteCurrency||'')+' · Engagé : '+format(s.frozenQuote)+' '+(s.quoteCurrency||'');
   for(const b of s.balances){const li=document.createElement('li');li.textContent=b.asset+' : '+format(b.equity)+' · disponible '+format(b.available);$('okxAccountBalances').appendChild(li);}
   $('okxAccountStatus').textContent='Lecture OKX reçue à '+new Date(s.observedAt).toLocaleString('fr-FR')+'. '+(s.reconciled?'Compte rapproché.':'Certaines données de risque restent à vérifier.');
  }catch(e){$('okxAccountStatus').textContent=e.message==='NO_ACCOUNT'?'Aucun compte OKX actif affecté au profil. Configurez-le dans Paramètres → Trading.':'Compte indisponible : vérifiez la connexion, les droits de lecture et la région API dans Paramètres → Trading.';}
  finally{button.disabled=false;}
 }
 $('okxAccountRefresh').onclick=refresh;$('okxProfileAccount').onchange=refresh;
 json('/auth21/trading/accounts').then(x=>{const accounts=x.accounts.filter(a=>a.exchange==='OKX'&&a.enabled&&a.markets.includes('SPOT'));for(const a of accounts){const option=document.createElement('option');option.value=a.id;option.textContent=a.id+(a.demoMode?' · Démonstration':'');$('okxProfileAccount').appendChild(option);}const preferred=accounts.find(a=>a.default)||accounts[0];if(preferred){$('okxProfileAccount').value=preferred.id;return refresh();}$('okxAccountStatus').textContent='Aucun compte OKX actif affecté au profil. Configurez-le dans Paramètres → Trading.';}).catch(()=>{$('okxAccountStatus').textContent='Connectez-vous pour consulter le compte OKX de votre profil.';});
})();
