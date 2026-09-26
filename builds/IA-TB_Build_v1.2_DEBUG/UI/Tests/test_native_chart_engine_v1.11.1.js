'use strict';
var fs=require('fs'),path=require('path'),ROOT=path.resolve(__dirname,'../..');
function ok(v,m){if(!v)throw new Error(m)}
var app=fs.readFileSync(path.join(ROOT,'Frontend/Pages/app_v1.0.html'),'utf8');
var native=fs.readFileSync(path.join(ROOT,'Frontend/JS/chart_controller_native_v1.0.js'),'utf8');
var tv=fs.readFileSync(path.join(ROOT,'Frontend/Pages/chart_viewer_v1.0.html'),'utf8');
ok(app.indexOf('lightweight-charts@')<0,'IA Trading View must not load TradingView Lightweight Charts');
ok(app.indexOf('/assets/chart_controller_native_v1.0.js')>=0,'native chart controller missing');
ok(app.indexOf('Moteur Graphique IA-TB')>=0,'native attribution missing');
ok(native.indexOf("global.IATBChartController=IATBChartController")>=0,'native controller API missing');
ok(native.indexOf('applyIndicatorBatch')>=0,'Indicator Engine overlay contract missing');
ok(native.indexOf('volume')>=0,'volume renderer missing');
ok(tv.indexOf('tradingview')>=0||tv.indexOf('TradingView')>=0,'external Chart Viewer must remain TradingView-based');
console.log('Native Chart Engine v1.11.1 contract: OK');
