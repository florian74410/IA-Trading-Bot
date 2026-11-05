'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','Frontend','JS','companion_v1.0.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.value='';this.className='';this.id='';this._text='';this.disabled=false;const set=new Set();this.classList={add:x=>set.add(x),remove:x=>set.delete(x),toggle:(x,v)=>{const enabled=v===undefined?!set.has(x):!!v;if(enabled)set.add(x);else set.delete(x);return enabled;},contains:x=>set.has(x)};}
 appendChild(el){this.children.push(el);el.parentNode=this;return el;}
 get textContent(){return this._text;}
 set textContent(x){this._text=String(x);if(x==='')this.children=[];}
 querySelectorAll(tag){const all=[];function scan(x){for(const child of x.children){if(child.tagName===tag)all.push(child);scan(child);}}scan(this);return all;}
}
function find(node,predicate){if(predicate(node))return node;for(const child of node.children){const result=find(child,predicate);if(result)return result;}return null;}
function create(role='USER'){
 const requests=[],events=[],body=new Element('body');
 const document={readyState:'complete',body,activeElement:null,createElement:tag=>new Element(tag),addEventListener(){},elementFromPoint:()=>null,querySelector:()=>null};
 const calls={confirm:0};
 const fetch=async(url,options={})=>{
  requests.push({url,options});
  let data={};
  if(url==='/router-health')data={ok:true,dependencies:{supervisor:{ok:true},marketData:{ok:true}}};
  if(url==='/api/companion/history')data={ok:true,messages:[{role:'user',content:'before restart'},{role:'assistant',content:'retained answer'}]};
  if(url==='/api/companion/chat')data={ok:true,source:'supervisor-cognitive',mode:'cognitive',message:'Supervisor cognitive répond',model:'gpt-5-mini',routerActions:[],mood:7};
  if(url==='/communication/v1/ui/read')data={status:'OK',data:options.body&&JSON.parse(options.body).action==='supervisor.llm.models'?{available:['gpt-5-mini','gpt-5.6'],selected:'gpt-5-mini',provider:'OPENAI_API'}:{ok:true,service:'Supervisor'}};
  if(url==='/communication/v1/ui/write')data={status:'OK',data:options.body&&JSON.parse(options.body).action==='supervisor.llm.select'?{ok:true,selection:{persisted:true}}:{ok:true,mode:'PAUSED'}};
  return {ok:true,status:200,json:async()=>data};
 };
 const window={IATBSession:{authenticated:true,role:role,clientId:'CLalice'},speechSynthesis:null,dispatchEvent:e=>events.push(e),confirm:()=>{calls.confirm++;return true}};
 const sandbox={window,document,fetch,CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},setTimeout:()=>1,clearTimeout(){},innerWidth:1024,innerHeight:768,location:{pathname:'/trading',hash:''}};
 vm.runInNewContext(code,sandbox,{filename:'companion_v1.0.js'});
 return {requests,events,body,window,calls};
}
test('Blob restores history, converses with cognitive mode, retains command mode and controls Engines via Core',async()=>{
 const x=create();await tick();await tick();
 const root=find(x.body,n=>n.id==='iatbCompanion');assert.ok(root);
 assert.ok(x.requests.some(r=>r.url==='/api/companion/history'));
 const tabs=find(root,n=>n.className==='iatbCompTabs');
 const cognitive=tabs.children.find(x=>x.dataset.mode==='cognitive'),commands=tabs.children.find(x=>x.dataset.mode==='commands'),engines=tabs.children.find(x=>x.dataset.mode==='engines');
 assert.ok(cognitive&&commands&&engines);
 const form=find(root,n=>n.className==='iatbCompForm'),input=form.children.find(n=>n.tagName==='input');
 input.value='Contrôle le Supervisor';form.onsubmit({preventDefault(){}});await tick();await tick();
 const last=x.requests.find(r=>r.url==='/api/companion/chat');assert.equal(JSON.parse(last.options.body).mode,'cognitive');
 assert.equal(x.events.length,0,'LLM conversation must never auto-dispatch UI commands');
 commands.onclick();input.value='Change le graphique';form.onsubmit({preventDefault(){}});await tick();await tick();
 assert.equal(JSON.parse(x.requests.filter(r=>r.url==='/api/companion/chat').at(-1).options.body).mode,'commands');
 assert.equal(x.events.length,1,'Existing UI command event preserved');
 engines.onclick();
 const engine=find(root,n=>n.className==='iatbCompEngines hide'),read=engine?null:find(root,n=>n.className==='iatbCompEngineRow');
 const row=find(root,n=>n.className==='iatbCompEngineRow');row.children.find(n=>n.tagName==='button').onclick();await tick();await tick();
 assert.ok(x.requests.some(r=>r.url==='/router-health'),'Global network status should be read from authenticated Gateway');
 row.children.find(n=>n.tagName==='select').value='1';row.children.find(n=>n.tagName==='button').onclick();await tick();await tick();
 assert.ok(x.requests.some(r=>r.url==='/communication/v1/ui/read'));
 const controls=find(root,n=>n.className==='iatbCompEngineControls');controls.children[0].onclick();await tick();await tick();
 assert.equal(x.calls.confirm,1);
 const mutation=x.requests.find(r=>r.url==='/communication/v1/ui/write');
 assert.ok(mutation);
 const args=JSON.parse(mutation.options.body);assert.equal(args.action,'strategy.pause');assert.equal(args.target,'strategy');
 assert.equal(x.events.length,1,'No Engine action may be dispatched via model-created UI event');
});

test('ADMIN can load allowlisted models and explicitly persist selected Supervisor provider',async()=>{
 const x=create('ADMIN');await tick();await tick();
 const root=find(x.body,n=>n.id==='iatbCompanion');
 const engines=find(root,n=>n.className==='iatbCompTabs').children.find(b=>b.dataset.mode==='engines');
 engines.onclick();
 const controls=find(root,n=>n.className==='iatbCompModelRow');
 assert.ok(controls,'ADMIN model controls must exist');
 const buttons=controls.children.filter(n=>n.tagName==='button');
 buttons[0].onclick();await tick();await tick();
 const model=controls.children[1];assert.equal(model.value,'gpt-5-mini');
 buttons[1].onclick();await tick();await tick();
 assert.equal(x.calls.confirm,1);
 const write=x.requests.filter(r=>r.url==='/communication/v1/ui/write').at(-1);
 const args=JSON.parse(write.options.body);
 assert.equal(args.action,'supervisor.llm.select');
 assert.equal(args.arguments.model,'gpt-5-mini');
 assert.equal(args.arguments.provider,'OPENAI_API');
});
