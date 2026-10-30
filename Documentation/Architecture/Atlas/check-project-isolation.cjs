#!/usr/bin/env node
'use strict';
// Keep Architecture Atlas a self-contained IA-Trading-Bot artifact.
// The separate hardware-catalog project must never be linked, embedded or depended on.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=__dirname;
const files=['atlas-v2.html','atlas-v2-2.html','README.md','icons.svg'];
const forbidden=[
 /Hardware[\s_-]*Lab/i,
 /ASUS[\s_-]*G11CD/i,
 /Top[\s_-]*Achat/i,
 /Configurat(?:eur|or)[\s_-]*PC/i,
 /configurator-v1/i,
 /(?:127\.0\.0\.1|localhost):8765/i,
 /[/?]page=configurator/i,
 /data-page=["'](?:configurator|myconfigs|profile)["']/i,
 /AUTRES OUTILS/i
];
for(const f of files){
 const body=fs.readFileSync(path.join(root,f),'utf8');
 for(const re of forbidden) assert.ok(!re.test(body),'IA-TB contains cross-project dependency in '+f+': '+re);
}
const atlas=fs.readFileSync(path.join(root,'atlas-v2-2.html'),'utf8');
const sprite=fs.readFileSync(path.join(root,'icons.svg'),'utf8');
for(const name of ['hard-drive','memory-stick','circuit-board','fan']){
 const re=new RegExp('<symbol id="i-'+name+'"','i');
 assert.ok(!re.test(atlas),'PC-only icon embedded in Atlas: '+name);
 assert.ok(!re.test(sprite),'PC-only icon in IA-TB sprite: '+name);
}
for(const name of ['server','database','cpu','shield','network','binance','okx']){
 assert.ok(atlas.includes('id="i-'+name+'"'),'IA-TB infrastructure or exchange icon missing: '+name);
}
assert.ok(atlas.includes('const groupSpecs='),'IA-TB superblocks preserved');
assert.ok(atlas.includes('function routeLabel('),'IA-TB labeled route renderer preserved');
assert.ok(atlas.includes('const palette='),'IA-TB protocol legend preserved');
console.log('OK: Atlas IA-TB only. No Hardware Lab link, dependencies or PC-only icons.');
