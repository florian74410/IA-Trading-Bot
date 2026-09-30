'use strict';
var http=require('http'),https=require('https'),URL=require('url').URL;
function err(code,status,contentType){var e=new Error(code);if(status)e.statusCode=status;if(contentType)e.contentType=contentType;return e;}
function request(url,opts,cb){opts=opts||{};var redirects=+opts._redirects||0,u=new URL(url),lib=u.protocol==='https:'?https:http,done=false;
 var headers=Object.assign({'Accept':'application/json','Accept-Encoding':'identity','User-Agent':'IA-TB-MarketData/2.0'},opts.headers||{});
 var req=lib.request({method:opts.method||'GET',hostname:u.hostname,port:u.port||undefined,path:u.pathname+u.search,headers:headers,timeout:opts.timeout||12000},function(res){
  var status=+res.statusCode||0,location=res.headers&&res.headers.location;
  if(status>=300&&status<400&&location){
   res.resume();done=true;if(redirects>=3)return cb(err('PROVIDER_TOO_MANY_REDIRECTS',status));
   var next;try{next=new URL(location,u).toString();}catch(x){return cb(err('PROVIDER_REDIRECT_INVALID',status));}
   var no=Object.assign({},opts,{_redirects:redirects+1});return request(next,no,cb);
  }
  var a=[],n=0,max=opts.maxBytes||8*1024*1024;
  res.on('data',function(c){n+=c.length;if(n<=max)a.push(c);});
  res.on('end',function(){if(done)return;done=true;if(n>max)return cb(err('PROVIDER_RESPONSE_TOO_LARGE',status));
   var txt=Buffer.concat(a).toString('utf8'),o=null,ct=String(res.headers&&res.headers['content-type']||'').toLowerCase(),jsonError=null;
   try{o=JSON.parse(txt||'{}');}catch(x){jsonError=x;}
   if(status>=400){var msg=o&&(o.error||o.message);var e=err(msg?String(msg):('PROVIDER_HTTP_'+status),status,ct);return cb(e);}
   if(jsonError){return cb(err(/^application\/json\b/.test(ct)||/\+json\b/.test(ct)?'PROVIDER_JSON_INVALID':'PROVIDER_NON_JSON_RESPONSE',status,ct));}
   cb(null,o,res);
  });
 });
 req.on('timeout',function(){req.destroy(err('PROVIDER_TIMEOUT'));});
 req.on('error',function(e){if(done)return;done=true;cb(e);});
 if(opts.body)req.write(opts.body);req.end();
}
module.exports=request;
