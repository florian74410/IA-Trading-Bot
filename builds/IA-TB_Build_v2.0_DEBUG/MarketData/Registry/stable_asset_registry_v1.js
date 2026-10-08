'use strict';

var Fiat=require('./reference_fiat_registry_v1');

var ASSETS={
 USDT:{symbol:'USDT',name:'Tether USD',pegCurrency:'USD',class:'FIAT_PEGGED_STABLE_ASSET'},
 USDC:{symbol:'USDC',name:'USD Coin',pegCurrency:'USD',class:'FIAT_PEGGED_STABLE_ASSET'},
 DAI:{symbol:'DAI',name:'Dai',pegCurrency:'USD',class:'CRYPTO_COLLATERALIZED_STABLE_ASSET'},
 EURC:{symbol:'EURC',name:'Euro Coin',pegCurrency:'EUR',class:'FIAT_PEGGED_STABLE_ASSET'}
};

function clone(x){return x?JSON.parse(JSON.stringify(x)):null;}
function get(symbol){return clone(ASSETS[String(symbol||'').toUpperCase()]);}
function has(symbol){return !!ASSETS[String(symbol||'').toUpperCase()];}
function list(){return Object.keys(ASSETS).map(function(k){return clone(ASSETS[k]);});}
function register(x){
 x=x||{};var symbol=String(x.symbol||'').toUpperCase(),peg=String(x.pegCurrency||'').toUpperCase();
 if(!/^[A-Z0-9]{2,16}$/.test(symbol))throw new Error('STABLE_ASSET_SYMBOL_INVALID');
 if(!Fiat.has(peg))throw new Error('STABLE_ASSET_REFERENCE_FIAT_UNKNOWN: '+peg);
 ASSETS[symbol]={symbol:symbol,name:String(x.name||symbol),pegCurrency:peg,class:String(x.class||'STABLE_ASSET').toUpperCase()};
 return get(symbol);
}
function receipt(symbol,sourceAmount,sourceUnit,priceUsd,normalizedUsd){
 var a=get(symbol);if(!a)return null;
 return{
  stableAsset:a.symbol,
  pegCurrency:a.pegCurrency,
  sourceAmount:sourceAmount==null?null:+sourceAmount,
  sourceUnit:String(sourceUnit||a.symbol).toUpperCase(),
  observedAssetPriceUsd:priceUsd==null?null:+priceUsd,
  normalizedUsd:normalizedUsd==null?null:+normalizedUsd
 };
}
function snapshot(){return{version:'1.0',type:'STABLE_ASSET',count:Object.keys(ASSETS).length,items:list()};}

module.exports={get:get,has:has,list:list,register:register,receipt:receipt,snapshot:snapshot};
