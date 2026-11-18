"use strict";
// Deterministic, syntax-aware path migration. Dependencies are tooling-only.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const acorn=require(process.env.IATB_ACORN_MODULE||'acorn');
const walk=require(process.env.IATB_ACORN_WALK_MODULE||'acorn-walk');
const root=path.resolve(__dirname,'../../..'),app=path.join(root,'App');
const layout=require('./layout');
const stateFile=path.join(root,'artifacts/rev3-migration-state.json');
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{completed:[],steps:[]};
const tracked=()=>cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const rel=(base,target)=>{let v=path.relative(base,target).split(path.sep).join('/');return v.startsWith('.')?v:'./'+v;};
function remapAbsolute(p,pairs){for(const [from,to] of pairs){const a=path.join(app,from);if(p===a||p.startsWith(a+path.sep))return path.join(app,to)+p.slice(a.length);}return p;}
function prefixValue(v,pairs){for(const [from,to] of pairs){for(const lead of ['App/','']){const a=lead+from;if(v.startsWith(a+'/'))return lead+to+v.slice(a.length);}}return v;}
function parse(text){const options={ecmaVersion:'latest',sourceType:'script',allowHashBang:true,allowReturnOutsideFunction:true};try{return acorn.parse(text,options);}catch(e){return acorn.parse(text,{...options,sourceType:'module'});}}
function rewriteJS(text,oldFile,newFile,pairs,changes){
 let ast;try{ast=parse(text);}catch(e){throw Error(oldFile+': '+e.message);}
 const edits=new Map();
 function put(n,value,reason){if(value===n.value)return;edits.set(n.start,{start:n.start,end:n.end,value:JSON.stringify(value),reason});}
 const literal=n=>n&&n.type==='Literal'&&typeof n.value==='string';
 walk.ancestor(ast,{
  CallExpression(n){
   const c=n.callee,args=n.arguments;
   if((c.type==='Identifier'&&c.name==='require'||c.type==='MemberExpression'&&c.object.name==='require'&&c.property.name==='resolve')&&literal(args[0])&&args[0].value.startsWith('.')){
    const t=remapAbsolute(path.resolve(path.dirname(oldFile),args[0].value),pairs);put(args[0],rel(path.dirname(newFile),t),'relative module');
   }
   if(c.type!=='MemberExpression'||!['join','resolve'].includes(c.property.name))return;
   if(args[0]?.type==='Identifier'&&args[0].name==='__dirname'){
    const parts=[];for(let i=1;i<args.length&&literal(args[i]);i++)parts.push(args[i]);
    if(parts.length){const t=path.resolve(path.dirname(oldFile),...parts.map(x=>x.value)),mapped=remapAbsolute(t,pairs);if(oldFile!==newFile||mapped!==t){const v=rel(path.dirname(newFile),mapped);put(parts[0],v,'dirname resource');for(const p of parts.slice(1))put(p,'','combined path segment');}}
   }else{
    // Explicit engine directory segments in joins rooted at App. Directory
    // names are rewritten only within path calls, never arbitrary labels.
    const first=args[0],rooted=first?.type==='Identifier'&&['root','ROOT','APP','APP_ROOT','appRoot','app','ROOT_APP'].includes(first.name)||first?.type==='MemberExpression'&&['root','appRoot','app'].includes(first.property.name);
    const offset=literal(args[1])&&args[1].value==='App'?2:1;
    for(let i=offset;rooted&&i===offset&&i<args.length;i++)if(literal(args[i])){
     for(const [from,to] of pairs){const parts=from.split('/');if(parts.every((x,j)=>literal(args[i+j])&&args[i+j].value===x)){put(args[i],to,'engine resource segments');for(let j=1;j<parts.length;j++)put(args[i+j],'','combined engine segment');break;}}
    }
   }
  },
  Literal(n,ancestors){if(typeof n.value==='string'){let v=prefixValue(n.value,pairs);if(v.startsWith('./')||v.startsWith('../')){const original=path.resolve(path.dirname(oldFile),v),mapped=remapAbsolute(original,pairs);if(original!==mapped)v=rel(path.dirname(newFile),mapped);}const parent=ancestors.at(-2);for(const [from,to]of pairs)if(n.value===from&&parent?.type==='Property'&&parent.value===n&&Object.entries(layout).some(([id,p])=>p[0]===from&&(parent.key.name||parent.key.value)===id))v=to;if(v!==n.value)put(n,v,'explicit App-relative source');}},
 });
 // Relative paths in static imports are uncommon but remain first-class.
 walk.simple(ast,{ImportDeclaration(n){if(n.source.value.startsWith('.'))put(n.source,rel(path.dirname(newFile),remapAbsolute(path.resolve(path.dirname(oldFile),n.source.value),pairs)),'static import');}});
 for(const e of [...edits.values()].sort((a,b)=>b.start-a.start)){changes.push({file:path.relative(root,newFile),kind:e.reason,before:text.slice(e.start,e.end),after:e.value});text=text.slice(0,e.start)+e.value+text.slice(e.end);}
 return text;
}
function rewriteOther(text,pairs){
 for(const [from,to] of pairs){const escaped=from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  // Full paths only, preserving arbitrary module labels and historical prose.
  text=text.replace(new RegExp('(?<![A-Za-z0-9_/])(?:App/)?'+escaped+'/[A-Za-z0-9_./*${}+-]+','g'),m=>m.replace(from+'/',to+'/'));
 }
 return text;
}
function rewriteJSON(text,pairs){
 const visit=(value,key)=>{if(Array.isArray(value))return value.map(v=>visit(v,key));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,visit(v,k)]));if(typeof value==='string'&&key!=='description'&&(/\.(js|json|md|txt|css|html|sql|pem|command)$/.test(value)||value.endsWith('/**')))return prefixValue(value,pairs);return value;};
 const old=JSON.parse(text),next=visit(old,'');return JSON.stringify(old)===JSON.stringify(next)?text:JSON.stringify(next,null,2)+'\n';
}
function inventory(){
 const C=require(path.join(app,'Core/FunctionRegistry/Control/catalog'));let imports=0;
 const files=tracked();for(const p of files.filter(p=>/\.(c?js|mjs)$/.test(p))){try{walk.simple(parse(fs.readFileSync(path.join(root,p),'utf8')),{CallExpression(n){if(n.callee.name==='require'&&n.arguments[0]?.value?.startsWith('.'))imports++;}});}catch(e){}}
 const engines={};for(const [id,[from,to]] of Object.entries(layout)){
  const f=C.manifest(app,id);engines[id]={from,to,files:files.filter(p=>p.startsWith('App/'+from+'/')),functions:f.functions,implementation_sha256:C.implementationDigest(app,id)};
 }
 const dir=path.join(root,'Documentation/Architecture/Rev3');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'REV2_BASELINE.json'),JSON.stringify({commit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',cwd:root}).trim(),relative_require_calls:imports,engines},null,2)+'\n');
 console.log(JSON.stringify({imports,engines:Object.fromEntries(Object.entries(engines).map(([k,v])=>[k,{files:v.files.length,commands:v.functions.length,qualified:v.functions.filter(f=>f.verified_handler).length}]))}));
}
function step(id){
 if(!layout[id]||state.completed.includes(id))throw Error('Invalid/already migrated Engine '+id);
 const [from,to]=layout[id],pairs=[[from,to]],oldDir=path.join(app,from),newDir=path.join(app,to),changes=[];
 if(fs.existsSync(newDir))throw Error('Destination exists');
 const files=activeFiles();
 fs.cpSync(oldDir,newDir,{recursive:true});
 for(const p of files){const oldFile=path.join(root,p),newFile=remapAbsolute(oldFile,pairs);if(!fs.existsSync(oldFile)||fs.lstatSync(oldFile).isSymbolicLink())continue;
  if(!/\.(js|cjs|mjs|json|py|sh|yml|yaml|command|md|txt)$/.test(p)&&!/(Dockerfile|\.dockerignore)$/.test(p))continue;
  const before=fs.readFileSync(oldFile,'utf8');let after;
  if(/\.(js|cjs)$/.test(p))after=rewriteJS(before,oldFile,newFile,pairs,changes);else if(p.endsWith('.json'))after=rewriteJSON(before,pairs);else after=rewriteOther(before,pairs);
  if(after!==before){fs.writeFileSync(newFile,after);if(!/\.(js|cjs)$/.test(p))changes.push({file:path.relative(root,newFile),kind:'explicit paths in configuration/launcher'});}
 }
 state.completed.push(id);state.steps.push({id,from,to,changes,old_directory_retained:true});fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({engine:id,changes:changes.length,source:from,destination:to,old_directory_retained:true}));
}
function activeFiles(){return tracked().filter(p=>!p.startsWith('Documentation/')&&!p.startsWith('Tools/Architecture/Rev3/')&&!p.startsWith('Tools/CI/baselines/')&&p!=='App/Core/Shared/paths.js');}
function rewriteCurrent(){const pairs=state.completed.map(id=>layout[id]),changes=[];for(const p of activeFiles().filter(p=>/\.(js|cjs)$/.test(p))){const file=path.join(root,p);if(!fs.existsSync(file))continue;const before=fs.readFileSync(file,'utf8'),after=rewriteJS(before,file,file,pairs,changes);if(before!==after)fs.writeFileSync(file,after);}fs.writeFileSync(path.join(root,'artifacts/rev3-current-path-fixes.json'),JSON.stringify(changes,null,2)+'\n');console.log(JSON.stringify({current_path_fixes:changes.length}));}
if(require.main===module){if(process.argv[2]==='inventory')inventory();else if(process.argv[2]==='step')step(process.argv[3]);else if(process.argv[2]==='rewrite-current')rewriteCurrent();else throw Error('Use inventory, rewrite-current or step <engine>');}
module.exports={rewriteJS,remapAbsolute,rewriteJSON};
