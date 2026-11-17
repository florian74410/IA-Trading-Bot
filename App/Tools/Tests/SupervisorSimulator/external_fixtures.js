'use strict';
// Test preload at external provider boundaries only. CP1 handlers, Router, Risk,
// Portfolio, Trading, Firewall and Vault remain the actual application modules.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../..');
if(process.env.IATB_SIMULATOR_EXTERNAL_FIXTURES!=='1'||!process.env.IATB_SIMULATOR_EXTERNAL_LOG)throw Error('ISOLATED_EXTERNAL_FIXTURES_REQUIRED');
const log=row=>fs.appendFileSync(process.env.IATB_SIMULATOR_EXTERNAL_LOG,JSON.stringify(row)+'\n');
const {apiFixture}=require('../../../Portfolio/Tests/okx_fixture'),api=apiFixture();
require('../../../services/trading-engine/http-transport').requestJson=async request=>{const u=new URL(request.url);log({kind:'exchange',method:request.method||'GET',path:u.pathname});if(process.env.IATB_SIMULATOR_EXTERNAL_FAULT_FILE&&fs.existsSync(process.env.IATB_SIMULATOR_EXTERNAL_FAULT_FILE))return {statusCode:200,body:{code:'0',data:{malformed:true}}};return api.transport(request);};
const Provider=require('../../../MarketData/Provider/reference_provider');
Provider.prototype.getCandles=function(symbol,timeframe,source,callback){const now=Date.now();log({kind:'market',dataset:'candles',symbol,timeframe});callback(null,{ok:true,provider:'OKX',exchange:'OKX',providerId:'OKX',canonicalSymbol:symbol,timeframe,priceSource:'OKX',timestampUnit:'ms',volumeAvailable:true,volumeSource:'OKX_NATIVE',candles:Array.from({length:301},(_,i)=>[now-(301-i)*60000,100,101,99,100+Math.sin(i)*.005,10])});};
const Microstructure=require('../../../MarketData/Provider/microstructure_provider');
Microstructure.prototype.getSnapshot=function(symbol,source,depth,callback){log({kind:'market',dataset:'book',symbol});callback(null,{ok:true,schema:'marketdata.microstructure/1.0',symbol,canonicalSymbol:symbol,source:'OKX',market_type:'SPOT',observedAt:Date.now(),orderBook:{bids:[{price:99.99,size:10000}],asks:[{price:100.01,size:10000}]},openInterest:null,liquidations:[]});};
