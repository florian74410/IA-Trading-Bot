'use strict';
var fs=require('fs'),path=require('path'),assert=require('assert');
var ROOT=path.resolve(__dirname,'../..');
var specs=[
 ['Indicators/Engine/indicator_service.js',[]],
 ['Fundamental/Engine/fundamental_service.js',[]],
 ['Liquidity/Engine/liquidity_service.js',[]],
 ['Portfolio/Engine/portfolio_service.js',[]],
 ['Strategy/Engine/strategy_service.js',[]],
 ['Risk/Engine/risk_service.js',[]],
 ['services/trading-engine/trading_service.js',[]],
 ['Supervisor/supervisor_service.js',[]]
];
var forbidden=["'/api/settings'","'/api/capabilities'","'/api/catalog'","'/api/status'","'/api/overview'","'/api/history'","'/api/trades'","'/api/events'"];
specs.forEach(function(x){var c=fs.readFileSync(path.join(ROOT,x[0]),'utf8');forbidden.forEach(function(s){assert(c.indexOf(s)<0,x[0]+' exposes duplicate HTTP route '+s);});});
var md=fs.readFileSync(path.join(ROOT,'MarketData/market_data_service.js'),'utf8');
assert(md.indexOf("p==='/candles'")>=0,'Market Data candles data-plane missing');
assert(md.indexOf("p==='/health'")>=0,'Market Data health missing');
['/settings','/registry/','/microstructure/','/liquidity/','/financial/','/derivatives/'].forEach(function(s){assert(md.indexOf(s)<0,'Market Data compatibility HTTP surface remains: '+s);});
console.log('[ENGINE-HTTP-SURFACE] OK v2.0');
