'use strict';

const http = require('http');

class DataCollectorFirewallClient {
  constructor(options){
    const o=options||{};
    this.host=o.host||'127.0.0.1';
    this.port=Number(o.port||8018);
    this.internalKey=String(o.internalKey||'');
    this.timeoutMs=Number(o.timeoutMs||2500);
  }

  _request(method,path,body,cb){
    const payload=body==null?null:JSON.stringify(body);
    const headers={'accept':'application/json'};
    if (payload) { headers['content-type']='application/json'; headers['content-length']=Buffer.byteLength(payload); }
    if (this.internalKey) headers['x-ia-tb-internal-key']=this.internalKey;
    const req=http.request({host:this.host,port:this.port,path:path,method:method,headers:headers,timeout:this.timeoutMs},res=>{
      let raw='';
      res.on('data',c=>raw+=c);
      res.on('end',()=>{
        let json=null; try{ json=raw?JSON.parse(raw):{}; }catch(e){ return cb(new Error('DATA_FIREWALL_INVALID_RESPONSE')); }
        if (res.statusCode>=400) { const err=new Error((json&&json.error)||'DATA_FIREWALL_REJECTED'); err.statusCode=res.statusCode; err.result=json; return cb(err); }
        cb(null,json);
      });
    });
    req.on('timeout',()=>req.destroy(new Error('DATA_FIREWALL_TIMEOUT')));
    req.on('error',cb);
    if (payload) req.write(payload);
    req.end();
  }

  health(cb){ this._request('GET','/health',null,cb); }
  status(cb){ this._request('GET','/status',null,cb); }
  configure(settings,cb){ this._request('POST','/configure',settings||{},cb); }
  inspect(message,cb){ this._request('POST','/inspect',{message:message},cb); }
}

module.exports = DataCollectorFirewallClient;
