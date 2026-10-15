'use strict';
/* Deliberately SMALL allowlist for genuinely executable isolated business flows.
 * Unknown operations, live trading, Wallet and arbitrary provider access stay denied.
 */
const RULES=Object.freeze({
 '/auth21/business/marketdata/metadata':Object.freeze({engine:'marketdata',action:'marketdata.metadata.get',owner:false,method:'GET'}),
 '/auth21/business/indicator/settings':Object.freeze({engine:'indicators',action:'indicator.settings.set',owner:false}),
 '/auth21/business/marketdata/settings':Object.freeze({engine:'marketdata',action:'marketdata.settings.set',owner:false}),
 '/auth21/business/fundamental/feed':Object.freeze({engine:'fundamental',action:'fundamental.feed.create',owner:false}),
 '/auth21/business/portfolio/preference':Object.freeze({engine:'portfolio',action:'portfolio.preference.set',owner:true}),
 '/auth21/business/strategy/preference':Object.freeze({engine:'strategy',action:'strategy.preference.set',owner:true})
});
function contract(target){
 return typeof target==='string'&&Object.hasOwn(RULES,target)?RULES[target]:null;
}
function validate(rule,input){
 if(!rule||!input||typeof input!=='object'||Array.isArray(input))return false;
 const fields=Object.keys(input).sort().join(',');
 if(rule.action==='indicator.settings.set')
  return fields==='enabled,refreshMs'&&typeof input.enabled==='boolean'&&
   Number.isSafeInteger(input.refreshMs)&&input.refreshMs>=1000&&input.refreshMs<=60000;
 if(rule.action==='marketdata.settings.set')
  return fields==='refreshMs'&&Number.isSafeInteger(input.refreshMs)&&
   input.refreshMs>=3000&&input.refreshMs<=3600000;
 if(rule.action==='fundamental.feed.create')
  return fields==='feedUrl'&&typeof input.feedUrl==='string'&&
   input.feedUrl.length>=12&&input.feedUrl.length<=240&&
   /^https:\/\/[a-z0-9.-]+\/[a-z0-9/_?.=%&-]*$/i.test(input.feedUrl);
 if(rule.owner)
  return fields==='key,ownerClientId,value'&&
    typeof input.ownerClientId==='string'&&/^CL[A-Za-z0-9_-]{1,64}$/.test(input.ownerClientId)&&
    typeof input.key==='string'&&/^[a-z][a-z0-9._-]{0,31}$/i.test(input.key)&&
    typeof input.value==='string'&&Buffer.byteLength(input.value,'utf8')<=2048;
 return false;
}
module.exports={contract,validate,RULES};
