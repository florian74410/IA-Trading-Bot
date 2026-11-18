"use strict";
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{createRequire}=require('node:module');
const acorn=require(process.env.IATB_ACORN_MODULE||'acorn'),walk=require(process.env.IATB_ACORN_WALK_MODULE||'acorn-walk');
const root=path.resolve(__dirname,'../../..'),layout=require('./layout');
const stateFile=path.join(root,'artifacts/rev3-migration-state.json');
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{completed:[]};
const excluded=new Set(['.git','node_modules','artifacts','NodeRuntime','Reports']);
const files=[];function scan(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(excluded.has(e.name)||e.isSymbolicLink())continue;const p=path.join(d,e.name);if(e.isDirectory())scan(p);else if(e.isFile())files.push(p);}}
for(const top of ['App','Tools','tests'])scan(path.join(root,top));
const inactive=state.completed.map(id=>path.join(root,'App',layout[id][0])+path.sep);
const errors=[],missing=[],counts={javascript:0,json:0,relative_imports:0};
for(const file of files){if(inactive.some(p=>file.startsWith(p)))continue;const text=fs.readFileSync(file,'utf8');
 if(file.endsWith('.json')){counts.json++;try{JSON.parse(text);}catch(e){errors.push({file:path.relative(root,file),error:e.message});}}
 if(!/\.(c?js|mjs)$/.test(file))continue;counts.javascript++;
 let ast;try{ast=acorn.parse(text,{ecmaVersion:'latest',sourceType:'module',allowHashBang:true,allowReturnOutsideFunction:true});}catch(e){errors.push({file:path.relative(root,file),error:e.message});continue;}
 const req=createRequire(file);walk.simple(ast,{CallExpression(n){let c=n.callee;if(!(c.name==='require'||c.type==='MemberExpression'&&c.object.name==='require'&&c.property.name==='resolve'))return;const v=n.arguments[0]?.value;if(typeof v!=='string'||!v.startsWith('.'))return;counts.relative_imports++;try{req.resolve(v);}catch(e){missing.push({file:path.relative(root,file),specifier:v});}}});
}
const result={counts,syntax_errors:errors,unresolved_imports:missing};
const out=process.argv[2];if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result));if(errors.length||missing.length)process.exitCode=1;
