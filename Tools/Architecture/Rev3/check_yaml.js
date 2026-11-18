"use strict";
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),YAML=require(process.env.IATB_YAML_MODULE||'yaml');
const root=path.resolve(__dirname,'../../..'),files=cp.execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>/\.ya?ml$/.test(p));
const errors=[];for(const file of files){if(!fs.existsSync(path.join(root,file)))continue;const doc=YAML.parseDocument(fs.readFileSync(path.join(root,file),'utf8'));for(const e of doc.errors)errors.push({file,error:e.message});}
console.log(JSON.stringify({yaml_files:files.length,errors}));if(errors.length)process.exitCode=1;
