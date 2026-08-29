'use strict';
var fs=require('fs'),path=require('path'),CredentialRuntime=require('./credential_runtime'),CorePatch=require('./core_credential_patch');
var ROOT=path.resolve(__dirname,'..'),fail=[];
function ok(cond,msg){if(!cond)fail.push(msg);else console.log('[SELF-TEST] OK '+msg);}
function text(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
try{
 var map=CredentialRuntime.pairForLegacy;
 ok(map('OPENAI_API_KEY').provider==='OPENAI'&&map('OPENAI_API_KEY').scope==='API_KEY','OpenAI -> Vault mapping');
 ok(map('X_BEARER_TOKEN').provider==='X'&&map('X_BEARER_TOKEN').scope==='BEARER_TOKEN','X -> Vault mapping');
 ok(map('BINANCE_API_KEY').provider==='BINANCE'&&map('BINANCE_API_KEY').scope==='API_KEY','Binance API key mapping');
 ok(map('BINANCE_API_SECRET').provider==='BINANCE'&&map('BINANCE_API_SECRET').scope==='API_SECRET','Binance secret mapping');
 ok(map('OKX_PASSPHRASE').provider==='OKX'&&map('OKX_PASSPHRASE').scope==='PASSPHRASE','OKX passphrase mapping');
 ok(map('KRAKEN_API_SECRET').provider==='KRAKEN'&&map('KRAKEN_API_SECRET').scope==='API_SECRET','Kraken secret mapping');
 var core=text('Core/Server/server_v1.0.js'),patched=CorePatch.patchSource(core);
 ok(patched.indexOf('function readVault(){')<0,'legacy RSA vault functions removed from active Core');
 ok(patched.indexOf('CredentialRuntime.getLegacy')>=0,'OpenAI/X Core consumers routed through CredentialRuntime');
 ok(patched.indexOf('secrets_v2.dat')<0,'no active Core reference to legacy secret filename');
 try{new Function('require','module','exports','__filename','__dirname',patched);ok(true,'patched Core JavaScript syntax');}catch(e){ok(false,'patched Core JavaScript syntax: '+e.message);}
 var paths=text('Core/Shared/paths.js');ok(paths.indexOf('Data.vault')<0&&paths.indexOf("vault:path.join")<0,'Core path registry has no legacy credential path');
 var sp=text('services/trading-engine/secret-provider.js');ok(sp.indexOf('credential_service')>=0,'Trading Engine SecretProvider -> Data Service');
 var ks=text('AddOns/Kraken/kraken_service.js');ok(ks.indexOf('USERDATA_VAULT')>=0&&ks.indexOf('credential_service')>=0,'Kraken private credentials -> Data Service');
 ok(fs.existsSync(path.join(ROOT,'Frontend','Assets','IA-TB_Auth_v1.7.9.jpg')),'v1.7.9 Auth artwork present');
 var hooks=text('UserData/runtime_hooks.js');ok(hooks.indexOf('data-iatb-auth-v179')>=0,'functional Auth page artwork integration installed');
 if(fail.length)throw new Error(fail.join(' | '));
 console.log('[SELF-TEST] PASS v1.7.9 UserData/Vault/Auth');
 process.exit(0);
}catch(e){console.error('[SELF-TEST] FAIL '+(e&&e.message||e));process.exit(1);}
