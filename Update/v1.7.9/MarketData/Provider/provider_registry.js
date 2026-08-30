'use strict';
var Reference=require('./reference_provider');
var Hyperliquid=require('./hyperliquid_provider');
var CoinGecko=require('./coingecko_provider');
var Blockchain=require('./blockchain_provider');
var DefiLlama=require('./defillama_provider');
var GMX=require('./gmx_provider');
var CapabilityCatalog=require('./capability_catalog');
function Registry(options){options=options||{};this.reference=new Reference({krakenPort:+options.krakenPort||8011});this.hyperliquid=new Hyperliquid(options.hyperliquid||{});this.coingecko=new CoinGecko(options.coingecko||{});this.blockchain=new Blockchain(options.blockchain||{});this.defillama=new DefiLlama(options.defillama||{});this.gmx=new GMX(options.gmx||{});this.providers={REFERENCE:this.reference,KRAKEN:this.reference,KRAKEN_PUBLIC_REFERENCE:this.reference,GMX:this.gmx,HYPERLIQUID:this.hyperliquid,COINGECKO:this.coingecko,BLOCKCHAIN:this.blockchain,BLOCKCHAIN_COM:this.blockchain,DEFILLAMA:this.defillama};}
Registry.prototype.get=function(name){var k=String(name||'REFERENCE').toUpperCase();return this.providers[k]||null;};
Registry.prototype.setCoinGeckoApiKey=function(key){return this.coingecko.setApiKey(key);};
Registry.prototype.clearCoinGeckoApiKey=function(){return this.coingecko.clearApiKey();};
Registry.prototype.capabilities=function(name){return name?CapabilityCatalog.forProvider(name):CapabilityCatalog.all();};
Registry.prototype.executeCommand=function(provider,command,args,cb){var p=this.get(provider);if(!p)return cb(new Error('MARKET_PROVIDER_UNKNOWN:'+provider));if(typeof p.executeCommand!=='function')return cb(new Error('MARKET_PROVIDER_COMMANDS_NOT_IMPLEMENTED:'+provider));p.executeCommand(command,args||{},cb);};
Registry.prototype.list=function(){return[
 {id:'KRAKEN',name:this.reference.name,type:'API',default:true,candleCapable:true,priceCapable:true,collectorSource:true,status:this.reference.status(),capabilities:CapabilityCatalog.forProvider('KRAKEN')},
 {id:'GMX',name:this.gmx.name,type:'API',default:false,candleCapable:true,priceCapable:true,collectorSource:true,status:this.gmx.status(),capabilities:CapabilityCatalog.forProvider('GMX')},
 {id:'HYPERLIQUID',name:this.hyperliquid.name,type:'SOCKET',default:false,candleCapable:true,status:this.hyperliquid.status(),capabilities:CapabilityCatalog.forProvider('HYPERLIQUID')},
 {id:'COINGECKO',name:this.coingecko.name,type:'API',default:false,complementary:true,candleCapable:true,status:this.coingecko.status(),capabilities:CapabilityCatalog.forProvider('COINGECKO')},
 {id:'BLOCKCHAIN',name:this.blockchain.name,type:'SOCKET',apiFamily:'BLOCKCHAIN_EXCHANGE_API',default:false,complementary:true,candleCapable:true,status:this.blockchain.status(),capabilities:CapabilityCatalog.forProvider('BLOCKCHAIN')},
 {id:'DEFILLAMA',name:this.defillama.name,type:'API',apiFamily:'DEFILLAMA_PUBLIC_API',default:false,complementary:true,candleCapable:false,status:this.defillama.status(),capabilities:CapabilityCatalog.forProvider('DEFILLAMA')}
 ];};
Registry.prototype.close=function(){try{this.hyperliquid.close();}catch(_){}try{this.blockchain.close();}catch(_){}};
module.exports=Registry;
