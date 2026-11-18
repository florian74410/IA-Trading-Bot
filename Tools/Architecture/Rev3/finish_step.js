"use strict";
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),layout=require('./layout'),id=process.argv[2];assert(layout[id]);
const stateFile=path.join(root,'artifacts/rev3-migration-state.json'),s=JSON.parse(fs.readFileSync(stateFile));
const step=s.steps.find(x=>x.id===id);assert(step);
const log=fs.readFileSync(path.join(root,`artifacts/rev3-${id}-qualification.tap`),'utf8');assert(/^# fail 0$/m.test(log)&&/^# pass 93$/m.test(log),'Mandatory CP1 qualification not PASS');
const result=JSON.parse(fs.readFileSync(path.join(root,`artifacts/rev3-${id}-commands.json`)));assert.equal(result.status,'PASS');
const check=JSON.parse(fs.readFileSync(path.join(root,`artifacts/rev3-${id}-static.json`)));assert(!check.syntax_errors.length&&!check.unresolved_imports.length);
const [from,to]=layout[id],backup=path.join(root,'../rev3-preserved-old',id);
if(step.old_directory_retained){assert(!fs.existsSync(backup));fs.mkdirSync(path.dirname(backup),{recursive:true});fs.renameSync(path.join(root,'App',from),backup);}else assert(fs.existsSync(backup));
step.old_directory_retained=false;step.status='PASS';fs.writeFileSync(stateFile,JSON.stringify(s,null,2)+'\n');
const dir=path.join(root,'Documentation/Architecture/Rev3'),reports=path.join(dir,'Results');fs.mkdirSync(reports,{recursive:true});
for(const name of fs.readdirSync(path.join(root,'artifacts')).filter(x=>x.startsWith(`rev3-${id}-`)&&/\.(tap|json)$/.test(x)))fs.copyFileSync(path.join(root,'artifacts',name),path.join(reports,name));
fs.writeFileSync(path.join(dir,'MIGRATION_PATH_CHANGES.json'),JSON.stringify(s,null,2)+'\n');
const base=require(path.join(dir,'REV2_BASELINE.json'));
let md='# Requalification Function Registry et CP1 — IA-TB 3.0.1 Rev3\n\nBase Rev2 : `'+base.commit+'`. Les résultats intermédiaires ne remplacent pas la qualification finale après le second audit.\n\n';
md+='| Engine | Commandes avant | Commandes après | Empreintes recalculées | Tests CP1 | Résultat |\n|---|---:|---:|---|---|---|\n';
for(const [k,b]of Object.entries(base.engines)){const done=s.steps.find(x=>x.id===k&&x.status==='PASS'),v=result.engines.find(e=>e.engine===k);md+=`| ${layout[k][1].split('/').at(-1)} | ${b.functions.length} (${b.functions.filter(f=>f.verified_handler).length} qualifiées) | ${done?v.commands_after:'À vérifier'} | ${done?'Oui — générateur existant':'PENDING'} | ${done?'93 PASS, 0 FAIL':'PENDING'} | ${done?'PASS intermédiaire':'PENDING'} |\n`;}
md+='\nChaque comparaison JSON contrôle tous les identifiants, schémas, handlers sources, empreintes, permissions, hard_deny, qualifications agents et autorisations. Seuls le chemin source et son empreinte peuvent différer ; aucune autorisation ne peut être élargie. Les empreintes proviennent du mécanisme existant, puis des tests réels Core TLS → Router → Engine → réponse et des scénarios avec broker fictif.\n\n';
md+='Les commandes non qualifiées en Rev2 restent non qualifiées. Une empreinte recalculée ne constitue pas seule une preuve de réussite. Les rapports de chaque étape et les tentatives échouées sont conservés dans `Results/`.\n\n';
md+='## Condition finale bloquante\n\nAucune validation finale si un handler manque, un contrat est désynchronisé, une empreinte est incorrecte, une permission est élargie, une commande qualifiée de Rev2 régresse, une protection Auth21/Risk/Firewall est désactivée ou un test obligatoire échoue.\n\nAprès les corrections du second audit global, tous les registres et empreintes doivent être régénérés et la qualification complète répétée sur le commit publié et dans le paquet distribué. **Qualification finale après second audit : PENDING.**\n';
fs.writeFileSync(path.join(dir,'CP1_REQUALIFICATION.md'),md);
cp.execFileSync('git',['add','-A'],{cwd:root});
// Preserve raw failed-run TAP bytes as evidence, including diagnostic blank
// lines. Source whitespace remains checked normally.
cp.execFileSync('git',['diff','--cached','--check','--','.',':(exclude)Documentation/Architecture/Rev3/Results/*.tap'],{cwd:root,stdio:'inherit'});
cp.execFileSync('git',['commit','-m',`refactor(rev3): migrate ${id} and requalify CP1 without privilege changes`],{cwd:root,stdio:'inherit'});
