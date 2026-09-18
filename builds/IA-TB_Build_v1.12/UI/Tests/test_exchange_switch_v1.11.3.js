'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(root,'Frontend/JS/trading_dashboard_v1.8.7.js'),'utf8');
const html=fs.readFileSync(path.join(root,'Frontend/Pages/app_v1.0.html'),'utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(js.includes('bindExchangeSwitches'), 'bindExchangeSwitches absent');
ok(js.includes('requestExchangeSwitch'), 'requestExchangeSwitch absent');
ok(js.includes("exchange!=='GMX'&&exchange!=='KRAKEN'"), 'garde exchanges supportés absente');
ok(js.includes("dispatchEvent(new Event('change'"), 'dispatch change absent');
ok(html.includes('/assets/trading_dashboard_v1.8.7.js'), 'nouvel asset non chargé');
console.log('OK exchange switch v1.11.3');
