#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'atlas-v2.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script,'Atlas script found');
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.style={};this.textContent='';this.value='';this.clientWidth=850;this.clientHeight=620;this.handlers={};this.classes=new Set();
  const self=this;this.classList={contains(n){return self.classes.has(n)},add(n){self.classes.add(n)},remove(n){self.classes.delete(n)},toggle(n,force){let yes=force===undefined?!self.classes.has(n):!!force;if(yes)self.classes.add(n);else self.classes.delete(n);return yes}};}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.classes=new Set(String(v).split(/\s+/));if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}
 appendChild(x){this.children.push(x);return x;}
 replaceChildren(...xs){this.children=xs;}
 addEventListener(type,handler){this.handlers[type]=handler;}
 dispatch(type,event={}){const cb=this.handlers[type]||((type==='click')?this.onclick:null);if(cb)cb({target:this,preventDefault(){},clientX:400,clientY:300,...event});}
 closest(selector){return selector==='.block'&&this.classes.has('block')?this:null;}
 setPointerCapture(){}
}
const ids=['view','world','blocks','wires','defs','title','description','tags','connections','source','mode','route-count','find-block','block-list','focusmap','value','plus','minus','fit','clear'];
const byId=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
const navModes=['structure','market','trade','admin','all'].map(value=>{const x=new Element('button');x.dataset.mode=value;return x});
const navTours=['data','order','auth','news'].map(value=>{const x=new Element('button');x.dataset.tour=value;return x});
const layout=new Element('div');
const document={
 getElementById(id){if(!byId[id])throw Error('Unmocked id '+id);return byId[id];},
 createElement(tag){return new Element(tag);},
 createElementNS(_ns,tag){return new Element(tag);},
 querySelector(selector){if(selector==='.layout')return layout;throw Error('Unknown querySelector '+selector)},
 querySelectorAll(selector){
  if(selector==='.block')return byId.blocks.children;
  if(selector==='[data-mode]')return navModes;
  if(selector==='[data-tour]')return navTours;
  throw Error('Unknown querySelectorAll '+selector);
 }
};
vm.runInNewContext(script[1],{document,requestAnimationFrame(cb){cb();}}, {timeout:1500,filename:'atlas-v2.html'});
assert.equal(byId.blocks.children.length,36,'all 36 components rendered');
assert.ok(byId.wires.children.length>1,'structural routes rendered');
const first=byId.blocks.children.find(x=>x.dataset.id==='router');
assert.ok(first,'Router block mounted');
first.dispatch('click');
assert.match(byId.title.textContent,/Router Switch/);
assert.ok(byId.connections.children.length>=3,'Router neighbors inspectable');
byId['find-block'].value='GMX Executor';
byId['find-block'].dispatch('change');
assert.match(byId.title.textContent,/GMX Executor/,'search selects exact component');
byId.focusmap.dispatch('click');
assert.ok(layout.classes.has('focus-map'),'full-width mode expands');
byId.focusmap.dispatch('click');
assert.ok(!layout.classes.has('focus-map'),'full-width mode restores panels');
navModes.find(n=>n.dataset.mode==='market').dispatch('click');
assert.match(byId['route-count'].textContent,/liaison/,'routes are counted');
assert.ok(byId.wires.children.length<30,'Market Data routes condensed into a shared aggregation bus');
navTours.find(n=>n.dataset.tour==='order').dispatch('click');
assert.match(byId.title.textContent,/intention de trading/i,'trading tour shows inspector details');
byId.clear.dispatch('click');
assert.match(byId.title.textContent,/Sélectionne un bloc/);
assert.match(byId['route-count'].textContent,/liaisons?/);
assert.ok(byId.world.style.transform.includes('scale('),'zoom transform applied');
console.log('Architecture Atlas V2 DOM smoke: 36 nodes, selection, search, full-width, market bus, tour and reset OK');
