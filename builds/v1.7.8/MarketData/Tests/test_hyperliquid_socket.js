'use strict';
var Hyperliquid=require('../Provider/hyperliquid_provider');
function fail(m){console.error('FAIL '+m);process.exit(1);}var p=new Hyperliquid({coin:'BTC',interval:'1h'}),s=p.status();
if(p.name!=='HYPERLIQUID')fail('provider name');if(p.type!=='SOCKET')fail('provider type');if(s.type!=='SOCKET')fail('status type');if(typeof p.getCandles!=='function'||typeof p.subscribeCandles!=='function')fail('market-data contract');
if(process.env.IATB_LIVE_HYPERLIQUID_TEST==='1'){p.getCandles('BTCUSD','1h',function(e,o){if(e)fail(e.message);if(!o||!Array.isArray(o.candles)||!o.candles.length)fail('no candles');console.log('PASS HYPERLIQUID live candles='+o.candles.length+' volume='+o.volumeAvailable);p.close();process.exit(0);});setTimeout(function(){fail('live timeout');},15000);}else{console.log('PASS HYPERLIQUID SOCKET contract (set IATB_LIVE_HYPERLIQUID_TEST=1 for network test)');p.close();}
