'use strict';
var fs=require('fs'),Module=require('module');
function replaceSection(src,start,end,replacement){var a=src.indexOf(start),b=src.indexOf(end);if(a<0||b<0||b<=a)throw new Error('CORE_PATCH_MARKER_MISSING '+start);return src.slice(0,a)+replacement+src.slice(b);}
function patchSource(src){
 var replacement="var CredentialRuntime=require('../../UserData/credential_runtime').current();\nfunction createVault(password){return 'VAULT_SQLITE';}\nfunction unlockVault(password){return CredentialRuntime.migrateLegacy(password);}\nfunction ensureVault(password){return CredentialRuntime.migrateLegacy(password);}\nfunction getSecret(sess,name){return CredentialRuntime.getLegacy(name);}\nfunction saveSecrets(sess,values){CredentialRuntime.saveLegacy(values||{});}\nfunction secretStatus(){return CredentialRuntime.legacyStatus();}\n";
 src=replaceSection(src,'function deriveKey(password,salt,iterations){','var INTERNAL_SERVICE_KEY=',replacement);
 src=src.replace("log('SECURITY','Mot de passe recupere; coffre API reinitialise');json(res,200,{ok:true,secretsReset:true,message:'Mot de passe reinitialise. Les cles API chiffrees ont ete effacees et doivent etre ressaisies.'});","log('SECURITY','Mot de passe recupere; credentials Vault SQLite conserves');json(res,200,{ok:true,secretsReset:false,message:'Mot de passe reinitialise. Les credentials du Vault SQLite sont conserves.'});");
 src=src.replace(/Creation coffre RSA impossible: /g,"Initialisation Vault SQLite impossible: ");
 src=src.replace(/Coffre chiffre inaccessible: /g,"Vault SQLite inaccessible: ");
 src=src.replace(/secrets_v2\.dat/g,'legacy credential file');
 src=src.replace(/Coffre RSA-OAEP/g,'Vault SQLite AES-256-GCM');
 return src;
}
function load(serverPath){var source=fs.readFileSync(serverPath,'utf8'),patched=patchSource(source),m=new Module(serverPath,module.parent);m.filename=serverPath;m.paths=Module._nodeModulePaths(require('path').dirname(serverPath));m._compile(patched,serverPath);return m.exports;}
module.exports={load:load,patchSource:patchSource};
