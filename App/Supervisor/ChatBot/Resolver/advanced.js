'use strict';
// Deterministic additions to the existing resolver. Missing identifiers remain missing.
function extend(text,p){
 const n=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),num=s=>Number(s.replace(/\s/g,'').replace(',','.'));let m;
 if(/post[- ]only/.test(n))p.order_type='POST_ONLY';else if(/\bioc\b/.test(n))p.order_type='IOC';else if(/\bfok\b/.test(n))p.order_type='FOK';
 if((m=n.match(/(?:devise de marge|margin currency)\s+(usdt|usdc|btc|eth|eur)/)))p.margin_currency=m[1].toUpperCase();
 if(/\bcross\b/.test(n))p.margin_mode='cross';if(/\b(isolated|isolee?|isole)\b/.test(n))p.margin_mode='isolated';
 if((m=n.match(/(\d+(?:[.,]\d+)?)\s*(?:contrats?|contracts?)\b/))){p.amount=num(m[1]);p.amount_unit='CONTRACTS';}
 if((m=n.match(/(?:prix(?: limite)?(?: a| de)?|\ba)\s+((?:\d{1,3}(?:[ \u00a0]\d{3})+|\d+)(?:[.,]\d+)?)/)))p.limit_price=num(m[1]);
 if(/\b(moitie|half)\b/.test(n))p.close_fraction=.5;
 if(/(?:stop suiveur|trailing stop)/.test(n)){p.algo_type='move_order_stop';delete p.close_fraction;if((m=n.match(/(\d+(?:[.,]\d+)?)\s*%/)))p.callback_ratio=num(m[1])/100;if((m=n.match(/(?:distance|spread)\s+(\d+(?:[.,]\d+)?)/)))p.callback_spread=num(m[1]);if((m=n.match(/(?:activation|active)\s+(?:a\s+)?(\d+(?:[.,]\d+)?)/)))p.activation_price=num(m[1]);}
 else if(/\b(trigger|declenchement)\b/.test(n))p.algo_type='trigger';else if(p.take_profit!==undefined&&p.stop_loss!==undefined||/\boco\b/.test(n))p.algo_type='oco';else if(p.take_profit!==undefined||p.stop_loss!==undefined||/take.profit|stop.loss/.test(n))p.algo_type='conditional';
 if(/\bmark\b/.test(n))p.trigger_price_type='mark';if(/\bindex\b/.test(n))p.trigger_price_type='index';
 if((m=n.match(/algo(?:rithmique)?(?:\s+id)?\s+#?(\d{1,64})\b/)))p.algo_id=m[1];
 if(/\b(vendre|vends|sell)\b/.test(n))p.side='SELL';if(/\b(acheter|achete|buy)\b/.test(n))p.side='BUY';
 if(p.instrument_candidate?.endsWith('-SWAP'))p.market='SWAP';
 return p;
}
function special(n){
 if(/\b(annule|cancel)\b/.test(n)&&/\balgo/.test(n))return 'algorithms.cancel';
 if(/\b(modifie|amend)\b/.test(n)&&/\balgo/.test(n))return 'algorithms.amend';
 if(/\b(levier|leverage)\b/.test(n)&&/\b(mets|regle|configure|change|set)\b/.test(n))return 'account.leverage';
 if(/\b(fills|executions)\b.*\b(ordre|order)\b/.test(n))return 'orders.fills';
 if(/\b(etat|statut|status)\b.*\balgo/.test(n))return 'algorithms.status';
 if(/\b(etat|statut|status)\b.*\b(ordre|order)\b/.test(n))return 'orders.status';
 if(/\b(historique|history)\b.*\b(ordres|orders)\b/.test(n))return 'orders.history';
 if(/stop suiveur|trailing stop|ordre trigger|(?:place|ajoute|active).*?(?:take.profit|stop.loss)/.test(n))return 'algorithms.place';
 return null;
}
module.exports={extend,special};
