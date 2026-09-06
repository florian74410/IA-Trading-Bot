'use strict';
var assert=require('assert'),PE=require('../Engine/portfolio_engine');
var rows=[
 {event_type:'ORDER_FILLED',exchange:'KRAKEN',symbol:'BTC/EUR',side:'BUY',position_side:'LONG',quantity:0.1,price:50000,fee:2,funding:0,timestamp:1,payload_json:JSON.stringify({reduce_only:false})},
 {event_type:'ORDER_FILLED',exchange:'KRAKEN',symbol:'BTC/EUR',side:'BUY',position_side:'LONG',quantity:0.1,price:52000,fee:2,funding:0,timestamp:2,payload_json:JSON.stringify({reduce_only:false})},
 {event_type:'POSITION_REDUCED',exchange:'KRAKEN',symbol:'BTC/EUR',side:'SELL',position_side:'LONG',quantity:0.1,price:53000,fee:2,funding:0,timestamp:3,payload_json:JSON.stringify({reduce_only:true})}
];
var out=PE.buildPositions(rows,{'BTC/EUR':54000});assert.equal(out.positions.length,1);assert.equal(out.positions[0].quantity,0.1);assert.equal(Math.round(out.positions[0].average_entry),51000);assert.equal(Math.round(out.positions[0].unrealized_pnl),300);var e=PE.normalizeEvent({event_type:'ORDER_FILLED',exchange:'KRAKEN',symbol:'BTC/EUR',filled_quantity:'0.1',average_price:'53000',request_id:'r1',timestamp:100});assert.equal(e.event_type,'ORDER_FILLED');assert.ok(e.event_id);assert.ok(e.dedup_key.length===64);console.log('PASS Portfolio Engine reconstruction + normalization');
