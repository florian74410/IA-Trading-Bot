'use strict';
var https=require('https'),URL=require('url').URL;

var NETWORKS={
 ethereum:{chainId:1,rpc:'https://cloudflare-eth.com',native:'ETH',usdc:{address:'0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',decimals:6}},
 arbitrum:{chainId:42161,rpc:'https://arb1.arbitrum.io/rpc',native:'ETH',usdc:{address:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',decimals:6}},
 polygon:{chainId:137,rpc:'https://polygon-rpc.com',native:'POL',usdc:{address:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',decimals:6}},
 bnb:{chainId:56,rpc:'https://bsc-dataseed.binance.org',native:'BNB',usdc:{address:'0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',decimals:18}},
 base:{chainId:8453,rpc:'https://mainnet.base.org',native:'ETH',usdc:{address:'0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913',decimals:6}}
};

function reqJson(method,url,headers,body,cb,timeout){
 var u=new URL(url),raw=body?JSON.stringify(body):'',opts={hostname:u.hostname,port:u.port||443,path:u.pathname+u.search,method:method,headers:headers||{},timeout:timeout||12000};
 if(raw){opts.headers['Content-Type']='application/json';opts.headers['Content-Length']=Buffer.byteLength(raw);}
 var r=https.request(opts,function(res){var a=[],n=0;res.on('data',function(c){n+=c.length;if(n<4194304)a.push(c)});res.on('end',function(){var t=Buffer.concat(a).toString('utf8'),o;try{o=JSON.parse(t)}catch(e){o={raw:t}}if(res.statusCode<200||res.statusCode>299){var er=new Error((o&&o.message)||(o&&o.error)||('HTTP '+res.statusCode));er.statusCode=res.statusCode;er.payload=o;return cb(er);}cb(null,o);});});
 r.on('timeout',function(){r.destroy(new Error('TIMEOUT'))});r.on('error',cb);if(raw)r.write(raw);r.end();
}
function rpc(net,method,params,cb){
 reqJson('POST',net.rpc,{}, {jsonrpc:'2.0',id:1,method:method,params:params||[]}, function(e,o){if(e)return cb(e);if(o&&o.error)return cb(new Error(o.error.message||'RPC_ERROR'));cb(null,o&&o.result);},10000);
}
function bi(hex){try{return BigInt(hex||'0')}catch(e){return 0n}}
function rawAmount(v,dec){var s=String(v||'0').trim();if(!/^\d+(?:\.\d+)?$/.test(s))throw new Error('AMOUNT_INVALID');var p=s.split('.'),a=p[0],b=(p[1]||'').slice(0,dec);while(b.length<dec)b+='0';return BigInt(a+b)}
function fmtRaw(v,dec,max){v=BigInt(v||0);var s=v.toString().padStart(dec+1,'0'),a=s.slice(0,-dec)||'0',b=s.slice(-dec).replace(/0+$/,'');if(max&&b.length>max)b=b.slice(0,max);return a+(b?'.'+b:'')}
function padAddr(a){return String(a||'').toLowerCase().replace(/^0x/,'').padStart(64,'0')}
function validEvm(a){return /^0x[0-9a-fA-F]{40}$/.test(String(a||''))}
function sumUsd(a){return (a||[]).reduce(function(z,x){var n=+(x&&x.amountUSD||0);return z+(isFinite(n)?n:0)},0)}
function q(url){return encodeURI(url).replace(/#/g,'%23')}

function Engine(walletService){this.walletService=walletService;this.feePct=0.01;}
Engine.prototype._walletAddress=function(sess,walletId,network){
 var all=this.walletService.list(sess,true),w=all.filter(function(x){return String(x.id)===String(walletId)})[0];if(!w)throw new Error('WALLET_NOT_FOUND');
 var a=(w.accounts||[]).filter(function(x){return (x.networks||[]).indexOf(network)>=0})[0];if(!a)throw new Error('WALLET_NETWORK_ACCOUNT_NOT_FOUND');
 if(!validEvm(a.address))throw new Error('EVM_ADDRESS_INVALID');
 return{wallet:w,account:a,address:a.address};
};
Engine.prototype._balances=function(net,address,token,cb){
 var self=this;rpc(net,'eth_getBalance',[address,'latest'],function(e,native){if(e)return cb(e);
  var data='0x70a08231'+padAddr(address);
  rpc(net,'eth_call',[{to:token.address,data:data},'latest'],function(e2,tok){if(e2)return cb(e2);cb(null,{native:bi(native),token:bi(tok)});});
 });
};
Engine.prototype._quote=function(fromNet,toNet,address,toAddress,amountRaw,order,cb){
 var url='https://li.quest/v1/quote?fromChain='+fromNet.chainId+'&toChain='+toNet.chainId+'&fromToken=USDC&toToken=USDC&fromAddress='+encodeURIComponent(address)+'&toAddress='+encodeURIComponent(toAddress)+'&fromAmount='+amountRaw.toString()+'&slippage=0.003&integrator=iatb&fee='+this.feePct;
 if(order)url+='&order='+order;
 reqJson('GET',q(url),{},null,cb,15000);
};
Engine.prototype.preflight=function(sess,input,cb){
 input=input||{};var fromId=String(input.fromNetwork||'').toLowerCase(),toId=String(input.toNetwork||'').toLowerCase(),fromNet=NETWORKS[fromId],toNet=NETWORKS[toId],self=this;
 if(!fromNet||!toNet)return cb(new Error('EVM_NETWORK_NOT_SUPPORTED'));
 var src,dst,amountRaw;
 try{src=this._walletAddress(sess,input.sourceWallet,fromId);dst=this._walletAddress(sess,input.destWallet||input.sourceWallet,toId);amountRaw=rawAmount(input.amount||'0',fromNet.usdc.decimals);if(amountRaw<=0n)throw new Error('AMOUNT_REQUIRED');}catch(e){return cb(e);}
 this._balances(fromNet,src.address,fromNet.usdc,function(be,bal){if(be)return cb(be);
  var tokenEnough=bal.token>=amountRaw;
  var jobs=[['CHEAPEST'],['FASTEST'],[null]],routes=[],pending=jobs.length,failed=[];
  jobs.forEach(function(j){self._quote(fromNet,toNet,src.address,dst.address,amountRaw,j[0],function(qe,o){
   if(qe)failed.push(qe.message);else if(o&&o.estimate){
    var gasUsd=sumUsd(o.estimate.gasCosts),feeUsd=sumUsd(o.estimate.feeCosts),toDec=o.action&&o.action.toToken&&o.action.toToken.decimals||toNet.usdc.decimals,
        gasRaw=(o.estimate.gasCosts||[]).filter(function(g){return +((g.token&&g.token.chainId)||0)===fromNet.chainId}).reduce(function(z,g){return z+bi(g.amount)},0n),
        r={criterion:j[0]||'BEST_RECEIVED',provider:o.tool||o.toolDetails&&o.toolDetails.name||'LI.FI',routeId:o.id||'',fromAmount:fmtRaw(amountRaw,fromNet.usdc.decimals,6),toAmount:fmtRaw(bi(o.estimate.toAmount),toDec,6),toAmountMin:fmtRaw(bi(o.estimate.toAmountMin),toDec,6),executionDuration:+o.estimate.executionDuration||0,gasUSD:gasUsd,providerFeesUSD:feeUsd,gasRaw:gasRaw.toString(),transactionRequest:o.transactionRequest||null,approvalAddress:o.estimate.approvalAddress||null};
    if(!routes.some(function(x){return x.provider===r.provider&&x.toAmount===r.toAmount&&x.executionDuration===r.executionDuration}))routes.push(r);
   }
   if(--pending===0)finish();
  });});
  function finish(){
   routes.sort(function(a,b){return (+b.toAmount||0)-(+a.toAmount||0)});
   var bestReceived=routes[0]||null,cheapest=routes.slice().sort(function(a,b){return(a.gasUSD+a.providerFeesUSD)-(b.gasUSD+b.providerFeesUSD)})[0]||null,fastest=routes.slice().sort(function(a,b){return(a.executionDuration||1e9)-(b.executionDuration||1e9)})[0]||null,
       chosen=String(input.criterion||'BEST_RECEIVED').toUpperCase()==='FASTEST'?fastest:String(input.criterion||'').toUpperCase()==='CHEAPEST'?cheapest:bestReceived,
       gasNeed=chosen?bi(chosen.gasRaw):0n,nativeEnough=bal.native>=gasNeed,feeAmount=(Number(input.amount||0)*self.feePct);
   cb(null,{ok:true,stage:'READY_FOR_SIGNATURE',source:{walletId:src.wallet.id,address:src.address,network:fromId,nativeSymbol:fromNet.native,token:'USDC',tokenBalance:fmtRaw(bal.token,fromNet.usdc.decimals,6),nativeBalance:fmtRaw(bal.native,18,8)},destination:{walletId:dst.wallet.id,address:dst.address,network:toId,token:'USDC'},amount:String(input.amount||0),iatbFee:{pct:self.feePct,amount:feeAmount.toFixed(6)+' USDC',mode:'LI.FI integrator fee'},checks:{addressValid:true,tokenEnough:tokenEnough,nativeGasEnough:nativeEnough,providerAvailable:!!chosen},routes:{items:routes,bestReceived:bestReceived,cheapest:cheapest,fastest:fastest,selected:chosen},ready:!!(tokenEnough&&nativeEnough&&chosen),errors:failed});
  }
 });
};
module.exports=Engine;