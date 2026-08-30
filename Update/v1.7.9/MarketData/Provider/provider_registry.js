'use strict';
var Reference=require('./reference_provider');
var Hyperliquid=require('./hyperliquid_provider');
var CoinGecko=require('./coingecko_provider');
var Blockchain=require('./blockchain_provider');
function Registry(options){options=options||{};this.reference=new Reference({krakenPort:+options.krakenPort||8011});this.hyperliquid=new Hyperliquid(options.hyperliquid||{});this.coingecko=new CoinGecko(options.coingecko||{});this.blockchain=new Blockchain(options.blockchain||{});this.providers={REFERENCE:this.reference,KRAKEN:this.reference,KRAKEN_PUBLIC_REFERENCE:this.reference,HYPERLIQUID:this.hyperliquid,COINGECKO:this.coingecko,BLOCKCHAIN:this.blockchain,BLOCKCHAIN_COM:this.blockchain};}
Registry.prototype.get=function(name){var k=String(name||'REFERENCE').toUpperCase();return this.providers[k]||null;};
Registry.prototype.setCoinGeckoApiKey=function(key){return this.coingecko.setApiKey(key);};
Registry.prototype.clearCoinGeckoApiKey=function(){return this.coingecko.clearApiKey();};
Registry.prototype.list=function(){return[{id:'REFERENCE',name:this.reference.name,type:'API',default:true,status:{connected:true}},{id:'HYPERLIQUID',name:this.hyperliquid.name,type:'SOCKET',default:false,status:this.hyperliquid.status()},{id:'COINGECKO',name:this.coingecko.name,type:'API',default:false,complementary:true,status:this.coingecko.status()},{id:'BLOCKCHAIN',name:this.blockchain.name,type:'SOCKET',apiFamily:'BLOCKCHAIN_EXCHANGE_API',default:false,complementary:true,status:this.blockchain.status()}];};
Registry.prototype.close=function(){try{this.hyperliquid.close();}catch(_){}try{this.blockchain.close();}catch(_){}};
module.exports=Registry;
