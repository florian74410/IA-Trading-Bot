'use strict';
var fs=require('fs'),path=require('path'),os=require('os'),child=require('child_process');
function q(s){return "'"+String(s==null?'':s).replace(/'/g,"''")+"'";}
function Store(o){
 o=o||{};this.sqlite=process.env.IATB_SQLITE_BIN||'sqlite3';
 this.retentionDays=Math.max(30,Math.min(90,+o.retentionDays||90));
 this.persistIntervalMs=Math.max(15000,+o.persistIntervalMs||60000);
 this.file=path.resolve(o.file||process.env.IATB_MARKET_MICROSTRUCTURE_DB||path.join(process.env.IATB_DATA_ROOT||path.join(os.homedir(),'IA-TB-UserData-Server'),'Shared Data','MarketData','market_microstructure.db'));
 this.ready=false;this.lastError='';this.lastPruneAt=0;this.lastPersistByKey=Object.create(null);this.init();
}
Store.prototype.run=function(sql,read){
 fs.mkdirSync(path.dirname(this.file),{recursive:true});
 var a=read?['-batch','-noheader','-separator','\t',this.file]:['-batch',this.file],
     r=child.spawnSync(this.sqlite,a,{input:String(sql||''),encoding:'utf8',timeout:12000,maxBuffer:16*1024*1024});
 if(r.error)throw r.error;if(r.status!==0)throw new Error(String(r.stderr||'SQLITE_ERROR').trim());return String(r.stdout||'');
};
Store.prototype.init=function(){try{
 this.run("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;"+
 " CREATE TABLE IF NOT EXISTS microstructure_snapshots(id INTEGER PRIMARY KEY AUTOINCREMENT,timestamp INTEGER NOT NULL,provider TEXT NOT NULL,symbol TEXT NOT NULL,depth INTEGER NOT NULL,firewall_decision TEXT,data_json TEXT NOT NULL);"+
 " CREATE INDEX IF NOT EXISTS idx_micro_ts ON microstructure_snapshots(timestamp);"+
 " CREATE INDEX IF NOT EXISTS idx_micro_provider_symbol_ts ON microstructure_snapshots(provider,symbol,timestamp);"+
 " CREATE TABLE IF NOT EXISTS liquidation_events(id INTEGER PRIMARY KEY AUTOINCREMENT,timestamp INTEGER NOT NULL,provider TEXT NOT NULL,symbol TEXT NOT NULL,side TEXT NOT NULL,price REAL NOT NULL,quantity REAL NOT NULL,notional_usd REAL,event_key TEXT UNIQUE,data_json TEXT NOT NULL);"+
 " CREATE INDEX IF NOT EXISTS idx_liqevt_ts ON liquidation_events(timestamp);"+
 " CREATE INDEX IF NOT EXISTS idx_liqevt_symbol_ts ON liquidation_events(symbol,timestamp);");
 this.ready=true;this.prune(true);
}catch(e){this.ready=false;this.lastError=e.message;}};
Store.prototype.saveSnapshot=function(snapshot,firewall){
 if(!this.ready||!snapshot)return false;
 var ts=+snapshot.observedAt||Date.now(),provider=String(snapshot.source||snapshot.provider||'UNKNOWN').toUpperCase(),symbol=String(snapshot.symbol||snapshot.canonicalSymbol||'').toUpperCase(),key=provider+'|'+symbol,last=this.lastPersistByKey[key]||0;
 if(ts-last<this.persistIntervalMs)return false;
 try{this.run("INSERT INTO microstructure_snapshots(timestamp,provider,symbol,depth,firewall_decision,data_json) VALUES("+[Math.round(ts),q(provider),q(symbol),Math.max(0,+snapshot.depth||0),q(firewall&&firewall.decision||'PASS'),q(JSON.stringify(snapshot))].join(',')+");");this.lastPersistByKey[key]=ts;this.lastError='';this.prune(false);return true;}catch(e){this.lastError=e.message;return false;}
};
Store.prototype.save=Store.prototype.saveSnapshot;
Store.prototype.saveLiquidation=function(x){
 if(!this.ready||!x)return false;var key=String(x.eventKey||[x.provider,x.symbol,x.timestamp,x.side,x.price,x.quantity].join('|'));
 try{this.run("INSERT OR IGNORE INTO liquidation_events(timestamp,provider,symbol,side,price,quantity,notional_usd,event_key,data_json) VALUES("+[
  Math.round(+x.timestamp||Date.now()),q(String(x.provider||x.source||'UNKNOWN').toUpperCase()),q(String(x.symbol||'').toUpperCase()),q(String(x.side||'').toUpperCase()),+x.price||0,+x.quantity||0,isFinite(+x.notionalUsd)?+x.notionalUsd:'NULL',q(key),q(JSON.stringify(x))
 ].join(',')+");");this.lastError='';this.prune(false);return true;}catch(e){this.lastError=e.message;return false;}
};
Store.prototype.prune=function(force){
 if(!this.ready)return;if(!force&&Date.now()-this.lastPruneAt<3600000)return;
 try{var cut=Date.now()-this.retentionDays*86400000;this.run('DELETE FROM microstructure_snapshots WHERE timestamp < '+Math.round(cut)+'; DELETE FROM liquidation_events WHERE timestamp < '+Math.round(cut)+';');this.lastPruneAt=Date.now();this.lastError='';}catch(e){this.lastError=e.message;}
};
Store.prototype.history=function(o){
 o=o||{};if(!this.ready)return{ok:false,error:'MARKET_MICROSTRUCTURE_SQL_UNAVAILABLE',items:[]};
 var provider=String(o.source||o.provider||'').toUpperCase(),symbol=String(o.symbol||'').toUpperCase(),limit=Math.max(1,Math.min(2000,+o.limit||240)),since=Math.max(0,+o.since||0),where=[];
 if(provider&&provider!=='AUTO')where.push('provider='+q(provider));if(symbol)where.push('symbol='+q(symbol));if(since)where.push('timestamp>='+Math.round(since));
 try{var raw=this.run('SELECT data_json FROM microstructure_snapshots'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY timestamp DESC LIMIT '+limit+';',true).trim(),items=[];if(raw)raw.split(/\r?\n/).filter(Boolean).forEach(function(line){try{items.push(JSON.parse(line));}catch(e){}});items.reverse();return{ok:true,schema:'marketdata.microstructure.history/1.0',items:items,count:items.length,retentionDays:this.retentionDays};}catch(e){this.lastError=e.message;return{ok:false,error:e.message,items:[]};}
};
Store.prototype.liquidations=function(o){
 o=o||{};if(!this.ready)return{ok:false,error:'MARKET_MICROSTRUCTURE_SQL_UNAVAILABLE',items:[]};
 var symbol=String(o.symbol||'').toUpperCase(),provider=String(o.provider||o.source||'').toUpperCase(),limit=Math.max(1,Math.min(5000,+o.limit||500)),since=Math.max(0,+o.since||0),where=[];
 if(symbol)where.push('symbol='+q(symbol));if(provider&&provider!=='AUTO')where.push('provider='+q(provider));if(since)where.push('timestamp>='+Math.round(since));
 try{var raw=this.run('SELECT data_json FROM liquidation_events'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY timestamp DESC LIMIT '+limit+';',true).trim(),items=[];if(raw)raw.split(/\r?\n/).filter(Boolean).forEach(function(line){try{items.push(JSON.parse(line));}catch(e){}});return{ok:true,schema:'marketdata.liquidations/1.0',items:items,count:items.length,retentionDays:this.retentionDays};}catch(e){this.lastError=e.message;return{ok:false,error:e.message,items:[]};}
};
Store.prototype.status=function(){
 var snapshots=0,liquidations=0,oldest=null,newest=null;if(this.ready)try{var r=this.run('SELECT COUNT(*),MIN(timestamp),MAX(timestamp) FROM microstructure_snapshots;',true).trim().split('\t'),l=this.run('SELECT COUNT(*) FROM liquidation_events;',true).trim();snapshots=+r[0]||0;oldest=+r[1]||null;newest=+r[2]||null;liquidations=+l||0;}catch(e){this.lastError=e.message;}
 return{ok:this.ready,mode:'SQLITE',file:this.file,retentionDays:this.retentionDays,persistIntervalMs:this.persistIntervalMs,snapshots:snapshots,liquidations:liquidations,oldestTimestamp:oldest,newestTimestamp:newest,lastError:this.lastError||null};
};
module.exports=Store;
