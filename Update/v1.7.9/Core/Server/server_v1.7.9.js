'use strict';
/* IA-Trading-Bot v1.7.9 Core entrypoint.
   Extends the stable v1.7.8 Core with CoinGecko Settings/API support while preserving
   the existing RSA-OAEP vault implementation. The source transform is deliberately
   strict: startup aborts if a v1.7.8 marker changed unexpectedly.
*/
var fs=require('fs'),path=require('path');
var base=path.join(__dirname,'server_v1.0.js');
var src=fs.readFileSync(base,'utf8');
function replaceOnce(find,repl,label){var i=src.indexOf(find);if(i<0)throw new Error('V1.7.9_CORE_PATCH_MARKER_MISSING:'+label);if(src.indexOf(find,i+find.length)>=0&&label!=='SETTINGS_APIS_BODY')throw new Error('V1.7.9_CORE_PATCH_MARKER_AMBIGUOUS:'+label);src=src.slice(0,i)+repl+src.slice(i+find.length);}
replaceOnce("return{openai:!!s.OPENAI_API_KEY,x:!!s.X_BEARER_TOKEN};","return{openai:!!s.OPENAI_API_KEY,x:!!s.X_BEARER_TOKEN,coingecko:!!s.COINGECKO_API_KEY};",'SECRET_STATUS');
replaceOnce("function request(method,url,headers,data,cb,timeout){",
"function internalCoinGeckoKey(req,res){if(!internalRequestOK(req))return json(res,403,{ok:false,error:'INTERNAL_AUTH_FAILED'});var us=unlockedSession();if(!us)return json(res,423,{ok:false,error:'COINGECKO_VAULT_LOCKED_LOGIN_REQUIRED'});var token=getSecret(us,'COINGECKO_API_KEY');return json(res,200,{ok:true,configured:!!token,apiKey:token||''});}\n"+
"function marketDataInternal(pathname,cb){var k;try{k=ensureInternalServiceKey();}catch(e){return cb(e);}var q=http.request({host:'127.0.0.1',port:+(process.env.IATB_MARKET_DATA_PORT||8013),path:pathname,method:'POST',timeout:12000,headers:{Accept:'application/json','Content-Type':'application/json','Content-Length':'2','x-ia-tb-internal-key':k}},function(r){var a=[];r.on('data',function(c){a.push(c);});r.on('end',function(){var o;try{o=JSON.parse(Buffer.concat(a).toString('utf8')||'{}');}catch(e){return cb(new Error('MARKET_DATA_JSON_INVALID'));}if((r.statusCode||500)>=400)return cb(new Error(o.error||('MarketData HTTP '+r.statusCode)));cb(null,o);});});q.on('timeout',function(){q.destroy(new Error('MARKET_DATA_TIMEOUT'));});q.on('error',cb);q.end('{}');}\n"+
"function request(method,url,headers,data,cb,timeout){",'INTERNAL_HELPERS');
replaceOnce("if(req.method==='POST'&&p==='/api/internal/x/search')return internalXSearch(req,res);",
"if(req.method==='POST'&&p==='/api/internal/x/search')return internalXSearch(req,res);\n if(req.method==='GET'&&p==='/api/internal/coingecko/key')return internalCoinGeckoKey(req,res);",'INTERNAL_ROUTE');
replaceOnce("openaiConfigured:st.openai,xConfigured:st.x,","openaiConfigured:st.openai,xConfigured:st.x,coingeckoConfigured:st.coingecko,",'SETTINGS_STATUS');
replaceOnce("if(String(b.openaiApiKey||'').trim())v.OPENAI_API_KEY=String(b.openaiApiKey).trim();if(String(b.xBearerToken||'').trim())v.X_BEARER_TOKEN=String(b.xBearerToken).trim();",
"if(String(b.openaiApiKey||'').trim())v.OPENAI_API_KEY=String(b.openaiApiKey).trim();if(String(b.xBearerToken||'').trim())v.X_BEARER_TOKEN=String(b.xBearerToken).trim();if(String(b.coingeckoApiKey||'').trim())v.COINGECKO_API_KEY=String(b.coingeckoApiKey).trim();",'SETTINGS_APIS_BODY');
replaceOnce("if(['OPENAI_API_KEY','X_BEARER_TOKEN'].indexOf(k)<0)","if(['OPENAI_API_KEY','X_BEARER_TOKEN','COINGECKO_API_KEY'].indexOf(k)<0)",'CLEAR_SECRET');
replaceOnce("if(req.method==='POST'&&p==='/api/settings/test-gmx')",
"if(req.method==='POST'&&p==='/api/settings/test-coingecko')return marketDataInternal('/internal/coingecko/test',function(e,o){if(e)return json(res,502,{ok:false,error:e.message});json(res,200,o);});\n if(req.method==='POST'&&p==='/api/settings/test-gmx')",'TEST_ROUTE');
module._compile(src,base);
