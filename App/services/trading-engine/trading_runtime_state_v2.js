'use strict';
// IA-TB v2.3 P1: fail-closed durable lifecycle; no administrative commands at this stage.
const fs=require('fs'),path=require('path');
const STATES=new Set(['STOPPED','STARTING','RUNNING','DRAINING','DRAINING_BLOCKED','RECONCILING','EMERGENCY_HALTED','DEGRADED','ERROR']);
const BLOCKED=new Set(['STOPPED','DRAINING','DRAINING_BLOCKED','RECONCILING','EMERGENCY_HALTED','ERROR']);
function safeUser(s){return String(s||'default').replace(/[^A-Za-z0-9._-]/g,'_');}
function defaultPath(env=process.env){
  const root=env.IATB_DATA_ROOT||path.join(require('os').homedir(),'IA-TB-UserData-Server');
  return path.resolve(root,'User Data',safeUser(env.IATB_USERDATA_USER),'trading_runtime_state.json');
}
class RuntimeState {
  constructor(options={}){
    this.file=path.resolve(options.file||process.env.IATB_TRADING_RUNTIME_STATE||defaultPath());
    this.now=options.now||Date.now;
    this.current=this._read();
  }
  _read(){
    try {
      const v=JSON.parse(fs.readFileSync(this.file,'utf8'));
      if(!v||v.schema!==1||!STATES.has(v.state))throw Error('RUNTIME_STATE_INVALID');
      return v;
    } catch(e) {
      if(e.code==='ENOENT')return {schema:1,state:'STOPPED',reason:'INITIAL_INSTALL',updated_at:this.now(),recovery_required:true};
      return {schema:1,state:'ERROR',reason:'STATE_STORE_UNREADABLE',updated_at:this.now(),recovery_required:true};
    }
  }
  _persist(data){
    fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});
    const temp=this.file+'.'+process.pid+'.tmp';
    const payload=JSON.stringify(data)+'\n';
    try {
      fs.writeFileSync(temp,payload,{encoding:'utf8',mode:0o600,flag:'wx'});
      fs.renameSync(temp,this.file);
    } catch(e){try{fs.unlinkSync(temp);}catch(_){}throw e;}
    this.current=data;
    return data;
  }
  transition(state,reason,extra={}){
    if(!STATES.has(state))throw Error('RUNTIME_STATE_INVALID');
    return this._persist(Object.assign({},this.current,extra,{schema:1,state,reason:String(reason||'UNSPECIFIED'),updated_at:this.now()}));
  }
  // P1 is safe by default: no implicit transition from STOPPED/HALTED to RUNNING.
  boot(){
    const prior=this.current;
    if(prior.state==='STOPPED'&&prior.reason==='INITIAL_INSTALL'){
      // Service can start in observation mode; enablement needs future ADMIN flow.
      this.transition('STOPPED','AWAITING_ADMIN_ENABLE',{recovery_required:true});
    } else if(['RUNNING','STARTING','DRAINING','RECONCILING','DEGRADED'].includes(prior.state)){
      this.transition('ERROR','UNCLEAN_SHUTDOWN_RECONCILIATION_REQUIRED',{recovery_required:true});
    }
    return this.snapshot();
  }
  snapshot(){return Object.assign({},this.current,{execution_allowed:this.current.state==='RUNNING'&&!this.current.recovery_required});}
  canExecute(){return this.snapshot().execution_allowed;}
}
module.exports={RuntimeState,STATES,BLOCKED,defaultPath};
