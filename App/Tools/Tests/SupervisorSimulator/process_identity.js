"use strict";
// Fixture credentials follow the canonical Process Registry entry, never a
// substring of a historical path. Unknown services fail before process spawn.
const fs=require('node:fs'),path=require('node:path');
module.exports=function serviceId(root,script){
 // Router is a non-restartable Core component; its manifest intentionally
 // contains no executable script. Match its one explicit launcher path.
 if(script==='Core/Router/router.js')return 'router';
 const dir=path.join(root,'Core/ProcessRegistry/manifests');
 const matches=fs.readdirSync(dir).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'))).filter(m=>m.script===script);
 if(matches.length!==1)throw Error('FIXTURE_PROCESS_IDENTITY_UNRESOLVED: '+script);
 return matches[0].id;
};
