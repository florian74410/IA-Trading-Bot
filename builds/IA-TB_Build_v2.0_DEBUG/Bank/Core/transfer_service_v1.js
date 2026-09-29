'use strict';
var http=require('http'),https=require('https'),URL=require('url').URL;
var NETWORKS={
 ethereum:{id:'ethereum',chainId:1,native:'ETH',rpcEnv:'IATB_RPC_ETHEREUM',usdc:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',usdcDecimals:6},
 arbitrum:{id:'arbitrum',chainId:42161,native:'ETH',rpcEnv:'IATB_RPC_ARBITRUM',usdc:'0xaf88d065e77c8cc2239327c5edb3a432268e5831',usdcDecimals:6},
 polygon:{id:'polygon',chainId:137,native:'POL',rpcEnv:'IATB_RPC_POLYGON',usdc:'0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',usdcDecimals:6},
 bnb:{id:'bnb',chainId:56,native:'BNB',rpcEnv:'IATB_RPC_BNB',usdc:'0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',usdcDecimals:18},
 base:{id:'base',chainId:8453,native:'ETH',rpcEnv:'IATB_RPC_BASE',usdc:'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',usdcDecimals:6}
};
function validEvm(a){return /^0x[a-fA-F0-9]{40}$/.test(String(a||''))}
function bi(v){try{return BigInt(String(v||'0'))}catch(e){return 0n}}
function units(v,d){v=String(v||'').trim();if(!/^\d+(?:\.\d+)?$/.test(v))throw new Error('AMOUNT_INVALID');var p=v.split('.'),a=p[0]||'0',b=(p[1]||'').slice(0,d);while(b.length<d)b+='0';return BigInt(a+b)}
function dec(v,d,n){v=bi(v);var s=v.toString().padStart(d+1,'0'),a=s.slice(0,-d)||'0',b=s.slice(-d).slice(0,n==null?6:n).replace(/0+$/,'');return a+(b?'.'+b:'')}
function req(endpoint,method,params,cb){
 if(!endpoint)return cb(new Error('RPC_NOT_CONFIGURED'));var u;try{u=new URL(endpoint)}catch(e){return cb(new Error('RPC_URL_INVALID'))}
 var payload=Buffer.from(JSON.stringify({jsonrpc:'2.0',id:1,method:method,params:params||[]})),lib=u.protocol==='https:'?https:http;
 var r=lib.request({protocol:u.protocol,hostname:u.hostname,port:u.port||undefined,path:(u.pathname||'/')+(u.search||''),method:'POST',timeout:10000,headers:{'Content-Type':'application/json','Content-Length':payload.length}},function(res){var a=[];res.on('data',function(c){a.push(c)});res.on('end',function(){var o;try{o=JSON.parse(Buffer.concat(a).toString('utf8'))}catch(e){return cb(new Error('RPC_JSON_INVALID'))}if(o.error)return cb(new Error('RPC_ERROR:'+String(o.error.message||o.error.code)));cb(null,o.result)});});
 r.on('timeout',function(){r.destroy(new Error('RPC_TIMEOUT'))});r.on('error',cb);r.end(payload);
}
function accountFor(w,n){return (w&&w.accounts||[]).filter(function(a){return (a.networks||[]).indexOf(n)>=0})[0]||null}
function TransferService(opts){opts=opts||{};this.walletService=opts.walletService;this.getRpc=opts.getRpc||function(){return''};this.log=opts.log||function(){};}
TransferService.prototype._rpc=function(n){var x=NETWORKS[n];return x?String(this.getRpc(n)||process.env[x.rpcEnv]||'').trim():''};
TransferService.prototype.context=function(sess,input){
 input=input||{};var n=String(input.network||'').toLowerCase(),net=NETWORKS[n];if(!net)throw new Error('TRANSFER_NETWORK_NOT_SUPPORTED');
 if(String(input.destinationNetwork||n).toLowerCase()!==n)throw new Error('TRANSFER_NETWORK_MISMATCH');
 var ws=this.walletService.list(sess,false),src=ws.filter(function(w){return String(w.id)===String(input.sourceWalletId||'')})[0],dst=ws.filter(function(w){return String(w.id)===String(input.destWalletId||'')})[0];
 if(!src)throw new Error('SOURCE_WALLET_NOT_FOUND');if(!dst)throw new Error('DESTINATION_WALLET_NOT_FOUND');
 var sa=accountFor(src,n),da=accountFor(dst,n);if(!sa||!validEvm(sa.address))throw new Error('SOURCE_ADDRESS_INVALID');if(!da||!validEvm(da.address))throw new Error('DESTINATION_ADDRESS_INVALID');
 if(String(sa.address).toLowerCase()===String(da.address).toLowerCase())throw new Error('SOURCE_DESTINATION_SAME_ADDRESS');
 var symbol=String(input.symbol||net.native).toUpperCase(),token=(symbol==='USDC'?{address:net.usdc,decimals:net.usdcDecimals}:null),decimals=token?token.decimals:18,raw=units(input.amount,decimals);if(raw<=0n)throw new Error('AMOUNT_INVALID');
 return{network:n,net:net,sourceWallet:src,destWallet:dst,sourceAccount:sa,destAccount:da,sourceAddress:sa.address,destinationAddress:da.address,symbol:symbol,token:token,decimals:decimals,amount:String(input.amount),amountRaw:raw};
};
TransferService.prototype.preflight=function(sess,input,cb){
 var self=this,ctx;try{ctx=this.context(sess,input)}catch(e){return cb(e)}var rpcUrl=this._rpc(ctx.network);if(!rpcUrl)return cb(new Error('RPC_NOT_CONFIGURED'));
 req(rpcUrl,'eth_getBalance',[ctx.sourceAddress,'latest'],function(e,nativeHex){if(e)return cb(e);var native=bi(nativeHex);
  function finish(asset){
   var data=ctx.token?'0xa9059cbb'+ctx.destinationAddress.toLowerCase().replace(/^0x/,'').padStart(64,'0')+ctx.amountRaw.toString(16).padStart(64,'0'):'0x',
       tx={from:ctx.sourceAddress,to:ctx.token?ctx.token.address:ctx.destinationAddress,data:data,value:ctx.token?'0x0':'0x'+ctx.amountRaw.toString(16)};
   req(rpcUrl,'eth_estimateGas',[tx],function(ge,gasHex){if(ge)return cb(ge);req(rpcUrl,'eth_gasPrice',[],function(pe,priceHex){if(pe)return cb(pe);
    var gas=bi(gasHex),gasPrice=bi(priceHex),gasCost=gas*gasPrice,assetEnough=asset>=ctx.amountRaw,nativeEnough=ctx.token?native>=gasCost:native>=ctx.amountRaw+gasCost;
    cb(null,{ok:true,stage:'READY_FOR_SIGNATURE',network:ctx.network,chainId:ctx.net.chainId,nativeSymbol:ctx.net.native,symbol:ctx.symbol,sourceWalletId:ctx.sourceWallet.id,destWalletId:ctx.destWallet.id,sourceAddress:ctx.sourceAddress,destinationAddress:ctx.destinationAddress,amount:ctx.amount,balances:{asset:dec(asset,ctx.decimals,8),native:dec(native,18,8)},gas:{limit:gas.toString(),gasPrice:gasPrice.toString(),costRaw:gasCost.toString(),costNative:dec(gasCost,18,8),symbol:ctx.net.native},checks:{sameNetwork:true,addressValid:true,assetEnough:assetEnough,gasEnough:nativeEnough},ready:assetEnough&&nativeEnough,transaction:tx});
   })});
  }
  if(!ctx.token)return finish(native);
  var call='0x70a08231'+ctx.sourceAddress.toLowerCase().replace(/^0x/,'').padStart(64,'0');
  req(rpcUrl,'eth_call',[{to:ctx.token.address,data:call},'latest'],function(te,tok){if(te)return cb(te);finish(bi(tok))});
 });
};
TransferService.prototype.execute=function(sess,input,cb){
 input=input||{};var self=this,password=String(input.password||'');if(input.confirmed!==true)return cb(new Error('TRANSFER_CONFIRMATION_REQUIRED'));
 this.preflight(sess,input,function(e,p){if(e)return cb(e);if(!p.ready)return cb(new Error(!p.checks.assetEnough?'INSUFFICIENT_ASSET_BALANCE':'INSUFFICIENT_GAS_BALANCE'));
  var ctx;try{ctx=self.context(sess,input);var client=self.walletService.clientService.resolveSession(sess),auth=self.walletService.clientService.accountByClientId(client.clientId);if(auth&&!self.walletService.clientService.verifyPassword(client.clientId,password))throw new Error('WALLET_PASSWORD_INVALID');var ethers=require('ethers'),secret=self.walletService.reveal(sess,ctx.sourceWallet.id,ctx.sourceAccount.id),pk=String(secret.privateKey||''),rpcUrl=self._rpc(ctx.network),provider=new ethers.providers.JsonRpcProvider(rpcUrl,ctx.net.chainId),wallet=new ethers.Wallet(pk,provider);pk='';password='';if(wallet.address.toLowerCase()!==ctx.sourceAddress.toLowerCase())throw new Error('SIGNER_ADDRESS_MISMATCH');
   var tx={to:p.transaction.to,data:p.transaction.data||'0x',value:ethers.BigNumber.from(String(ctx.token?'0':ctx.amountRaw)),gasLimit:ethers.BigNumber.from(p.gas.limit),gasPrice:ethers.BigNumber.from(p.gas.gasPrice)};
   wallet.sendTransaction(tx).then(function(t){self.log('TRANSFER','Transaction submitted',t.hash+' '+ctx.sourceAddress+' -> '+ctx.destinationAddress);return t.wait(1).then(function(){return t})}).then(function(t){secret=null;wallet=null;provider=null;cb(null,{ok:true,stage:'CONFIRMED',timestamp:Date.now(),txHash:t.hash,network:ctx.network,symbol:ctx.symbol,amount:ctx.amount,sourceAddress:ctx.sourceAddress,destinationAddress:ctx.destinationAddress,gas:p.gas,sourceWalletId:ctx.sourceWallet.id,destWalletId:ctx.destWallet.id})}).catch(function(x){secret=null;wallet=null;provider=null;cb(x)});
  }catch(x){password='';return cb(x)}
 });
};
module.exports=TransferService;