'use strict';
var parent=require('worker_threads').parentPort,WS=require('../Transport/simple_websocket');
var URL=process.env.IATB_BINANCE_LIQ_WS||'wss://fstream.binance.com/ws/!forceOrder@arr',ws=null,timer=null,stopped=false,retries=0,lastEventAt=0,events=0,lastError='';

function status(state){parent.postMessage({type:'status',provider:'BINANCE_FUTURES',state:state||((ws&&ws.open)?'ONLINE':'CONNECTING'),events:events,lastEventAt:lastEventAt||null,lastError:lastError||null,retries:retries});}
function normalize(x){
 x=x&&x.data?x.data:x;if(Array.isArray(x)){var out=[];x.forEach(function(y){var n=normalize(y);if(n)Array.isArray(n)?out.push.apply(out,n):out.push(n);});return out;}
 if(!x||x.e!=='forceOrder'||!x.o)return null;var o=x.o,p=+(o.ap||o.p),q=+(o.z||o.l||o.q),ts=+(o.T||x.E||Date.now()),side=String(o.S||'').toUpperCase()==='SELL'?'LONG':'SHORT';
 if(!o.s||!isFinite(p)||p<=0||!isFinite(q)||q<0)return null;
 return{provider:'BINANCE_FUTURES',source:'BINANCE_FUTURES',provenance:'BINANCE_FUTURES:forceOrder',symbol:String(o.s).toUpperCase(),side:side,price:p,quantity:q,quantityUnit:'BASE',notionalUsd:p*q,timestamp:ts,providerEventId:[o.s,ts,o.S,p,q].join(':')};
}
function connect(){
 if(stopped)return;status('CONNECTING');ws=new WS(URL,{timeout:30000,maxBytes:2*1024*1024});
 ws.on('open',function(){retries=0;lastError='';status('ONLINE');});
 ws.on('message',function(txt){var o;try{o=JSON.parse(txt);}catch(e){return;}var rows=normalize(o);if(!rows)return;if(!Array.isArray(rows))rows=[rows];rows.forEach(function(x){if(!x)return;events++;lastEventAt=Date.now();parent.postMessage({type:'liquidation',event:x});});});
 ws.on('error',function(e){lastError=String(e&&e.message||e);status('DEGRADED');});
 ws.on('close',function(){if(stopped)return;retries++;lastError=lastError||'WEBSOCKET_CLOSED';status('RECONNECTING');clearTimeout(timer);timer=setTimeout(connect,Math.min(30000,1000*Math.pow(2,Math.min(5,retries))));});
}
parent.on('message',function(m){if(m&&m.op==='stop'){stopped=true;clearTimeout(timer);if(ws)ws.close();status('STOPPED');}else if(m&&m.op==='status')status();});
connect();
