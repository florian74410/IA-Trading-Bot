'use strict';
var Build=require('../Extensions/AutonomousTrading/context_builder');
function Orchestrator(client){this.client=client;}
function settle(name,p){return p.then(function(data){return{name:name,ok:true,data:data,error:null};},function(e){return{name:name,ok:false,data:null,error:String(e&&e.message||e).slice(0,240)};});}
Orchestrator.prototype.collect=function(input){input=input||{};var symbol=String(input.symbol||'BTCUSD').toUpperCase(),timeframe=String(input.timeframe||'1h').toLowerCase(),source=input.source?String(input.source):undefined,c=this.client;
var tasks=[
 settle('marketData',c.request('marketdata','marketdata.candles',{symbol:symbol,timeframe:timeframe,limit:Math.max(20,Math.min(500,+input.limit||200)),force:false,source:source},'analysis')),
 settle('indicators',c.request('indicator','indicator.analyze',{symbol:symbol,timeframe:timeframe,force:false},'analysis')),
 settle('fundamental',c.request('fundamental','fundamental.analyze',{asset:symbol,horizon:timeframe,limit:Math.max(5,Math.min(100,+input.fundamentalLimit||30))},'analysis')),
 settle('liquidity',c.request('liquidity','liquidity.snapshot',{symbol:symbol,timeframe:timeframe,limit:Math.max(20,Math.min(500,+input.limit||200)),source:source},'analysis')),
 settle('portfolio',c.request('portfolio','portfolio.snapshot',{force:false},'analysis')),
 settle('strategy',c.request('strategy','strategy.evaluate',{symbol:symbol,timeframe:timeframe,correlation_id:String(input.correlationId||'')},'analysis')),
 settle('risk',c.request('risk','risk.snapshot',{symbol:symbol,timeframe:timeframe},'analysis'))
];
return Promise.all(tasks).then(function(rows){var x={symbol:symbol,timeframe:timeframe},availability={},warnings=[];rows.forEach(function(r){x[r.name]=r.data;availability[r.name]=r.ok;if(!r.ok)warnings.push(r.name.toUpperCase()+'_UNAVAILABLE:'+r.error);});var context=Build(x);context.timeframe=timeframe;context.availability=availability;context.warnings=warnings;context.degraded=warnings.length>0;context.transport='CP/1 Router only';return context;});};
module.exports=Orchestrator;