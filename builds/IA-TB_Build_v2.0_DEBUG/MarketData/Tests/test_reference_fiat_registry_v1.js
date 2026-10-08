'use strict';

var assert=require('assert');
var Fiat=require('../Registry/reference_fiat_registry_v1');
var Stable=require('../Registry/stable_asset_registry_v1');

assert.deepEqual(Fiat.codes(),['USD','EUR','GBP','JPY','CNY','CHF','CAD']);
assert.equal(Fiat.snapshot().count,7);
assert.equal(Fiat.get('usd').code,'USD');
assert.equal(Fiat.get('JPY').minorUnit,0);
assert.equal(Fiat.has('CHF'),true);
assert.equal(Fiat.has('AUD'),false);
assert.equal(Fiat.validate('CAD').ok,true);
assert.equal(Fiat.validate('XYZ').ok,false);

assert.equal(Stable.get('USDT').pegCurrency,'USD');
assert.equal(Stable.get('USDC').pegCurrency,'USD');
assert.equal(Stable.get('DAI').pegCurrency,'USD');
assert.equal(Stable.get('EURC').pegCurrency,'EUR');

assert.throws(function(){
 Stable.register({symbol:'TESTCHF',name:'Test CHF',pegCurrency:'ZZZ'});
},/STABLE_ASSET_REFERENCE_FIAT_UNKNOWN/);

var chf=Stable.register({symbol:'TESTCHF',name:'Test CHF',pegCurrency:'CHF',class:'TEST_STABLE_ASSET'});
assert.equal(chf.pegCurrency,'CHF');

var receipt=Stable.receipt('USDT',1000,'USDT',0.9998,999.8);
assert.deepEqual(receipt,{
 stableAsset:'USDT',
 pegCurrency:'USD',
 sourceAmount:1000,
 sourceUnit:'USDT',
 observedAssetPriceUsd:0.9998,
 normalizedUsd:999.8
});

console.log('PASS Reference Fiat + Stable Asset Registry v1 contract');
