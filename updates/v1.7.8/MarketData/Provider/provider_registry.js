'use strict';
var Reference=require('./reference_provider');
var Hyperliquid=require('./hyperliquid_provider');
function Registry(options){options=options||{};this.reference=new Reference({krakenPort:+options.krakenPort||8011});this.hyperliquid=new Hyperliquid(options.hyperliquid||{});this.providers={REFERENCE:this.reference,KRAKEN:this.reference,KRAKEN_PUBLIC_REFERENCE:this.reference,HYPERLIQUID:this.hyperliquid};}
Registry.prototype.get=function(name){var k=String(name||'REFERENCE').toUpperCase();return this.providers[k]||null;};
Registry.prototype.list=function(){return[{id:'REFERENCE',name:this.reference.name,type:'API',default:true,status:{connected:true}},{id:'HYPERLIQUID',name:this.hyperliquid.name,type:'SOCKET',default:false,status:this.hyperliquid.status()}];};
Registry.prototype.close=function(){try{this.hyperliquid.close();}catch(_){};};
module.exports=Registry;
