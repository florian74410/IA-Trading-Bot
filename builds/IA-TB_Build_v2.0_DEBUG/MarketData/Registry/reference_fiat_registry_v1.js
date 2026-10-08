'use strict';

var FIAT={
 USD:{code:'USD',name:'US Dollar',symbol:'$',minorUnit:2,reference:true},
 EUR:{code:'EUR',name:'Euro',symbol:'€',minorUnit:2,reference:true},
 GBP:{code:'GBP',name:'Pound Sterling',symbol:'£',minorUnit:2,reference:true},
 JPY:{code:'JPY',name:'Japanese Yen',symbol:'¥',minorUnit:0,reference:true},
 CNY:{code:'CNY',name:'Chinese Renminbi',symbol:'¥',minorUnit:2,reference:true},
 CHF:{code:'CHF',name:'Swiss Franc',symbol:'CHF',minorUnit:2,reference:true},
 CAD:{code:'CAD',name:'Canadian Dollar',symbol:'C$',minorUnit:2,reference:true}
};

function clone(x){return x?JSON.parse(JSON.stringify(x)):null;}
function get(code){return clone(FIAT[String(code||'').toUpperCase()]);}
function has(code){return !!FIAT[String(code||'').toUpperCase()];}
function list(){return Object.keys(FIAT).map(function(k){return clone(FIAT[k]);});}
function codes(){return Object.keys(FIAT);}
function validate(code){
 var x=get(code);
 if(!x)return{ok:false,reason:'REFERENCE_FIAT_UNKNOWN'};
 if(!/^[A-Z]{3}$/.test(x.code))return{ok:false,reason:'REFERENCE_FIAT_CODE_INVALID'};
 return{ok:true,fiat:x};
}
function snapshot(){return{version:'1.0',type:'REFERENCE_FIAT',count:codes().length,codes:codes(),items:list()};}

module.exports={get:get,has:has,list:list,codes:codes,validate:validate,snapshot:snapshot};
