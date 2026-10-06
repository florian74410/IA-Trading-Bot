'use strict';
var fs=require('fs'),path=require('path'),child=require('child_process');
var db=path.resolve(process.env.IATB_API_TELEMETRY_DB||process.argv[2]||'workload_telemetry.db');
function sql(q){
 var r=child.spawnSync(process.env.IATB_SQLITE_BIN||'sqlite3',['-batch','-noheader','-separator','\t',db],{input:q,encoding:'utf8',timeout:15000,maxBuffer:32*1024*1024});
 if(r.error)throw r.error;if(r.status!==0)throw new Error(String(r.stderr||'SQLITE_ERROR'));return String(r.stdout||'').trim();
}
function rows(q,cols){
 var raw=sql(q);if(!raw)return[];return raw.split(/\r?\n/).filter(Boolean).map(function(line){var a=line.split('\t'),o={};cols.forEach(function(k,i){o[k]=a[i]==null?'':a[i];});return o;});
}
function num(v){v=+v;return isFinite(v)?v:0;}
function pct(a,b){return b?Math.round(a/b*1000)/10:0;}
function esc(s){return String(s==null?'':s).replace(/\|/g,'\\|');}

var providers=rows("SELECT provider,COUNT(*),SUM(CASE WHEN ok=1 THEN 1 ELSE 0 END),SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END),ROUND(AVG(latency_ms),1),MAX(latency_ms),SUM(COALESCE(response_bytes,0)),ROUND(SUM(COALESCE(cost,0)),2) FROM api_calls WHERE phase='HTTP_END' GROUP BY provider ORDER BY COUNT(*) DESC;",['provider','calls','success','errors','avgLatencyMs','maxLatencyMs','bytes','cost']);
var logical=rows("SELECT provider,COUNT(*),SUM(CASE WHEN cache_opportunity=1 THEN 1 ELSE 0 END),SUM(CASE WHEN dedup_opportunity=1 THEN 1 ELSE 0 END) FROM api_calls WHERE phase='ORCHESTRATOR_START' GROUP BY provider ORDER BY COUNT(*) DESC;",['provider','logical','cacheOpp','dedupOpp']);
var status=rows("SELECT provider,status_code,COUNT(*) FROM api_calls WHERE phase='HTTP_END' AND status_code IS NOT NULL GROUP BY provider,status_code ORDER BY provider,status_code;",['provider','status','count']);
var paths=rows("SELECT provider,path,COUNT(*),ROUND(SUM(COALESCE(cost,0)),2),ROUND(AVG(latency_ms),1) FROM api_calls WHERE phase='HTTP_END' GROUP BY provider,path ORDER BY COUNT(*) DESC LIMIT 40;",['provider','path','calls','cost','avgLatencyMs']);
var errors=rows("SELECT provider,error_code,COUNT(*) FROM api_calls WHERE phase='HTTP_END' AND ok=0 GROUP BY provider,error_code ORDER BY COUNT(*) DESC;",['provider','error','count']);
var stream=rows("SELECT provider,COUNT(*),MAX(messages),MAX(reconnects),MAX(subscriptions),SUM(CASE WHEN event_type='ERROR' OR state='ERROR' OR state='DEGRADED' THEN 1 ELSE 0 END) FROM stream_events GROUP BY provider ORDER BY provider;",['provider','samples','messages','reconnects','subscriptions','errorSamples']);
var metaRows=rows("SELECT provider,meta_json FROM api_calls WHERE phase='HTTP_END' AND meta_json<>'';",['provider','meta']);
var quotaHints={},scopePeaks={};
metaRows.forEach(function(r){try{
 var m=JSON.parse(r.meta||'{}'),qh=m.quotaHeaders||{};
 if(Object.keys(qh).length)quotaHints[r.provider]=Object.assign(quotaHints[r.provider]||{},qh);
 (m.scopeBudgets||[]).forEach(function(s){
  var id=s.scope||'UNKNOWN',key=r.provider+' / '+id,used=num(s.used),lim=s.limit==null?null:num(s.limit),entry=scopePeaks[key]||{provider:r.provider,scope:id,peakUsed:0,limit:lim,kind:s.kind||'',source:s.source||''};
  if(used>entry.peakUsed)entry.peakUsed=used;if(lim!=null)entry.limit=lim;scopePeaks[key]=entry;
 });
}catch(e){}});

var totalCalls=providers.reduce(function(z,x){return z+num(x.calls);},0),totalErrors=providers.reduce(function(z,x){return z+num(x.errors);},0),totalBytes=providers.reduce(function(z,x){return z+num(x.bytes);},0),totalCost=providers.reduce(function(z,x){return z+num(x.cost);},0);
var lines=[];
lines.push('# IA-TB Shadow Runtime Workload Telemetry Report');
lines.push('');
lines.push('- Database: '+db);
lines.push('- HTTP calls: '+totalCalls);
lines.push('- HTTP errors: '+totalErrors+' ('+pct(totalErrors,totalCalls)+'%)');
lines.push('- Response bytes: '+totalBytes);
lines.push('- Aggregate configured cost units observed: '+Math.round(totalCost*100)/100);
lines.push('');
lines.push('## Provider HTTP summary');
lines.push('');
lines.push('| Provider | Calls | Success | Errors | Avg ms | Max ms | Bytes | Cost units |');
lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
providers.forEach(function(x){lines.push('| '+esc(x.provider)+' | '+x.calls+' | '+x.success+' | '+x.errors+' | '+x.avgLatencyMs+' | '+x.maxLatencyMs+' | '+x.bytes+' | '+x.cost+' |');});
lines.push('');
lines.push('## Logical Broker opportunities');
lines.push('');
lines.push('| Provider | Logical requests | Cache opportunities | In-flight dedup opportunities |');
lines.push('|---|---:|---:|---:|');
logical.forEach(function(x){lines.push('| '+esc(x.provider)+' | '+x.logical+' | '+x.cacheOpp+' | '+x.dedupOpp+' |');});
if(!logical.length)lines.push('No logical Broker events were emitted for this workload.');
lines.push('');
lines.push('## Scoped budget peak observations');
lines.push('');
lines.push('| Provider / scope | Kind | Peak used | Limit | Utilization | Source |');
lines.push('|---|---|---:|---:|---:|---|');
Object.keys(scopePeaks).sort().forEach(function(k){var x=scopePeaks[k],u=x.limit?pct(x.peakUsed,x.limit)+'%':'n/a';lines.push('| '+esc(k)+' | '+esc(x.kind)+' | '+x.peakUsed+' | '+(x.limit==null?'unknown':x.limit)+' | '+u+' | '+esc(x.source)+' |');});
if(!Object.keys(scopePeaks).length)lines.push('No scoped budget metadata observed.');
lines.push('');
lines.push('## HTTP status distribution');
lines.push('');
status.forEach(function(x){lines.push('- '+x.provider+': HTTP '+x.status+' x '+x.count);});
if(!status.length)lines.push('- None');
lines.push('');
lines.push('## Top endpoint families');
lines.push('');
lines.push('| Provider | Endpoint | Calls | Cost | Avg ms |');
lines.push('|---|---|---:|---:|---:|');
paths.forEach(function(x){lines.push('| '+esc(x.provider)+' | '+esc(x.path)+' | '+x.calls+' | '+x.cost+' | '+x.avgLatencyMs+' |');});
lines.push('');
lines.push('## Errors');
lines.push('');
if(errors.length)errors.forEach(function(x){lines.push('- '+x.provider+': '+x.error+' x '+x.count);});else lines.push('- None');
lines.push('');
lines.push('## Quota headers observed');
lines.push('');
var qks=Object.keys(quotaHints);if(qks.length)qks.forEach(function(p){lines.push('- '+p+': '+JSON.stringify(quotaHints[p]));});else lines.push('- None');
lines.push('');
lines.push('## Stream telemetry');
lines.push('');
if(stream.length){
 lines.push('| Provider | Samples | Messages | Reconnects* | Subscriptions | Error samples |');
 lines.push('|---|---:|---:|---:|---:|---:|');
 stream.forEach(function(x){lines.push('| '+x.provider+' | '+x.samples+' | '+x.messages+' | '+x.reconnects+' | '+x.subscriptions+' | '+x.errorSamples+' |');});
 lines.push('');
 lines.push('* Current reconnect field follows worker retry-state semantics and is not yet a guaranteed lifetime counter.');
}else lines.push('- No stream samples');
lines.push('');
lines.push('## Interpretation guardrails');
lines.push('');
lines.push('- Shadow does not block, delay, deduplicate or substitute cache responses.');
lines.push('- HTTP_END rows represent actual outbound consumption; ORCHESTRATOR_START rows represent logical intent where a logical provider wrapper is installed.');
lines.push('- One workload run validates architecture and gives first measurements, but should not alone define final Native safety margins.');
var out=lines.join('\n')+'\n',outPath=path.resolve(process.env.IATB_WORKLOAD_REPORT||path.join(path.dirname(db),'workload_telemetry_report.md'));
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,out,'utf8');
console.log(out);
console.log('REPORT_FILE='+outPath);
