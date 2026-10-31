'use strict';
// IA-TB 2.6: generates *documentation*, not callable tools or privileges.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
const registry=path.join(root,'Core/Communication/ProtocolRegistry');
const map={core:'Core',router:'Core/Router',supervisor:'Supervisor',marketdata:'MarketData',fundamental:'Fundamental',indicator:'Indicators',liquidity:'Liquidity',portfolio:'Portfolio',risk:'Risk',strategy:'Strategy',trading:'services/trading-engine',firewall:'Core/Firewall'};
const version='2.6.0';
const checksum=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function classify(name){if(/private.key|secret|seed|withdraw|export.key/i.test(name))return ['CRITICAL',true,'SECRET'];
if(/execute|place|cancel|close.position|swap|transfer|settings.set|delete|create|write|submit|reload|restart|stop|approve|revoke/i.test(name))return ['HIGH',false,'MUTATION'];
if(/verify|gate|evaluate|validate|test|probe/i.test(name))return ['MEDIUM',false,'EVALUATION'];
return ['LOW',false,'READ'];}
function enrich(item,engine){const name=item.name, args=item.arguments||{},type=classify(name);
return {id:name,engine,type:type[2],risk_level:type[0],hard_deny:type[1],
  description:item.description||('Commande CP/1 '+name+' du composant '+engine+'. Contrat de sortie à compléter après inspection de son handler.'),
  input:{type:'object',required:args.required||[],properties:Object.fromEntries((args.allowed||[]).map(n=>[n,{type:'unknown',description:'Type à vérifier dans le handler de '+name}])),additionalProperties:!!args.allowUnknown},
  output:{type:'unknown',description:'Réponse réelle à documenter depuis le handler CP/1'},errors:[],
  source:'App/Core/Communication/ProtocolRegistry/'+engine+'.json',verified_handler:false,
  default_privilege:'DENY',side_effects:type[2]==='MUTATION'};
}
function generate(){let summary=[];
 for(const [engine,folder] of Object.entries(map)){const input=path.join(registry,engine+'.json');if(!fs.existsSync(input))continue;
 const source=JSON.parse(fs.readFileSync(input,'utf8'));const commands=source.table&&source.table.commands||[];
 const functions=commands.filter(x=>x&&typeof x.name==='string').map(x=>enrich(x,engine));
 const target=path.join(root,folder,'FunctionRegistry');fs.mkdirSync(target,{recursive:true});
 const catalog={schema_version:'2.6.0',engine_id:engine,engine_version:version,transport:'CP/1',
   source_protocol_registry:path.relative(root,input),source_sha256:checksum(source),
   functions,revision_hash:checksum(functions)};
 fs.writeFileSync(path.join(target,'Functions.json'),JSON.stringify(catalog,null,2)+'\n');
 fs.writeFileSync(path.join(target,'VERSION.json'),JSON.stringify({engine_id:engine,engine_version:version,
    registry_schema:'2.6.0',source_sha256:catalog.source_sha256,revision_hash:catalog.revision_hash},null,2)+'\n');
 summary.push({engine,functions:functions.length,folder});}
 return summary;
}
if(require.main===module)console.log(JSON.stringify(generate(),null,2));
module.exports={generate,enrich,classify,map};
