'use strict';
var fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
var ROOT=path.resolve(__dirname,'../..');
var html=fs.readFileSync(path.join(ROOT,'Frontend/Pages/app_v1.0.html'),'utf8');
var code=fs.readFileSync(path.join(ROOT,'Frontend/JS/chart_controller_native_v1.2.js'),'utf8');
assert(html.indexOf('/assets/chart_controller_native_v1.2.js')>=0,'native v1.2 asset missing');
assert(html.indexOf('function mergeMarketBatch(')>=0,'full market batch merge missing');
assert(html.indexOf('S.a=mergeMarketBatch(S.a,c,n)')>=0,'poll does not merge complete candle batch');
assert(html.indexOf('S.a.length<1')>=0,'single candle rendering gate missing');
assert(html.indexOf('function renderInteractiveChart(){if(!S.chartCtl||S.a.length<1)')>=0,'interactive chart still requires two candles');
assert(html.indexOf('window.IATBChartRenderState=')>=0,'UI render diagnostics missing');
assert(html.indexOf("+' bougie'+(count>1?'s':'')")>=0,'market candle-count status missing');

var win={devicePixelRatio:1,requestAnimationFrame:function(fn){return 1;},addEventListener:function(){},CustomEvent:function(){}};
var sandbox={window:win,document:{},CustomEvent:function(){},console:console,Date:Date,Math:Math,Number:Number,String:String,Object:Object,Array:Array,isFinite:isFinite};
vm.runInNewContext(code,sandbox,{filename:'chart_controller_native_v1.2.js'});
var C=win.IATBChartController;
assert(C,'IATBChartController not exported');
var ctl=Object.create(C.prototype);
ctl.rows=[];ctl.visibleCount=100;ctl.panOffset=0;ctl.series={price:{}};ctl.indicatorSeries={};ctl.priceLines={};ctl.liquidityZones=[];ctl.markers=[];ctl.context={symbol:'BTCUSD',timeframe:'1m'};ctl.lastRenderStats={received:0,accepted:0,visible:0,rendered:0,width:0,height:0,at:0};ctl.invalidate=function(){};
var accepted=ctl.setCandles([{time:1700000000,open:100,high:102,low:99,close:101,volume:5}]);
assert.strictEqual(accepted,1,'single candle not accepted');
assert.strictEqual(ctl.visibleRows().length,1,'single candle not visible');
var ops={fillRect:0,stroke:0};
var ctx={setTransform:function(){},clearRect:function(){},fillRect:function(){ops.fillRect++;},beginPath:function(){},moveTo:function(){},lineTo:function(){},stroke:function(){ops.stroke++;},fillText:function(){},strokeRect:function(){},save:function(){},restore:function(){},setLineDash:function(){},closePath:function(){},fill:function(){},font:'',lineWidth:1,fillStyle:'',strokeStyle:''};
ctl.canvas={width:0,height:0};ctl.ctx=ctx;ctl.container={clientWidth:640,clientHeight:360};ctl.crosshair=null;
ctl.draw();
assert.strictEqual(ctl.getRenderState().rendered,1,'single candle was not rendered');
assert(ops.fillRect>=2,'canvas body/background not drawn');

var ctl100=Object.create(C.prototype);ctl100.rows=[];ctl100.visibleCount=100;ctl100.panOffset=0;ctl100.series={price:{}};ctl100.indicatorSeries={};ctl100.priceLines={};ctl100.liquidityZones=[];ctl100.markers=[];ctl100.context={symbol:'BTCUSD',timeframe:'1m'};ctl100.lastRenderStats={received:0,accepted:0,visible:0,rendered:0,width:0,height:0,at:0};ctl100.invalidate=function(){};
var rows100=[];for(var z=0;z<100;z++){var base=100+z*.1;rows100.push({time:1700000000+z*60,open:base,high:base+1,low:base-1,close:base+.25,volume:z+1});}
assert.strictEqual(ctl100.setCandles(rows100),100,'100-candle batch not accepted');
ctl100.canvas={width:0,height:0};ctl100.ctx=ctx;ctl100.container={clientWidth:900,clientHeight:420};ctl100.crosshair=null;ctl100.draw();
assert.strictEqual(ctl100.getRenderState().rendered,100,'100 candles were not rendered');

console.log('[NATIVE-CHART-RENDER] OK v1.11.5 single=1 rendered=1 batch=100 rendered=100');
