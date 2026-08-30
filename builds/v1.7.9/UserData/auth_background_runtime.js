'use strict';
var fs=require('fs'),path=require('path');
var installed=false;
function norm(p){try{return path.resolve(String(p));}catch(e){return'';}}
function install(ctx){
 if(installed)return ctx;
 installed=true;
 var root=path.resolve(ctx.root),target=path.join(root,'Frontend','Pages','app_v1.0.html'),asset=path.join(root,'Frontend','Assets','IA-TB_Auth_v1.7.9.jpg'),previous=fs.readFileSync;
 fs.readFileSync=function(p,options){
  var out=previous.apply(fs,arguments);
  if(norm(p)!==target)return out;
  var enc=typeof options==='string'?options:(options&&options.encoding)||null;
  var text=Buffer.isBuffer(out)?out.toString('utf8'):String(out);
  if(text.indexOf('data-iatb-auth-bg-v179')<0){
   var data='';
   try{var img=previous.call(fs,asset);data=(Buffer.isBuffer(img)?img:Buffer.from(img)).toString('base64');}catch(e){}
   var image=data?'url("data:image/jpeg;base64,'+data+'")':'none';
   var css='<style data-iatb-auth-bg-v179>\n'+
    '.auth{position:relative!important;min-height:100vh!important;width:100%!important;overflow:hidden!important;background-color:#05080c!important;background-image:'+image+'!important;background-position:center center!important;background-size:cover!important;background-repeat:no-repeat!important;background-attachment:fixed!important;justify-content:flex-end!important;padding:34px 7vw!important;}\n'+
    '.auth:before{display:none!important;content:none!important;background:none!important;}\n'+
    '.auth:after{content:""!important;display:block!important;position:absolute!important;inset:0!important;background:linear-gradient(90deg,rgba(5,8,12,.10) 0%,rgba(5,8,12,.18) 42%,rgba(5,8,12,.72) 68%,rgba(5,8,12,.90) 100%)!important;pointer-events:none!important;z-index:1!important;}\n'+
    '.auth .card{position:relative!important;z-index:2!important;}\n'+
    '@media(max-width:900px){.auth{justify-content:center!important;padding:24px!important;background-position:center center!important;background-attachment:scroll!important}.auth:after{background:rgba(5,8,12,.38)!important}}\n'+
    '</style>';
   text=text.replace('</head>',css+'</head>');
  }
  var b=Buffer.from(text,'utf8');
  return enc?b.toString(enc):b;
 };
 ctx.authBackgroundRuntime=true;
 return ctx;
}
module.exports={install:install};
