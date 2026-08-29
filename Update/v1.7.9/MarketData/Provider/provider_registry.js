'use strict';
var Reference=require('./reference_provider');
var Hyperliquid=require('./hyperliquid_provider');
var CoinGecko=require('./coingecko_provider');
function Registry(options){options=options||{};this.reference=new Reference({krakenPort:+options.krakenPort||8011});this.hyperliquid=new Hyperliquid(options.hyperliquid||{});this.coingecko=new CoinGecko(options.coingecko||{});this.providers={REFERENCE:this.reference,KRAKEN:this.reference,KRAKEN_PUBLIC_REFERENCE:this.reference,HYPERLIQUID:this.hyperliquid,COINGECKO:this.coingecko};}
Registry.prototype.get=function(name){var k=String(name||'REFERENCE').toUpperCase();return this.providers[k]||null;};
Registry.prototype.list=function(){return[{id:'REFERENCE',name:this.reference.name,type:'API',default:true,status:{connected:true}},{id:'HYPERLIQUID',name:this.hyperliquid.name,type:'SOCKET',default:false,status:this.hyperliquid.status()},{id:'COINGECKO',name:this.coingecko.name,type:'API',default:false,complementary:true,status:this.coingecko.status()}];};
Registry.prototype.close=function(){try{this.hyperliquid.close();}catch(_){}};
module.exports=Registry;
