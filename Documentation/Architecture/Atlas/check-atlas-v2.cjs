#!/usr/bin/env node
'use strict';
// Static contract test for Architecture Atlas V2. No network, credentials or app process needed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=path.join(__dirname,'atlas-v2.html'),html=fs.readFileSync(file,'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script,'inline interactive script exists');
new vm.Script(script[1],{filename:'atlas-v2.inline.js'}); // Syntax check without executing DOM code
function extract(start,end){
 const a=script[1].indexOf(start),b=script[1].indexOf(end,a);
 assert.ok(a>=0&&b>a,'model boundaries found: '+start);
 return script[1].slice(a+start.length,b).trim().replace(/;\s*$/,'');
}
const nodes=vm.runInNewContext(extract('const data=','const links='),{});
const links=vm.runInNewContext(extract('const links=','const palette='),{});
const map=new Map(nodes.map(n=>[n[0],n]));
assert.equal(map.size,nodes.length,'unique component IDs');
assert.ok(nodes.length>=35,'not an over-minimalized architecture');
for(const n of nodes)assert.ok(n[6]&&(n[6].startsWith('App/')||n[6].startsWith('Documentation/')||n[6]==='compose.debug.stack.yml'),'source for '+n[0]);
for(const e of links){assert.ok(map.has(e[0]),'edge from exists '+e[0]);assert.ok(map.has(e[1]),'edge to exists '+e[1]);}
const at=k=>map.get(k),has=(a,b)=>links.some(x=>x[0]===a&&x[1]===b);
assert.equal(at('supervisor')[3],at('core')[3]);assert.equal(at('core')[3],at('router')[3]);
assert.ok(at('supervisor')[4]<at('core')[4]&&at('core')[4]<at('router')[4],'Supervisor over Core over Router');
assert.ok(['md','fund','indicator','strategy','risk','liquidity','trading','portfolio'].every(k=>at(k)[2]==='engine'),'multiple real Engines');
assert.ok(['fwdata','fwrouter','fwtrade'].every(k=>at(k)[2]==='firewall'),'separate Firewall workers');
const providers=nodes.filter(n=>n[2]==='provider');
assert.ok(providers.length>=8,'independent BrokerAPI column');
assert.ok(providers.every(n=>n[3]===at('binance')[3]&&has(n[0],'md')),'sources in one column independently connect to MD');
assert.ok(providers.every(n=>!links.some(e=>e[0]===n[0]&&e[1]==='router')),'no direct provider-to-Router bypass');
assert.ok(has('md','fwdata')&&has('fwdata','router'),'MarketData Firewall toll');
assert.ok(has('router','fwtrade')&&has('fwtrade','trading'),'Trading Firewall toll');
assert.ok(has('risk','fwtrade'),'RiskGate participates in the protected path');
assert.ok(html.includes('LIVE OFF')&&html.includes('non qualifié'),'no fake production promise');
// Guard against future regression to unreadable per-provider spaghetti routes.
assert.ok(script[1].includes('function drawProviderBus('),'BrokerAPI routes must use an aggregation trunk');
assert.ok(script[1].includes('providerLinks.forEach('),'individual provider stubs still displayed when requested');
assert.ok(script[1].includes('drawProviderBus(providerLinks'),'renderer uses the aggregation trunk');
assert.ok(script[1].includes('function focusIds('),'camera can frame a selected group');
assert.ok(script[1].includes('function centerOn('),'camera centers a selected component');
for(const control of ['find-block','block-list','focusmap','route-count','fit','clear']){
 assert.ok(html.includes('id="'+control+'"'),'interactive control missing: '+control);
}
for(const flow of ['market','trade','admin','structure','all'])
 assert.ok(html.includes('value="'+flow+'"'),'missing route view: '+flow);
for(const name of ['Binance BrokerAPI','OKX BrokerAPI','Kraken BrokerAPI','GMX DataAPI','Market Data Collector','Router Switch CP/1','Core Server','IA Supervisor'])
 assert.ok(html.includes(name),'missing named architecture component: '+name);
const p4blocks=nodes.filter(n=>n[2]==='firewall');
assert.equal(p4blocks.length,3,'three explicit Firewall workers from ProcessRegistry');
assert.equal(providers.length,9,'nine independent market providers in the source inventory');
assert.ok(!/<script\b[^>]*src=/i.test(html),'no external JS');
assert.ok(!/<link\b[^>]*rel=["']stylesheet/i.test(html),'no external CSS');
console.log('Architecture Atlas V2: JS syntax + 35+ nodes + typed lanes + guarded routes OK');
