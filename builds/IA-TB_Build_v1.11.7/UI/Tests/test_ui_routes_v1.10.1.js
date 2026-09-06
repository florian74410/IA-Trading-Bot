'use strict';
var fs=require('fs'),path=require('path');
var ROOT=path.resolve(__dirname,'../..');
var app=fs.readFileSync(path.join(ROOT,'Frontend/Pages/app_v1.0.html'),'utf8');
var nav=fs.readFileSync(path.join(ROOT,'Frontend/JS/shared_navigation_v1.8.8.js'),'utf8');
function assert(x,m){if(!x)throw new Error(m);}
assert(app.indexOf("function openSettings(){closeStrategies();closeUpdates();$('settingsPage').classList.remove('hide');$('settingsBtn').classList.add('active');api('/api/settings')")>=0,'Settings overlay must open before settings API request');
assert(app.indexOf("if(p==='/settings')return openSettings();")>=0,'/settings route missing');
assert(app.indexOf("if(p==='/strategy'||p==='/strategies')return openStrategies();")>=0,'Strategy route aliases missing');
assert(app.indexOf("$('app').classList.remove('hide');openRequestedRoute();syncOverlayTop();")>=0,'Requested route must be applied immediately after app becomes visible');
assert(nav.indexOf('href="/settings"')>=0 && nav.indexOf('href="/strategy"')>=0,'Canonical nav routes missing');
console.log('IA-TB UI routes v1.10.1: OK');
