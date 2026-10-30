#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'atlas-v2-2.html'),'utf8');
const pack=fs.readFileSync(path.join(__dirname,'icons.svg'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(js,'standalone JS exists');
new vm.Script(js[1],{filename:'atlas-v2-2.js'});
const extract=(begin,end)=>{
 const p=js[1].indexOf(begin),q=js[1].indexOf(end,p+begin.length);
 assert.ok(p>=0&&q>p,'model markers '+begin);
 return js[1].slice(p+begin.length,q).trim().replace(/;\s*$/,'');
};
const groups=vm.runInNewContext(extract('const groupSpecs=','const groupLookup='),{});
const data=vm.runInNewContext(extract('const data=','const links='),{});
const links=vm.runInNewContext(extract('const links=','const palette='),{});
assert.equal(groups.length,11,'Core Router Firewall plus eight separate Engines');
const engineGroups=groups.filter(g=>g[2]==='engine');
assert.equal(engineGroups.length,8);
assert.ok(engineGroups.every(g=>g[7].length===3),'each Engine gets three grounded satellites');
for(const g of groups){
 assert.ok(g[7].length===3);
 for(const sat of g[7])assert.ok(/^(App|Documentation)\//.test(sat[1]),'satellite file path '+sat[0]);
}
const fw=groups.find(g=>g[0]==='gfirewall');
assert.ok(fw&&fw[7].map(x=>x[0]).join('|').includes('Trading Firewall'));
assert.ok(groups.find(g=>g[0]==='gcore')[4]<groups.find(g=>g[0]==='grouter')[4],'core over router');
assert.ok(groups.find(g=>g[0]==='grouter')[4]<fw[4],'router over firewall');
assert.ok(groups.filter(g=>g[2]==='engine').every(g=>g[4]>fw[4]),'engines beneath firewall');
assert.ok(/<textPath/.test(js[1])||js[1].includes("element('textPath'"),'routes have inline text labels');
assert.ok(js[1].includes('function showSatellite(')&&js[1].includes("function showGroup("),'nested inspector behavior');
assert.ok(js[1].includes("world.dataset.level=level"),'mode switch controls grouped view');
for(const id of ['supermode','superblocks','mode','find-block','focusmap'])assert.ok(html.includes('id="'+id+'"'),'missing interactive UI '+id);
assert.ok((pack.match(/<symbol /g)||[]).length>=50,'substantial local vector icon pack');
assert.ok(pack.includes('i-binance')&&pack.includes('i-okx'),'real exchange logos');
assert.ok(links.some(l=>l[0]==='md'&&l[1]==='fwdata'),'market toll unchanged');
assert.ok(links.some(l=>l[0]==='router'&&l[1]==='fwtrade'),'trading toll unchanged');
console.log('Atlas V2.2: 11 superblocks, 24 Engine satellites, route text, tolls, mode and 50+ icons OK');
