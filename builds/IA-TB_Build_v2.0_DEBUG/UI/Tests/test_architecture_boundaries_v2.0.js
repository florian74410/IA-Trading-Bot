'use strict';
var fs=require('fs'),path=require('path'),assert=require('assert');
var ROOT=path.resolve(__dirname,'../..');
function walk(dir,out){out=out||[];fs.readdirSync(dir).forEach(function(n){var p=path.join(dir,n),s=fs.statSync(p);if(s.isDirectory())walk(p,out);else if(/\.(js|html)$/.test(n))out.push(p);});return out;}
var files=walk(path.join(ROOT,'Frontend')),forbidden=['/indicator-api','/portfolio-api','/liquidity-data','/fundamental-api','/firewall-events','/kraken-api','/api/gmx/','/api/market/symbols','/api/klines','/api/market/klines','/api/crypto/catalog','/api/crypto/resolve','/api/wallet-asset-price','/api/wallet-prices','/api/strategies'];
files.forEach(function(p){var c=fs.readFileSync(p,'utf8');forbidden.forEach(function(x){assert(c.indexOf(x)<0,path.relative(ROOT,p)+' still references legacy boundary '+x);});});
var router=fs.readFileSync(path.join(ROOT,'Core/Router/router.js'),'utf8');
assert(router.indexOf('/communication/v1/ui/read')>=0,'UI read CP/1 channel missing');
assert(router.indexOf('/communication/v1/ui/write')>=0,'UI write CP/1 channel missing');
console.log('[ARCH-BOUNDARIES] OK v2.0');
