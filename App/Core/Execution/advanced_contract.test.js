'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('./manual_contract'),P=require('./manual_preview'),CP=require('../Communication/communication_protocol_v1');
const base={kind:'ORDER',market:'SPOT',body:{instId:'BTC-USDT',tdMode:'cash',side:'buy',ordType:'market',sz:'5',tgtCcy:'quote_ccy',banAmend:true,clOrdId:'fictional1'}};
test('manual schemas reject unknown fields, fields from another command and callback ambiguities',()=>{
 assert.throws(()=>C.validate({...base,body:{...base.body,lever:'10'}}),/FIELD_NOT_APPLICABLE/);
 assert.throws(()=>C.validate({...base,body:{...base.body,callbackRatio:'0.02'}}),/FIELD_NOT_APPLICABLE/);
 const b={instId:'BTC-USDT',tdMode:'cash',side:'sell',ordType:'move_order_stop',sz:'.01',algoClOrdId:'fictional2',callbackRatio:'0.02',callbackSpread:'2'};
 assert.throws(()=>C.validate({kind:'ALGO',market:'SPOT',body:b}),/NUMERIC|CALLBACK/);
 assert.throws(()=>C.validate({...base,body:{...base.body,banAmend:'false'}}),/BOOLEAN/);
 assert.throws(()=>C.validate({...base,body:{...base.body,px:'100'}}),/PRICE_NOT_APPLICABLE/);
});
test('every qualified mutation maps to its own CP1 command and exact OKX endpoint',()=>{
 assert.equal(new Set(Object.values(C.ACTIONS)).size,8);assert(!C.isAction('trading.manual.arbitrary'));
 assert.equal(C.endpoint({kind:'LEVERAGE'}),'/api/v5/account/set-leverage');assert.equal(C.endpoint({kind:'ALGO'}),'/api/v5/trade/order-algo');assert.equal(C.endpoint({kind:'BATCH'}),'/api/v5/trade/batch-orders');
});
test('exact decimal lot/tick arithmetic does not round an invalid financial amount',()=>{
 assert.equal(P.multiple('0.00000003','0.00000001'),true);assert.equal(P.multiple('0.000000031','0.00000001'),false);
 assert.equal(P.quoteToBase('100','60000','0.00001'),'0.00166');assert.equal(P.quoteToBase('0.1','0.3','0.01'),'0.33');
 assert.throws(()=>C.decimal('1e-8'));assert.throws(()=>C.decimal('1'.repeat(100)));
});
test('wire response digest matches the actual JSON payload when optional values are absent',()=>{
 const q=CP.makeRequest('trading','trading.health',{}),r=CP.makeResponse(q,'OK',{present:1,missing:undefined,metric:null});assert(CP.validateResponse(JSON.parse(JSON.stringify(r)),q).ok);assert.equal(r.data.metric,null);assert(!Object.hasOwn(r.data,'missing'));
 r.data.present=2;assert.equal(CP.validateResponse(r,q).ok,false);
});
test('missing analytic fees remain null and a sale preview is net of known fees',()=>{
 const spec={...base,body:{...base.body,side:'sell',sz:'0.05',tgtCcy:'base_ccy'}},pre={instrument:{quoteCcy:'USDT',baseCcy:'BTC'},ticker:[{last:'100'}],fees:null,balances:[],observed_at:Date.now()};
 assert.equal(P.preview(spec,pre,null).estimated_total,null);assert.equal(P.preview(spec,pre,null).fee_rate,null);
 const known=P.preview(spec,{...pre,fees:[{taker:'-0.001'}]},null);assert.equal(known.estimated_total,4.995);assert.equal(known.liquidation_price,null);
});
