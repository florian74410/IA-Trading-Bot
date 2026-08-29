'use strict';
var path=require('path'),Client=require('./memory_client'),boot=require('./runtime_bootstrap');
function load(client){return new Promise(function(resolve,reject){client.load(function(e){if(e)reject(e);else resolve(client);});});}
function get(client,provider,scope){return new Promise(function(resolve,reject){client.getCredential(provider,scope,function(e,v){if(e){if(e.statusCode===404)return resolve('');return reject(e);}resolve(v==null?'':String(v));});});}
function CredentialService(opt){opt=opt||{};this.root=path.resolve(opt.root||path.join(__dirname,'..'));this.username=opt.username||boot.resolveUsername(this.root);this.client=new Client({username:this.username});this.ready=false;}
CredentialService.prototype.init=async function(){await load(this.client);this.ready=true;return this;};
CredentialService.prototype.value=async function(provider,scope){if(!this.ready)await this.init();return get(this.client,String(provider).toUpperCase(),String(scope).toUpperCase());};
CredentialService.prototype.exchange=async function(exchange){var ex=String(exchange||'').toUpperCase();if(!ex)throw new Error('EXCHANGE_REQUIRED');var out={};
 if(ex==='GMX')return out;
 out.api_key=await this.value(ex,'API_KEY');
 out.api_secret=(await this.value(ex,'API_SECRET'))||(await this.value(ex,'SECRET_KEY'))||(await this.value(ex,'SECRET'));
 if(ex==='OKX'){out.passphrase=await this.value(ex,'PASSPHRASE');var demo=await this.value(ex,'DEMO_MODE');out.demo_mode=/^(1|true|yes)$/i.test(demo);}
 if(ex==='KRAKEN'){out.key=out.api_key;out.secret=out.api_secret;}
 return out;};
CredentialService.prototype.configured=async function(exchange){var x=await this.exchange(exchange),ex=String(exchange||'').toUpperCase();if(ex==='GMX')return false;if(ex==='OKX')return!!(x.api_key&&x.api_secret&&x.passphrase);return!!(x.api_key&&x.api_secret);};
module.exports=CredentialService;
