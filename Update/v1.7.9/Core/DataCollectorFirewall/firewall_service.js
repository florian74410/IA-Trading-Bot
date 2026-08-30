'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DataCollectorFirewall = require('./data_collector_firewall');

const HOST = process.env.IATB_DATA_FIREWALL_HOST || '127.0.0.1';
const PORT = Number(process.env.IATB_DATA_FIREWALL_PORT || 8018);
const INTERNAL_KEY = String(process.env.IATB_INTERNAL_SERVICE_KEY || '');
const CONFIG_FILE = process.env.IATB_DATA_FIREWALL_CONFIG || path.resolve(__dirname,'../../Parametres/data_collector_firewall.json');
const SETTINGS_HTML = path.join(__dirname,'settings.html');

function defaults(){return{enabled:true,mode:'PROTECTION',rules:Object.assign({},DataCollectorFirewall.DEFAULT_RULES),maxMessageAgeMs:30000,maxFutureSkewMs:5000,maxPayloadBytes:524288,duplicateWindowMs:5000,maxPriceJumpPct:20,maxSpreadPct:10,requireProvenance:true,providerWhitelist:['KRAKEN','KRAKEN_PUBLIC_REFERENCE','GMX','HYPERLIQUID','FX','COINGECKO','DEFILLAMA','BLOCKCHAIN'],typeWhitelist:['PRICE','TICKER','OHLC','OHLCV','CANDLES','TRADES','ORDERBOOK','L2BOOK','MARKET_ANALYTICS','ONCHAIN']};}
function readConfig(){const d=defaults();try{const x=JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8'));if(x&&typeof x==='object')return Object.assign(d,x,{rules:Object.assign({},d.rules,x.rules||{})});}catch(e){}return d;}
function saveConfig(cfg){const dir=path.dirname(CONFIG_FILE);if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});const tmp=CONFIG_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(cfg,null,2)+'\n','utf8');fs.renameSync(tmp,CONFIG_FILE);}

const initial=readConfig();
if(process.env.IATB_DATA_FIREWALL_ENABLED==='0')initial.enabled=false;
if(process.env.IATB_DATA_FIREWALL_MODE)initial.mode=process.env.IATB_DATA_FIREWALL_MODE;
const firewall=new DataCollectorFirewall(initial);

function safeEqual(a,b){const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));return aa.length===bb.length&&aa.length>0&&crypto.timingSafeEqual(aa,bb);}
function loopback(req){const a=String(req.socket&&req.socket.remoteAddress||'');return a==='127.0.0.1'||a==='::1'||a==='::ffff:127.0.0.1';}
function authorized(req,pathname){if(!loopback(req))return false;if(pathname==='/settings')return true;if(!INTERNAL_KEY)return true;return safeEqual(req.headers['x-ia-tb-internal-key'],INTERNAL_KEY);}
function send(res,code,obj){const b=JSON.stringify(obj);res.writeHead(code,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(b),'cache-control':'no-store'});res.end(b);}
function sendSettings(res){let b;try{b=fs.readFileSync(SETTINGS_HTML);}catch(e){return send(res,500,{ok:false,error:'SETTINGS_UI_MISSING'});}res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':b.length,'cache-control':'no-store','content-security-policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors http://127.0.0.1:* http://localhost:*"});res.end(b);}
function readJson(req,cb){let raw='',stopped=false;req.on('data',c=>{if(stopped)return;raw+=c;if(raw.length>Math.max(1024*1024,firewall.maxPayloadBytes*2)){stopped=true;cb(new Error('REQUEST_TOO_LARGE'));req.destroy();}});req.on('end',()=>{if(stopped)return;try{cb(null,raw?JSON.parse(raw):{});}catch(e){cb(new Error('INVALID_JSON'));}});}
function currentConfig(){const s=firewall.status();return{enabled:s.enabled,mode:s.mode,rules:s.rules,maxMessageAgeMs:s.maxMessageAgeMs,maxFutureSkewMs:s.maxFutureSkewMs,maxPayloadBytes:s.maxPayloadBytes,duplicateWindowMs:s.duplicateWindowMs,maxPriceJumpPct:s.maxPriceJumpPct,maxSpreadPct:s.maxSpreadPct,requireProvenance:s.requireProvenance,providerWhitelist:s.providerWhitelist,typeWhitelist:s.typeWhitelist};}
function selfTest(){const now=Date.now(),base={provider:'KRAKEN',source:'KRAKEN',type:'OHLCV',symbol:'BTC/EUR',timestamp:now},cases=[{name:'valid_candle',message:Object.assign({},base,{data:[[now,100,110,90,105,12]]})},{name:'invalid_ohlc',message:Object.assign({},base,{data:[[now,100,95,90,105,12]]})},{name:'negative_price',message:{provider:'KRAKEN',source:'KRAKEN',type:'PRICE',symbol:'BTC/EUR',timestamp:now,data:{price:-1}}},{name:'stale_data',message:Object.assign({},base,{timestamp:now-(firewall.maxMessageAgeMs+1000),data:[[now,100,110,90,105,12]]})},{name:'unknown_provider',message:{provider:'UNKNOWN',source:'UNKNOWN',type:'PRICE',symbol:'BTC/EUR',timestamp:now,data:{price:100}}}],out=[];cases.forEach(c=>{const r=firewall.inspect(c.message);out.push({name:c.name,decision:r.decision,reason:r.reason,issues:r.issues,warnings:r.warnings});});return{ok:true,mode:firewall.mode,enabled:firewall.enabled,cases:out,stats:firewall.status().stats};}

const server=http.createServer((req,res)=>{
  const pathname=String(req.url||'').split('?')[0];
  if(!authorized(req,pathname))return send(res,401,{ok:false,error:'UNAUTHORIZED_LOCAL_CALL'});
  if(req.method==='GET'&&pathname==='/settings')return sendSettings(res);
  if(req.method==='GET'&&pathname==='/health')return send(res,200,{ok:true,service:'DATA_COLLECTOR_FIREWALL',host:HOST,port:PORT,configFile:CONFIG_FILE});
  if(req.method==='GET'&&pathname==='/status')return send(res,200,{ok:true,firewall:firewall.status(),configFile:CONFIG_FILE});
  if(req.method==='GET'&&pathname==='/rules')return send(res,200,{ok:true,rules:firewall.ruleCatalogue(),firewall:firewall.status()});
  if(req.method==='POST'&&pathname==='/configure')return readJson(req,(err,b)=>{if(err)return send(res,400,{ok:false,error:err.message});try{const st=firewall.configure(b);saveConfig(currentConfig());send(res,200,{ok:true,firewall:st,persisted:true});}catch(e){send(res,400,{ok:false,error:'INVALID_CONFIGURATION',detail:e.message});}});
  if(req.method==='POST'&&pathname==='/inspect')return readJson(req,(err,b)=>{if(err)return send(res,400,{ok:false,error:err.message});const r=firewall.inspect(b&&b.message?b.message:b);send(res,r.decision==='REJECT'?422:200,r);});
  if(req.method==='POST'&&pathname==='/debug/self-test')return send(res,200,selfTest());
  if(req.method==='POST'&&pathname==='/debug/reset')return send(res,200,{ok:true,firewall:firewall.resetStats()});
  return send(res,404,{ok:false,error:'NOT_FOUND'});
});

server.listen(PORT,HOST,()=>console.log('[DataCollectorFirewall] http://'+HOST+':'+PORT+' mode='+firewall.mode));
module.exports={server,firewall,readConfig,saveConfig};
