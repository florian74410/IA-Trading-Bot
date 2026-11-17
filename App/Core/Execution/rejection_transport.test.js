'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const Router=require('../Communication/communication_router_v1'),CP=require('../Communication/communication_protocol_v1');
test('Router preserves only validated, bounded manual-order rejection details; malformed or mismatched replies stay ambiguous',async t=>{
 const root=path.resolve(__dirname,'../..'),router=new Router(root);let fault='valid';
 const server=http.createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;const message=JSON.parse(raw),out=CP.makeResponse(message,'PROTECTION',{ok:false,status:'REJECTED',error:'vendor echoed FAKE_SECRET',raw_status:'FAKE_SECRET',diagnostics:{code:'1',s_code:'51008'},headers:{authorization:'FAKE_SECRET'}},{engine:'trading',schema:'trading.response/2.0'});if(fault==='hash')out.data_hash='bad';if(fault==='request')out.request_id='other-request';res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify(out));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));router.registry.trading={...router.registry.trading,host:'127.0.0.1',port:server.address().port,capabilities:['trading.execute','trading.health']};
 const run=action=>new Promise(resolve=>router.route(CP.makeRequest('trading',action,action==='trading.execute'?{exchange:'OKX',symbol:'BTC-USDT',side:'BUY',quantity:1,risk_approval_id:'fixture'}:{}),error=>resolve(error)));
 const good=await run('trading.execute');assert.equal(good.execution_result.status,'REJECTED');assert.equal(good.execution_result.diagnostics.s_code,'51008');assert(!JSON.stringify(good.execution_result).includes('FAKE_SECRET'));
 fault='hash';assert.equal((await run('trading.execute')).execution_result,undefined);fault='request';assert.equal((await run('trading.execute')).execution_result,undefined);fault='valid';assert.equal((await run('trading.health')).execution_result,undefined);
});
