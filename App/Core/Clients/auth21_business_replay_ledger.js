'use strict';
/* Durable, bounded, fail-closed replay ledger for Auth21 isolated Engine actions.
 * The signed capability is verified BEFORE its jti is consulted. Each jti is
 * consumed via atomic O_EXCL, surviving a process restart on the SAME root.
 * No network, wallets, live trading, or non-sandbox writes.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
function openLedger({root,engine,now=Date.now}={}){
 if(typeof root!=='string'||!path.isAbsolute(root)||
   !/^(indicators|marketdata|fundamental|portfolio|strategy)$/.test(String(engine)))
   throw Error('AUTH21_REPLAY_LEDGER_CONFIG');
 const dir=path.join(root,'runtime','auth21-business','replay-'+engine);
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const st=fs.lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o077)!==0)
   throw Error('AUTH21_REPLAY_LEDGER_DIRECTORY_UNSAFE');
 function consume(proof){
  if(typeof proof!=='string'||proof.length>1024) return false;
  let payload;
  try{
   const parts=proof.split('.');
   if(parts.length!==2)return false;
   payload=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  }catch(_){return false;}
  if(typeof payload.jti!=='string'||!/^[A-Za-z0-9_-]{22}$/.test(payload.jti)||
    !Number.isSafeInteger(payload.exp)||payload.exp<=now())return false;
  const name=crypto.createHash('sha256').update(payload.jti).digest('hex');
  const filename=path.join(dir,name);
  // Ledger entries are intentionally retained for the life of an isolated
  // trial. This is bounded by count to avoid unlimited disk growth.
  const entries=fs.readdirSync(dir);
  if(entries.length>=4096)return false;
  let fd;
  try{
   fd=fs.openSync(filename,'wx',0o600);
   fs.writeSync(fd,String(payload.exp)+'\n');
   fs.fsyncSync(fd);
   return true;
  }catch(error){
   if(error&&error.code==='EEXIST')return false;
   throw error;
  }finally{if(fd!==undefined)fs.closeSync(fd);}
 }
 return {consume,directory:dir};
}
module.exports={openLedger};
