"use strict";
// Source census, not a reachability oracle. Zero static consumers alone never
// authorizes deletion: scripts, assets and dynamic imports need separate proof.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const acorn=require(process.env.IATB_ACORN_MODULE||'acorn'),walk=require(process.env.IATB_ACORN_WALK_MODULE||'acorn-walk');
const root=path.resolve(__dirname,'../../..'),out=path.resolve(process.argv[2]||path.join(root,'Documentation/Consolidation-3.0.1'));
const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).filter(f=>!f.startsWith('Documentation/Consolidation-3.0.1/'));
const last=new Map(),log=cp.execFileSync('git',['log','--format=@@%H %aI','--name-only','HEAD'],{cwd:root,encoding:'utf8',maxBuffer:32e6});let commit,date;
for(const l of log.split('\n')){if(l.startsWith('@@'))[commit,date]=l.slice(2).split(' ');else if(l&&!last.has(l))last.set(l,{commit,date});}
const entries=[],edges=[],syntax=[],hashes=new Map();let functionCount=0,exportSites=0;
for(const name of files){const p=path.join(root,name);if(!fs.existsSync(p)||!fs.lstatSync(p).isFile())continue;const b=fs.readFileSync(p),text=b.toString('utf8'),sha=crypto.createHash('sha256').update(b).digest('hex'),ext=path.extname(name),row={path:name,size_bytes:b.length,type:ext||'configuration',sha256:sha,last_git:last.get(name)||null,module:name.startsWith('App/Engines/')?name.split('/')[2]:name.startsWith('App/')?name.split('/')[1]:name.split('/')[0],role:name.startsWith('Documentation/')?'documentation/evidence':/\/Tests?\/|\/tests\//.test(name)?'test':name.startsWith('App/Frontend/')?'frontend/assets':name.startsWith('.github/')?'CI':name.startsWith('Deploy/')?'deployment source':name.startsWith('Tools/')?'maintenance/tooling':'application/configuration',outgoing:[],incoming:[],dynamic_load_sites:[],exports:[],functions:0,usage:'REVIEW_REQUIRED',decision:'KEEP_UNTIL_PROVEN_UNUSED'};
 if(/\.(c?js|mjs)$/.test(name)){
  try{const ast=acorn.parse(text,{ecmaVersion:'latest',sourceType:'module',allowHashBang:true,allowReturnOutsideFunction:true});const req=createRequire(p);
   walk.simple(ast,{
    FunctionDeclaration(){row.functions++;},FunctionExpression(){row.functions++;},ArrowFunctionExpression(){row.functions++;},
    CallExpression(n){const c=n.callee;if(c.name==='require'||c.type==='MemberExpression'&&c.object.name==='require'&&c.property.name==='resolve'){
     const v=n.arguments[0]?.value;if(typeof v!=='string'){row.dynamic_load_sites.push(n.start);return;}
     if(v.startsWith('.'))try{const resolved=req.resolve(v),target=path.relative(root,resolved);row.outgoing.push(target);edges.push([name,target]);}catch(e){row.outgoing.push({unresolved:v});}
    }},
    AssignmentExpression(n){const left=text.slice(n.left.start,n.left.end);if(/^(module\.exports|exports\.)/.test(left)){row.exports.push(left);exportSites++;}},
   });
  }catch(e){syntax.push({file:name,error:e.message});}
  functionCount+=row.functions;
 }
 entries.push(row);if(!hashes.has(sha))hashes.set(sha,[]);hashes.get(sha).push(name);
}
const byName=new Map(entries.map(e=>[e.path,e]));for(const [from,to]of edges)if(byName.has(to))byName.get(to).incoming.push(from);
const C=require(path.join(root,'App/Core/FunctionRegistry/Control/catalog'));
const processes=fs.readdirSync(path.join(root,'App/Core/ProcessRegistry/manifests')).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(path.join(root,'App/Core/ProcessRegistry/manifests',n))));
const engines=Object.keys(C.folders).map(id=>{const f=C.manifest(path.join(root,'App'),id),m=processes.find(p=>p.id===id);return {id,folder:'App/'+C.folders[id],entry:'App/'+C.sources[id],entry_exists:fs.existsSync(path.join(root,'App',C.sources[id])),process:m,commands:f.functions.map(x=>({id:x.id,qualified:x.verified_handler,agent_qualified:x.agent_qualified,hard_deny:x.hard_deny,availability:x.availability_reason,source:x.source})),test_files:entries.filter(x=>x.path.startsWith('App/'+C.folders[id]+'/')&&x.role==='test').map(x=>x.path)};});
for(const row of entries){if(row.incoming.length)row.usage='STATICALLY_IMPORTED';if(engines.some(e=>e.entry===row.path))row.usage='CANONICAL_ENTRY';if(row.role==='documentation/evidence')row.usage='DOCUMENTARY';}
const result={schema:'iatb.source-inventory/1.0',commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),files:entries.length,total_bytes:entries.reduce((n,e)=>n+e.size_bytes,0),function_nodes:functionCount,export_assignment_sites:exportSites,static_relative_edges:edges.length,syntax_errors:syntax,duplicate_groups:[...hashes.values()].filter(v=>v.length>1),engines,entries};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'SOURCE_INVENTORY.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(out,'ENGINE_INVENTORY.json'),JSON.stringify({engines,core_components:processes.filter(p=>!C.folders[p.id]),note:'Bank/WalletConnector/AI Gateway and Core Auth21 are shared components, not additional parallel Engines.'},null,2)+'\n');
console.log(JSON.stringify({commit:result.commit,files:result.files,bytes:result.total_bytes,function_nodes:functionCount,export_assignment_sites:exportSites,relative_edges:edges.length,syntax_errors:syntax.length}));
