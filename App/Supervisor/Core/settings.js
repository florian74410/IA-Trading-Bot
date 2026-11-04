'use strict';
var SettingsStore=require('../../Core/Settings/sqlite_settings_store');
function SupervisorSettings(root){this.store=new SettingsStore(root);}
SupervisorSettings.prototype.app=function(){var active=this.store.get('app_settings','active_file','DefaultAppSettings.dat'),x=this.store.get('app_profile',active,null);if(!x&&active!=='DefaultAppSettings.dat')x=this.store.get('app_profile','DefaultAppSettings.dat',null);return x&&typeof x==='object'?x:{};};
SupervisorSettings.prototype.llm=function(){var a=this.app(),x=a.ai&&a.ai.llm||{};return{provider:String(x.provider||'MOCK').toUpperCase(),fallbackEnabled:x.fallbackEnabled===true,fallbackProvider:String(x.fallbackProvider||'OPENAI_API').toUpperCase(),openai:Object.assign({model:'gpt-5.6',timeoutMs:45000},x.openai||{}),remote:Object.assign({endpoint:'',model:'',timeoutMs:45000,healthTimeoutMs:5000},x.remote||{}),mock:x.mock||{}};};
SupervisorSettings.prototype.models=function(){
 const available=[...new Set((process.env.IATB_OPENAI_ALLOWED_MODELS||'gpt-5.6,gpt-5-mini,gpt-4.1-mini').split(',').map(x=>x.trim()).filter(x=>/^gpt-[A-Za-z0-9._-]{2,80}$/.test(x)))];
 const config=this.llm();return {provider:config.provider,configured:config.openai.model,selected:available.includes(config.openai.model)?config.openai.model:null,available};
};
SupervisorSettings.prototype.selectLlm=function(input,principal){
 if(!principal||principal.role!=='ADMIN'||!/^CL[A-Za-z0-9_-]{1,64}$/.test(principal.clientId))throw Error('LLM_ADMIN_REQUIRED');
 const provider=String(input&&input.provider||'OPENAI_API').toUpperCase(),model=String(input&&input.model||'');
 if(!['OPENAI_API','MOCK'].includes(provider)||!this.models().available.includes(model))throw Error('LLM_MODEL_NOT_ALLOWED');
 const active=this.store.get('app_settings','active_file','DefaultAppSettings.dat'),app=this.app(),ai={...(app.ai||{})},llm={...(ai.llm||{})};
 llm.provider=provider;llm.openai={...(llm.openai||{}),model};ai.llm=llm;
 this.store.set('app_profile',active,{...app,ai});
 return {provider,selected:model,available:this.models().available,persisted:true};
};
SupervisorSettings.prototype.autonomous=function(){var a=this.app(),x=a.ai&&a.ai.autonomousTrading||{};return{masterEnabled:x.masterEnabled===true,mode:String(x.mode||'OFF').toUpperCase(),paperRequiresConfirmation:x.paperRequiresConfirmation!==false,liveGuardedEnabled:x.liveGuardedEnabled===true,chatCommandsEnabled:x.chatCommandsEnabled!==false};};
SupervisorSettings.prototype.status=function(){return this.store.status();};
module.exports=SupervisorSettings;