'use strict';
function configuration(env=process.env){
 const c=require('./config.json');const raw=env.IATB_TRADING_LIVE;
 if(raw!==undefined&&!['true','false','1','0'].includes(raw))throw Error('TRADING_LIVE_CONFIG_INVALID');
 return {...c,live:raw===undefined?c.live:raw==='true'||raw==='1'};
}
module.exports={configuration};
