'use strict';

var PASSPORTS={
 COINGECKO:{
  provider:'COINGECKO',status:'PARTIAL',transports:['REST'],
  quota:{model:'DEMO_KNOWN_ANONYMOUS_UNKNOWN',provenance:['DOCUMENTED','OBSERVED_429','UNKNOWN'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['Demo profile documented; anonymous runtime limits remain UNKNOWN.']
 },
 DEFILLAMA:{
  provider:'DEFILLAMA',status:'PARTIAL',transports:['REST'],
  quota:{model:'UNKNOWN',provenance:['UNKNOWN'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['Cache/policy available; hard provider quota is intentionally not invented.']
 },
 GMX:{
  provider:'GMX',status:'PARTIAL',transports:['REST'],
  quota:{model:'UNKNOWN',provenance:['UNKNOWN'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['Provider policy exists; hard rate limit remains UNKNOWN.']
 },
 DEXSCREENER:{
  provider:'DEXSCREENER',status:'READY',transports:['REST'],
  quota:{model:'RPM',provenance:['DOCUMENTED'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['Known route-family budget; enforcement remains Shadow by project policy.']
 },
 BINANCE:{
  provider:'BINANCE',status:'READY',transports:['REST','STREAM'],
  quota:{model:'WEIGHTED_MULTI_SCOPE',provenance:['DOCUMENTED'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['Spot and USD-M weighted scopes modeled; enforcement remains Shadow.']
 },
 HYPERLIQUID:{
  provider:'HYPERLIQUID',status:'READY',transports:['REST','STREAM'],
  quota:{model:'WEIGHTED',provenance:['DOCUMENTED'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['REST weight model configured and observed in telemetry.']
 },
 KRAKEN:{
  provider:'KRAKEN',status:'PARTIAL',transports:['REST'],
  quota:{model:'SAFE_PACE',provenance:['SAFE_RECOMMENDATION'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['Safe pacing is conservative; exact public hard limits are not treated as known.']
 },
 OKX:{
  provider:'OKX',status:'PARTIAL',transports:['REST','STREAM'],
  quota:{model:'MIXED_ENDPOINT',provenance:['DOCUMENTED','UNKNOWN'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['Candles/books documented; open-interest remains observe-only/UNKNOWN.']
 },
 BYBIT:{
  provider:'BYBIT',status:'PARTIAL',transports:['REST','STREAM'],
  quota:{model:'MULTI_SCOPE_DYNAMIC',provenance:['DOCUMENTED','OBSERVED_HEADER'],nativeEnforcementReady:false},
  policy:{defined:true,ttlDefined:true,priorityDefined:true,criticalityDefined:true},
  notes:['Global IP limit documented; endpoint limits learned from response headers.']
 }
};

function get(provider){
 var id=String(provider||'').toUpperCase(),x=PASSPORTS[id];
 return x?JSON.parse(JSON.stringify(x)):null;
}
function list(){return Object.keys(PASSPORTS).map(get);}
function summary(){
 var out={total:0,ready:0,partial:0,unknown:0,nativeEnforcementReady:0};
 list().forEach(function(x){out.total++;if(x.status==='READY')out.ready++;else if(x.status==='PARTIAL')out.partial++;else out.unknown++;if(x.quota.nativeEnforcementReady)out.nativeEnforcementReady++;});
 return out;
}
function validate(p){
 var x=get(p);if(!x)return{ok:false,reason:'PROVIDER_PASSPORT_MISSING'};
 var required=['provider','status','transports','quota','policy','notes'];
 for(var i=0;i<required.length;i++)if(x[required[i]]==null)return{ok:false,reason:'PROVIDER_PASSPORT_FIELD_MISSING:'+required[i]};
 if(!x.quota.model||!Array.isArray(x.quota.provenance))return{ok:false,reason:'PROVIDER_PASSPORT_QUOTA_INCOMPLETE'};
 return{ok:true,passport:x};
}
module.exports={get:get,list:list,summary:summary,validate:validate};
