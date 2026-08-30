'use strict';
/* Static guard for the lightweight v1.7.9 wrapper.
   It does not require network access and catches accidental loss of the stable v1.7.8 patch markers.
*/
var assert=require('assert'),fs=require('fs'),path=require('path');
var ROOT=path.resolve(__dirname,'../../..');
var html=fs.readFileSync(path.join(ROOT,'builds','v1.7.8','Frontend','Pages','app_v1.0.html'),'utf8');
var wrapper=fs.readFileSync(path.join(ROOT,'Update','v1.7.9','Core','Server','server_v1.7.9.js'),'utf8');
[
 '<select id="exchangeSelect" title="Exchange"><option value="GMX">GMX</option><option value="KRAKEN">Kraken</option></select>',
 "function queryExchange(){var m=String(location.search||'').match(/[?&]exchange=([^&]+)/i);var v=m?decodeURIComponent(m[1]).toUpperCase():'GMX';return v==='KRAKEN'?'KRAKEN':'GMX'}",
 "function switchExchange(exchange,preserveUrl){exchange=String(exchange||'GMX').toUpperCase()==='KRAKEN'?'KRAKEN':'GMX';",
 "var u=S.marketSource==='KRAKEN'?('/router-api/exchange/klines?exchange=KRAKEN&symbol='+encodeURIComponent(S.symbol)+'&interval='+encodeURIComponent(S.interval)+'&limit='+n):('/api/market/klines?source=GMX&symbol='+encodeURIComponent(S.symbol)+'&interval='+encodeURIComponent(S.interval)+'&limit='+n);"
].forEach(function(marker){assert.ok(html.indexOf(marker)>=0,'Stable UI marker missing: '+marker.slice(0,80));});
[
 'function injectTradingFx(raw)',
 '<option value=\\"FX\\">ƒx</option>',
 '/api/market/fx-klines',
 '/candles/consensus?symbol=',
 "S.marketSource==='FX'",
 "volume:c&&c.length>5?+c[5]:null"
].forEach(function(marker){assert.ok(wrapper.indexOf(marker)>=0,'v1.7.9 FX integration marker missing: '+marker);});
console.log('FX Trading IA static integration v1.7.9: PASS');
