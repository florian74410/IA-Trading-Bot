'use strict';
var crypto=require('crypto'),EVM=require('./evm_wallet');
var NETWORKS=[
{id:'bitcoin',name:'Bitcoin',family:'BITCOIN',symbol:'BTC',chainId:null},
{id:'ethereum',name:'Ethereum',family:'EVM',symbol:'ETH',chainId:1},
{id:'arbitrum',name:'Arbitrum',family:'EVM',symbol:'ETH',chainId:42161},
{id:'polygon',name:'Polygon',family:'EVM',symbol:'POL',chainId:137},
{id:'bnb',name:'BNB Chain',family:'EVM',symbol:'BNB',chainId:56},
{id:'base',name:'Base',family:'EVM',symbol:'ETH',chainId:8453},
{id:'solana',name:'Solana',family:'SOLANA',symbol:'SOL',chainId:null}
];
var B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(buf){var x=BigInt('0x'+(buf.toString('hex')||'0')),s='';while(x>0n){var r=Number(x%58n);x=x/58n;s=B58[r]+s;}for(var i=0;i<buf.length&&buf[i]===0;i++)s='1'+s;return s||'1';}
function sha(b){return crypto.createHash('sha256').update(b).digest();}
function btc(){var e=crypto.createECDH('secp256k1');e.generateKeys();var priv=e.getPrivateKey(),pub=e.getPublicKey(null,'compressed'),h160=crypto.createHash('ripemd160').update(sha(pub)).digest(),payload=Buffer.concat([Buffer.from([0]),h160]),address=b58(Buffer.concat([payload,sha(sha(payload)).slice(0,4)])),wp=Buffer.concat([Buffer.from([128]),priv,Buffer.from([1])]),wif=b58(Buffer.concat([wp,sha(sha(wp)).slice(0,4)]));return{family:'BITCOIN',address:address,publicKey:pub.toString('hex'),privateKey:priv.toString('hex'),recovery:wif,recoveryFormat:'WIF_COMPRESSED'};}
function sol(){var seed=crypto.randomBytes(32),pkcs8=Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed]),priv=crypto.createPrivateKey({key:pkcs8,format:'der',type:'pkcs8'}),pubObj=crypto.createPublicKey(priv),spki=pubObj.export({format:'der',type:'spki'}),pub=spki.slice(-32);return{family:'SOLANA',address:b58(pub),publicKey:b58(pub),privateKey:seed.toString('hex'),recovery:b58(Buffer.concat([seed,pub])),recoveryFormat:'SOLANA_KEYPAIR_BASE58'};}
function generateBundle(){var evm=EVM.generate(),b=btc(),s=sol();return{accounts:[{id:'evm',family:'EVM',address:evm.address,publicKey:evm.publicKey,privateKey:evm.privateKey,recovery:evm.privateKey,recoveryFormat:'HEX_PRIVATE_KEY',networks:NETWORKS.filter(function(n){return n.family==='EVM'}).map(function(n){return n.id})},{id:'bitcoin',family:'BITCOIN',address:b.address,publicKey:b.publicKey,privateKey:b.privateKey,recovery:b.recovery,recoveryFormat:b.recoveryFormat,networks:['bitcoin']},{id:'solana',family:'SOLANA',address:s.address,publicKey:s.publicKey,privateKey:s.privateKey,recovery:s.recovery,recoveryFormat:s.recoveryFormat,networks:['solana']}]};}
function publicNetworks(){return NETWORKS.map(function(n){return{id:n.id,name:n.name,family:n.family,symbol:n.symbol,chainId:n.chainId};});}
module.exports={NETWORKS:NETWORKS,generateBundle:generateBundle,publicNetworks:publicNetworks};