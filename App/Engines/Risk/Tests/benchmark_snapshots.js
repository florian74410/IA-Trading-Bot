'use strict';
// Reproducible synthetic benchmark; never contacts an exchange.
const {performance}=require('node:perf_hooks'),os=require('node:os'),fs=require('node:fs'),{execFileSync}=require('node:child_process'),Module=require('node:module'),{fixture}=require('./snapshot_fixture'),math=require('../Snapshots/math'),{Orchestrator}=require('../Snapshots/orchestrator');
const root=require('node:path').resolve(__dirname,"../../../.."),n=+(process.env.RISK_BENCH_N||100),delay=ms=>new Promise(r=>setTimeout(r,ms));
function stats(times){const x=[...times].sort((a,b)=>a-b),p=q=>x[Math.min(x.length-1,Math.ceil(q*x.length)-1)];return {n:x.length,p50_ms:p(.5),p95_ms:p(.95),p99_ms:p(.99)};}
async function measure(fn,count=n){const cpu=process.cpuUsage(),rss=process.memoryUsage().rss,times=[];let peak=rss;const t=performance.now();for(let i=0;i<count;i++){const s=performance.now();await fn(i);times.push(performance.now()-s);peak=Math.max(peak,process.memoryUsage().rss);}const c=process.cpuUsage(cpu);return {...stats(times),wall_ms:performance.now()-t,cpu_user_ms:c.user/1000,cpu_system_ms:c.system/1000,rss_start_bytes:rss,rss_peak_sampled_bytes:peak};}
(async()=>{
 const f=fixture();f.sources.market.candles=Array.from({length:500},(_,i)=>[f.now-(500-i)*60000,100,100,100,100+Math.sin(i)*.005]);
 const request=async(...args)=>{await delay(5);return f.request(...args);};const o=new Orchestrator({request,now:()=>f.now});
 const source=execFileSync('git',['show','a4c86e6c:App/Risk/Engine/risk_engine.js'],{cwd:root,encoding:'utf8'}),baseline=new Module('baseline');baseline._compile(source,'baseline.js');
 const result={schema:'risk.benchmark/1.0',fixture:'500 timestamp-aligned 1m candles, empty reconciled portfolio, two 2000-unit book levels, 3 net trades; synthetic 5ms I/O per source',machine:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,logical_cpus:os.cpus().length,memory_bytes:os.totalmem()},baseline_commit:'a4c86e6c',notes:['CPU/RSS cover the Node process including worker threads; sampled RSS is not an OS high-water mark.','Legacy core and vNext have different scope; no before/after speedup ratio is claimed.','Sequential and parallel vNext have identical inputs and calculations; only the CPU scheduling differs.']};
 try{
 result.legacy_core=await measure(()=>baseline.exports.analyze({symbol:f.args.symbol,timeframe:'1m',market:{candles:f.sources.market.candles},portfolio:f.sources.portfolio}));
 result.parallel_cold=await measure(()=>o.create(f.args,{mode:'parallel'}),1);
 result.sequential=await measure(()=>o.create(f.args,{mode:'sequential'}));
 result.parallel_warm=await measure(()=>o.create(f.args,{mode:'parallel'}));
 result.default=await measure(()=>o.create(f.args));
 const batch=async(count)=>{const start=performance.now(),settled=await Promise.allSettled(Array.from({length:count},(_,i)=>o.create({...f.args,correlation_id:'batch-'+i})));return {requested:count,fulfilled:settled.filter(x=>x.status==='fulfilled').length,rejected:settled.filter(x=>x.status==='rejected').map(x=>x.reason.message),wall_ms:performance.now()-start};};
 result.concurrency=await batch(4);result.overload=await batch(5);
 const slow=new Orchestrator({request:()=>new Promise(()=>{}),config:{ioTimeoutMs:50}});try{result.unavailable_source=await measure(()=>slow.create(f.args),5);}finally{await slow.close();}
 const dataset={candles:f.sources.market.candles,timeframe:'1m',portfolio:f.sources.portfolio,book:f.sources.book,intent:f.args.intent,trades:f.sources.trades.trades,feeRate:f.sources.book.feeRate,exchangeConstraints:f.sources.book.exchangeConstraints};
 result.cpu_sequential_only=await measure(()=>{for(const k of ['market','portfolio','execution','strategy'])math[k](dataset);});
 result.cpu_parallel_only=await measure(()=>Promise.all(['market','portfolio','execution','strategy'].map(k=>o.pool.run(k,dataset))));
 const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await o.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
