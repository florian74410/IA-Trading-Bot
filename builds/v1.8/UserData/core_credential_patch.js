'use strict';
var fs=require('fs'),path=require('path'),Module=require('module');
var CORE_MARKER='function deriveKey(password,salt,iterations){';
function replaceSection(src,start,end,replacement){var a=src.indexOf(start),b=src.indexOf(end);if(a<0||b<0||b<=a)throw new Error('CORE_PATCH_MARKER_MISSING '+start);return src.slice(0,a)+replacement+src.slice(b);}
function patchSource(src){
 var replacement="var CredentialRuntime=require('../../UserData/credential_runtime').current();\nfunction createVault(password){return 'VAULT_SQLITE';}\nfunction unlockVault(password){return CredentialRuntime.migrateLegacy(password);}\nfunction ensureVault(password){return CredentialRuntime.migrateLegacy(password);}\nfunction getSecret(sess,name){return CredentialRuntime.getLegacy(name);}\nfunction saveSecrets(sess,values){CredentialRuntime.saveLegacy(values||{});}\nfunction secretStatus(){return CredentialRuntime.legacyStatus();}\n";
 src=replaceSection(src,CORE_MARKER,'var INTERNAL_SERVICE_KEY=',replacement);
 src=src.replace("openaiConfigured:st.openai,xConfigured:st.x,","openaiConfigured:st.openai,xConfigured:st.x,binanceConfigured:st.binance,okxConfigured:st.okx,krakenConfigured:st.kraken,");
 src=src.replace("if(String(b.xBearerToken||'').trim())v.X_BEARER_TOKEN=String(b.xBearerToken).trim();","if(String(b.xBearerToken||'').trim())v.X_BEARER_TOKEN=String(b.xBearerToken).trim();if(String(b.binanceApiKey||'').trim())v.BINANCE_API_KEY=String(b.binanceApiKey).trim();if(String(b.binanceApiSecret||'').trim())v.BINANCE_API_SECRET=String(b.binanceApiSecret).trim();if(String(b.okxApiKey||'').trim())v.OKX_API_KEY=String(b.okxApiKey).trim();if(String(b.okxApiSecret||'').trim())v.OKX_API_SECRET=String(b.okxApiSecret).trim();if(String(b.okxPassphrase||'').trim())v.OKX_PASSPHRASE=String(b.okxPassphrase).trim();if(String(b.krakenApiKey||'').trim())v.KRAKEN_API_KEY=String(b.krakenApiKey).trim();if(String(b.krakenApiSecret||'').trim())v.KRAKEN_API_SECRET=String(b.krakenApiSecret).trim();");
 src=src.replace("['OPENAI_API_KEY','X_BEARER_TOKEN'].indexOf(k)<0","['OPENAI_API_KEY','X_BEARER_TOKEN','BINANCE_API_KEY','BINANCE_API_SECRET','OKX_API_KEY','OKX_API_SECRET','OKX_PASSPHRASE','KRAKEN_API_KEY','KRAKEN_API_SECRET'].indexOf(k)<0");
 src=src.replace("log('SECURITY','Mot de passe recupere; coffre API reinitialise');json(res,200,{ok:true,secretsReset:true,message:'Mot de passe reinitialise. Les cles API chiffrees ont ete effacees et doivent etre ressaisies.'});","log('SECURITY','Mot de passe recupere; credentials Vault SQLite conserves');json(res,200,{ok:true,secretsReset:false,message:'Mot de passe reinitialise. Les credentials du Vault SQLite sont conserves.'});");
 src=src.replace(/Creation coffre RSA impossible: /g,"Initialisation Vault SQLite impossible: ");
 src=src.replace(/Coffre chiffre inaccessible: /g,"Vault SQLite inaccessible: ");
 src=src.replace(/secrets_v2\.dat/g,'legacy credential file');
 src=src.replace(/Coffre RSA-OAEP/g,'Vault SQLite AES-256-GCM');
 return src;
}
function load(serverPath){
 var source=fs.readFileSync(serverPath,'utf8'),coreDir=path.dirname(path.resolve(serverPath)),originalCompile=Module.prototype._compile,patchedCount=0;
 Module.prototype._compile=function(content,filename){
  var text=typeof content==='string'?content:String(content||''),resolved=path.resolve(filename||'');
  if(path.dirname(resolved)===coreDir&&text.indexOf(CORE_MARKER)>=0){
   text=patchSource(text);patchedCount++;
   console.log('[UserData] Core credential patch applied -> '+path.basename(resolved));
  }
  return originalCompile.call(this,text,filename);
 };
 try{
  var m=new Module(serverPath,module.parent);m.filename=serverPath;m.paths=Module._nodeModulePaths(coreDir);m._compile(source,serverPath);
  if(!patchedCount)throw new Error('CORE_PATCH_TARGET_NOT_REACHED '+serverPath);
  return m.exports;
 }finally{Module.prototype._compile=originalCompile;}
}
module.exports={load:load,patchSource:patchSource};
