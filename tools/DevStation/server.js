'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const ROOT=__dirname, cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'config.json'),'utf8'));
const HOST=process.env.DEVSTATION_HOST||cfg.host||'127.0.0.1', PORT=+(process.env.DEVSTATION_PORT||cfg.port||8765);
const WORK=path.resolve(ROOT,cfg.workspace||'workspace');
['screenshots','assets','logs','reports','crash'].forEach(x=>fs.mkdirSync(path.join(WORK,x),{recursive:true}));
const repoRoot=path.resolve(ROOT,'../..');
function json(res,code,obj){const b=Buffer.from(JSON.stringify(obj,null,2));res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store'});res.end(b);}
function system(){const m=process.memoryUsage();return{hostname:os.hostname(),platform:os.platform(),release:os.release(),arch:os.arch(),cpus:os.cpus().length,loadavg:os.loadavg(),uptimeSec:Math.round(os.uptime()),memory:{total:os.totalmem(),free:os.freemem(),processRss:m.rss},node:process.version,at:new Date().toISOString()};}
function screenshots(){const d=path.join(WORK,'screenshots');return fs.readdirSync(d).filter(f=>/\.(png|jpe?g|webp)$/i.test(f)).map(f=>{const p=path.join(d,f),s=fs.statSync(p);return{name:f,mtimeMs:s.mtimeMs,size:s.size,path:p};}).sort((a,b)=>b.mtimeMs-a.mtimeMs);}
function git(args){return cp.execFileSync('git',args,{cwd:repoRoot,encoding:'utf8',timeout:4000,maxBuffer:256*1024}).trim();}
function projectStatus(){let out={id:'ia-tb',root:repoRoot};try{out.branch=git(['rev-parse','--abbrev-ref','HEAD']);out.commit=git(['rev-parse','--short','HEAD']);out.status=git(['status','--short']);out.ok=true;}catch(e){out.ok=false;out.error=e.message;}return out;}
const ACTIONS={
 'ia-tb.git-status':()=>projectStatus(),
 'ia-tb.git-log':()=>({log:git(['log','-8','--oneline','--decorate'])}),
 'system.snapshot':()=>system()
};
function body(req,cb){let a=[],n=0;req.on('data',c=>{n+=c.length;if(n>65536){req.destroy();return;}a.push(c)});req.on('end',()=>{try{cb(null,JSON.parse(Buffer.concat(a).toString('utf8')||'{}'))}catch(e){cb(e)}});}
function ui(res){const h=`<!doctype html><meta charset="utf-8"><title>DevStation Bridge</title><style>body{font:14px system-ui;background:#101318;color:#e7edf5;margin:32px}main{max-width:900px;margin:auto}.card{background:#171c24;border:1px solid #2b3442;border-radius:12px;padding:18px;margin:14px 0}button{padding:9px 13px}pre{white-space:pre-wrap;color:#a9d7ff}</style><main><h1>DevStation Bridge v0.1</h1><div class=card><b>Status</b><pre id=o>Loading…</pre></div><div class=card><button onclick="load()">Refresh</button> <button onclick="shot()">Latest screenshot</button></div><script>async function load(){let a=await fetch('/api/system').then(r=>r.json()),b=await fetch('/api/projects/ia-tb/status').then(r=>r.json());o.textContent=JSON.stringify({system:a,ia_tb:b},null,2)}async function shot(){let r=await fetch('/api/screenshots/latest');if(!r.ok)return alert('No screenshot');location='/api/screenshots/latest'}load()</script></main>`;res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(h);}
const srv=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/')return ui(res);
 if(req.method==='GET'&&u.pathname==='/api/health')return json(res,200,{ok:true,name:'DevStation Bridge',version:'0.1.0',host:HOST,port:PORT});
 if(req.method==='GET'&&u.pathname==='/api/system')return json(res,200,system());
 if(req.method==='GET'&&u.pathname==='/api/projects')return json(res,200,[{id:'ia-tb',root:repoRoot}]);
 if(req.method==='GET'&&u.pathname==='/api/projects/ia-tb/status')return json(res,200,projectStatus());
 if(req.method==='GET'&&u.pathname==='/api/screenshots')return json(res,200,screenshots().map(x=>({name:x.name,mtimeMs:x.mtimeMs,size:x.size})));
 if(req.method==='GET'&&u.pathname==='/api/screenshots/latest'){const a=screenshots();if(!a.length)return json(res,404,{error:'NO_SCREENSHOT'});const p=a[0].path,t=/\.png$/i.test(p)?'image/png':/\.webp$/i.test(p)?'image/webp':'image/jpeg';res.writeHead(200,{'Content-Type':t,'Content-Length':a[0].size,'Cache-Control':'no-store'});return fs.createReadStream(p).pipe(res);}
 if(req.method==='POST'&&u.pathname==='/api/actions')return body(req,(e,o)=>{if(e)return json(res,400,{error:'BAD_JSON'});const a=String(o.action||'');if(!ACTIONS[a])return json(res,403,{error:'ACTION_NOT_ALLOWED',allowed:Object.keys(ACTIONS)});try{json(res,200,{ok:true,action:a,result:ACTIONS[a]()})}catch(x){json(res,500,{ok:false,error:x.message})}});
 json(res,404,{error:'NOT_FOUND'});
});
srv.listen(PORT,HOST,()=>console.log('[DevStation] http://'+HOST+':'+PORT));
