'use strict';

var FIAT={
 USD:{code:'USD',name:'US Dollar',symbol:'$',minorUnit:2,monetaryArea:'United States'},
 EUR:{code:'EUR',name:'Euro',symbol:'€',minorUnit:2,monetaryArea:'Euro area'},
 GBP:{code:'GBP',name:'Pound Sterling',symbol:'£',minorUnit:2,monetaryArea:'United Kingdom'},
 JPY:{code:'JPY',name:'Japanese Yen',symbol:'¥',minorUnit:0,monetaryArea:'Japan'},
 CNY:{code:'CNY',name:'Chinese Renminbi',symbol:'¥',minorUnit:2,monetaryArea:'China'},
 CHF:{code:'CHF',name:'Swiss Franc',symbol:'CHF',minorUnit:2,monetaryArea:'Switzerland'},
 CAD:{code:'CAD',name:'Canadian Dollar',symbol:'C$',minorUnit:2,monetaryArea:'Canada'}
};

var STABLE={
 USDT:{symbol:'USDT',name:'Tether USD',referenceFiat:'USD',class:'FIAT_PEGGED_STABLE_ASSET'},
 USDC:{symbol:'USDC',name:'USD Coin',referenceFiat:'USD',class:'FIAT_PEGGED_STABLE_ASSET'},
 DAI:{symbol:'DAI',name:'Dai',referenceFiat:'USD',class:'CRYPTO_COLLATERALIZED_STABLE_ASSET'},
 EURC:{symbol:'EURC',name:'Euro Coin',referenceFiat:'EUR',class:'FIAT_PEGGED_STABLE_ASSET'}
};

function clone(x){return x?JSON.parse(JSON.stringify(x)):null;}
function key(x){return String(x||'').toUpperCase();}
function getFiat(x){return clone(FIAT[key(x)]);}
function getStableAsset(x){return clone(STABLE[key(x)]);}
function fiatCodes(){return Object.keys(FIAT);}
function stableAssetSymbols(){return Object.keys(STABLE);}

function resolve(x){
 x=key(x);
 if(FIAT[x])return{id:x,entityType:'FIAT',fiat:getFiat(x),referenceFiat:getFiat(x)};
 if(STABLE[x])return{id:x,entityType:'STABLE_ASSET',stableAsset:getStableAsset(x),referenceFiat:getFiat(STABLE[x].referenceFiat)};
 return null;
}

function registerStableAsset(x){
 x=x||{};
 var s=key(x.symbol),f=key(x.referenceFiat||x.pegCurrency);
 if(!/^[A-Z0-9]{2,16}$/.test(s))throw new Error('CURRENCY_REGISTRY_STABLE_ASSET_SYMBOL_INVALID');
 if(!FIAT[f])throw new Error('CURRENCY_REGISTRY_REFERENCE_FIAT_UNKNOWN: '+f);
 STABLE[s]={symbol:s,name:String(x.name||s),referenceFiat:f,class:key(x.class||'STABLE_ASSET')};
 return getStableAsset(s);
}

function receipt(symbol,amount,unit,priceUsd,normalizedUsd){
 var x=resolve(symbol);
 if(!x||x.entityType!=='STABLE_ASSET')return null;
 return{sourceAsset:x.id,sourceAmount:amount==null?null:+amount,sourceUnit:key(unit||x.id),referenceFiat:x.referenceFiat.code,observedAssetPriceUsd:priceUsd==null?null:+priceUsd,normalizedUsd:normalizedUsd==null?null:+normalizedUsd};
}

function validate(){
 var e=[];
 Object.keys(STABLE).forEach(function(k){if(!FIAT[STABLE[k].referenceFiat])e.push(k+':REFERENCE_FIAT_UNKNOWN');});
 return{ok:e.length===0,errors:e};
}

function snapshot(){
 return{version:'1.0',type:'CURRENCY_REGISTRY',fiatCount:fiatCodes().length,stableAssetCount:stableAssetSymbols().length,fiat:fiatCodes().map(getFiat),stableAssets:stableAssetSymbols().map(getStableAsset)};
}

module.exports={getFiat:getFiat,getStableAsset:getStableAsset,fiatCodes:fiatCodes,stableAssetSymbols:stableAssetSymbols,resolve:resolve,registerStableAsset:registerStableAsset,receipt:receipt,validate:validate,snapshot:snapshot};
