'use strict';
var fs=require('fs'),path=require('path'),os=require('os'),child=require('child_process');
function q(s){return "'"+String(s==null?'':s).replace(/'/g,"''")+"'";}
function n(v){v=+v;return isFinite(v)?v:null;}
function Store(o){
 o=o||{};this.sqlite=process.env.IATB_SQLITE_BIN||'sqlite3';
 this.retentionDays=Math.max(7,Math.min(365,+o.retentionDays||90));
 this.file=path.resolve(o.file||process.env.IATB_API_TELEMETRY_DB||path.join(process.env.IATB_DATA_ROOT||path.join(os.homedir(),'IA-TB-UserData-Server'),'Shared Data','MarketData','api_telemetry.db'));
 this.ready=false;this.lastError='';this.lastPruneAt=0;this.init();
}
Store.prototype.run=function(sql,read){
 fs.mkdirSync(path.dirname(this.file),{recursive:true});
 var a=read?['-batch','-noheader','-separator','\t',this.file]:['-batch',this.file],
 r=child.spawnSync(this.sqlite,a,{input:String(sql||''),encoding:'utf8',timeout:12000,maxBuffer:16*1024*1024});
 if(r.error)throw r.error;if(r.status!==0)throw new Error(String(r.stderr||'SQLITE_ERROR').trim());return String(r.stdout||'');
};
Store.prototype.init=function(){try{
 this.run("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;"+
 " CREATE TABLE IF NOT EXISTS api_calls(id INTEGER PRIMARY KEY AUTOINCREMENT,request_id TEXT,timestamp INTEGER NOT NULL,completed_at INTEGER,provider TEXT,host TEXT,method TEXT,path TEXT,dataset TEXT,phase TEXT,status_code INTEGER,ok INTEGER,latency_ms INTEGER,response_bytes INTEGER,cost REAL,priority TEXT,freshness TEXT,criticality TEXT,cache_opportunity INTEGER,dedup_opportunity INTEGER,budget_short_allow INTEGER,budget_long_allow INTEGER,error_code TEXT,meta_json TEXT);"+
 " CREATE INDEX IF NOT EXISTS idx_api_calls_ts ON api_calls(timestamp);"+
 " CREATE INDEX IF NOT EXISTS idx_api_calls_provider_ts ON api_calls(provider,timestamp);"+
 " CREATE INDEX IF NOT EXISTS idx_api_calls_dataset_ts ON api_calls(dataset,timestamp);"+
 " CREATE INDEX IF NOT EXISTS idx_api_calls_request ON api_calls(request_id);");
 this.ready=true;this.prune(true);
 }catch(e){this.ready=false;this.lastError=e.message;}
};
Store.prototype.save=function(x){
 if(!this.ready||!x)return false;
 try{
  this.run("INSERT INTO api_calls(request_id,timestamp,completed_at,provider,host,method,path,dataset,phase,status_code,ok,latency_ms,response_bytes,cost,priority,freshness,criticality,cache_opportunity,dedup_opportunity,budget_short_allow,budget_long_allow,error_code,meta_json) VALUES("+[
   q(x.requestId||''),Math.round(+x.timestamp||Date.now()),x.completedAt?Math.round(+x.completedAt):'NULL',q(String(x.provider||'UNKNOWN').toUpperCase()),q(x.host||''),q(String(x.method||'GET').toUpperCase()),q(x.path||''),q(String(x.dataset||'').toUpperCase()),q(String(x.phase||'').toUpperCase()),x.statusCode!=null?Math.round(+x.statusCode):'NULL',x.ok==null?'NULL':(x.ok?1:0),n(x.latencyMs)!=null?Math.round(+x.latencyMs):'NULL',n(x.responseBytes)!=null?Math.round(+x.responseBytes):'NULL',n(x.cost)!=null?+x.cost:'NULL',q(x.priority||''),q(x.freshness||''),q(x.criticality||''),x.cacheOpportunity==null?'NULL':(x.cacheOpportunity?1:0),x.dedupOpportunity==null?'NULL':(x.dedupOpportunity?1:0),x.budgetShortAllow==null?'NULL':(x.budgetShortAllow?1:0),x.budgetLongAllow==null?'NULL':(x.budgetLongAllow?1:0),q(x.errorCode||''),q(JSON.stringify(x.meta||{}))
  ].join(',')+");");
  this.lastError='';this.prune(false);return true;
 }catch(e){this.lastError=e.message;return false;}
};
Store.prototype.prune=function(force){
 if(!this.ready)return;if(!force&&Date.now()-this.lastPruneAt<3600000)return;
 try{var cut=Date.now()-this.retentionDays*86400000;this.run('DELETE FROM api_calls WHERE timestamp < '+Math.round(cut)+';');this.lastPruneAt=Date.now();this.lastError='';}catch(e){this.lastError=e.message;}
};
Store.prototype.status=function(){
 var count=0,oldest=null,newest=null,providers=0;if(this.ready)try{
  var r=this.run('SELECT COUNT(*),MIN(timestamp),MAX(timestamp) FROM api_calls;',true).trim().split('\t');count=+r[0]||0;oldest=+r[1]||null;newest=+r[2]||null;providers=+(this.run("SELECT COUNT(DISTINCT provider) FROM api_calls WHERE provider<>'';",true).trim())||0;
 }catch(e){this.lastError=e.message;}
 return{ok:this.ready,mode:'SQLITE',file:this.file,retentionDays:this.retentionDays,events:count,providers:providers,oldestTimestamp:oldest,newestTimestamp:newest,lastError:this.lastError||null};
};
module.exports=Store;
