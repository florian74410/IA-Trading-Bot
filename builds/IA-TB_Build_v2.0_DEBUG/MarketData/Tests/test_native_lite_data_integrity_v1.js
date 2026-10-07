'use strict';

var assert=require('assert');
var Policy=require('../Orchestrator/data_source_policy');
var Orchestrator=require('../Orchestrator/api_request_orchestrator');
var wrap=require('../Orchestrator/shadow_provider_proxy');
var signature=wrap.signature;

var p=new Policy();
p.setProviderDefaults('TEST',{cacheTtlMs:5000,priority:'P2',freshness:'STANDARD',criticality:'NORMAL'});
p.register({provider:'TEST',dataset:'COMPLEX',cacheTtlMs:5000});

var o=new Orchestrator({mode:'SHADOW',policy:p,cacheFirst:true,dedup:true,maxCacheEntries:16,maxCacheBytes:4*1024*1024});
var calls=0;
var raw={
 getComplex:function(input,cb){
  calls++;
  setTimeout(function(){
   cb(null,{
    input:input,
    nested:{price:123.45,arr:[1,{safe:true}]},
    bytes:Buffer.from('abc'),
    producedByCall:calls
   });
  },30);
 }
};
var provider=wrap(raw,{provider:'TEST',orchestrator:o,methods:{getComplex:{dataset:'COMPLEX'}}});

function testSignature(){
 var a={z:1,a:{b:2,a:3},long:'x'.repeat(3000)};
 var b={long:'x'.repeat(3000),a:{a:3,b:2},z:1};
 var c={long:'x'.repeat(2999)+'y',a:{a:3,b:2},z:1};
 assert.equal(signature([a]),signature([b]),'canonical signature must ignore object key ordering');
 assert.notEqual(signature([a]),signature([c]),'full payload must influence signature beyond 1000 chars');
 assert.equal(signature([a]).length,64,'signature must be SHA-256 hex');
}

testSignature();

provider.getComplex({symbol:'BTCUSD',opts:{b:2,a:1}},function(err,first){
 assert.ifError(err);
 assert.equal(calls,1);

 var baseline=JSON.parse(JSON.stringify({input:first.input,nested:first.nested,producedByCall:first.producedByCall}));
 first.nested.price=999999;
 first.nested.arr[1].safe=false;
 first.input.opts.a=999;
 first.bytes[0]=0;

 provider.getComplex({opts:{a:1,b:2},symbol:'BTCUSD'},function(err2,second){
  assert.ifError(err2);
  assert.equal(calls,1,'equivalent reordered request must be served from cache');
  assert.deepEqual({input:second.input,nested:second.nested,producedByCall:second.producedByCall},baseline,'consumer mutation must not contaminate cached payload');
  assert.equal(second.bytes.toString(),'abc','buffer mutation must not contaminate cache');

  var got=[];
  function done(e,v){
   assert.ifError(e);got.push(v);
   if(got.length<2)return;
   assert.equal(calls,2,'concurrent identical request must collapse to one provider call');
   got[0].nested.price=-1;
   got[0].nested.arr[1].safe=false;
   assert.equal(got[1].nested.price,123.45,'dedup consumers must receive isolated objects');
   assert.equal(got[1].nested.arr[1].safe,true,'dedup nested objects must be isolated');

   provider.getComplex({symbol:'ETHUSD'},function(e3,third){
    assert.ifError(e3);
    assert.equal(calls,2,'post-dedup request must be served from intact cache');
    assert.equal(third.nested.price,123.45);
    assert.equal(third.nested.arr[1].safe,true);

    var st=o.status();
    assert.equal(st.broker.stats.cloneFailures,0);
    assert(st.broker.stats.cacheHitsServed>=2);
    assert(st.broker.stats.dedupServed>=1);
    console.log('PASS Native-Lite Data Integrity Contract');
   });
  }
  provider.getComplex({symbol:'ETHUSD'},done);
  provider.getComplex({symbol:'ETHUSD'},done);
 });
});
