'use strict';
// P3.2: shared server-only Auth21 Trading IPC key, pre-provisioned and never generated at runtime.
const fs=require('node:fs'),path=require('node:path');
function loadTradingAdminKey({env=process.env}={}){
  const target=env.IATB_AUTH21_TRADING_IPC_KEY_FILE;
  if(typeof target!=='string'||!path.isAbsolute(target))throw Error('TRADING_ADMIN_IPC_KEY_NOT_CONFIGURED');
  const st=fs.lstatSync(target);
  if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077)!==0||st.size!==32||
     (process.getuid&&st.uid!==process.getuid())||fs.realpathSync(target)!==target)
     throw Error('TRADING_ADMIN_IPC_KEY_UNSAFE');
  const key=fs.readFileSync(target);
  if(key.length!==32)throw Error('TRADING_ADMIN_IPC_KEY_UNSAFE');
  return key;
}
module.exports={loadTradingAdminKey};
