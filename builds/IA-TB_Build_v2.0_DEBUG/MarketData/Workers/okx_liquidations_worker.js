'use strict';
var parent=require('worker_threads').parentPort,WS=require('../Transport/simple_websocket');
var URL=process.env.IATB_OKX_LIQ_WS||'wss://ws.okx.com:8443/ws/v5/public',ws=null,timer=null,pingTimer=null,stopped=false,retries=0,lastEventAt=0,events=0,lastError='';

function status(state){parent.postMessage({type:'status',provider:'OKX',state:state||((ws&&ws.open)?'ONLINE':'CONNECTING'),events:events,lastEventAt:lastEventAt||null,lastError:lastError||null,retries:retries});}
function symbolOf(x){return String(x&&x.instId||x&&x.instFamily||'').toUpperCase().replace(/-SWAP$/,'').replace(/-/g,'');}
function normalize(o){
 var out=[];(o&&Array.isArray(o.data)?o.data:[]).forEach(function(row){(Array.isArray(row.details)?row.details:[]).forEach(function(d){
  var p=+d.bkPx,q=+d.sz,ts=+d.ts,ps=String(d.posSide||'').toLowerCase(),side=ps==='long'?'LONG':ps==='short'?'SHORT':(String(d.side||'').toLowerCase()==='sell'?'LONG':'SHORT'),sym=symbolOf(row);
  if(!sym||!isFinite(p)||p<=0||!isFinite(q)||q<0||!isFinite(ts))return;
  out.push({provider:'OKX',source:'OKX',provenance:'OKX:liquidation-orders',symbol:sym,side:side,price:p,quantity:q,quantityUnit:'CONTRACT',notionalUsd:null,timestamp:ts,providerEventId:[row.instId,ts,d.posSide,d.side,p,q].join(':'),instrumentId:row.instId||null,instrumentFamily:row.instFamily||null,rawContractSize:q});
 });});return out;
}
function connect(){
 if(stopped)return;status('CONNECTING');ws=new WS(URL,{timeout:30000,maxBytes:4*1024*1024});
 ws.on('open',function(){retries=0;lastError='';try{ws.sendJson({op:'subscribe',args:[{channel:'liquidation-orders',instType:'SWAP'}]});}catch(e){}clearInterval(pingTimer);pingTimer=setInterval(function(){try{if(ws&&ws.open)ws.send('ping');}catch(e){}},20000);status('ONLINE');});
 ws.on('message',function(txt){if(txt==='pong')return;var o;try{o=JSON.parse(txt);}catch(e){return;}if(o&&o.event==='error'){lastError='OKX_'+String(o.code||'WS')+':'+String(o.msg||'');return status('DEGRADED');}normalize(o).forEach(function(x){events++;lastEventAt=Date.now();parent.postMessage({type:'liquidation',event:x});});});
 ws.on('error',function(e){lastError=String(e&&e.message||e);status('DEGRADED');});
 ws.on('close',function(){clearInterval(pingTimer);if(stopped)return;retries++;lastError=lastError||'WEBSOCKET_CLOSED';status('RECONNECTING');clearTimeout(timer);timer=setTimeout(connect,Math.min(30000,1000*Math.pow(2,Math.min(5,retries))));});
}
parent.on('message',function(m){if(m&&m.op==='stop'){stopped=true;clearTimeout(timer);clearInterval(pingTimer);if(ws)ws.close();status('STOPPED');}else if(m&&m.op==='status')status();});
connect();
