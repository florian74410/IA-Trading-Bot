'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {TradingLogsV2}=require('../trading_logs_v2');
const {formatExecutionLog}=require('../trading_logs_formatter_v2');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iatb-trading-logs-v2-'));
try {
 const legacy=path.join(dir,'history.jsonl'),sqlite=path.join(dir,'trading_logs.db');
 const logs=new TradingLogsV2(dir,{file:legacy,dbFile:sqlite});
 const event={event_id:'execution-1',timestamp:1730000000000,event_type:'ORDER_ACCEPTED',exchange:'BINANCE',symbol:'BTC/USDT',request_id:'req-1',ok:true,metadata:{token:'private-token'}};
 logs.append(event);
 assert.equal(logs.list({}).length,1,'legacy JSONL read stays intact');
 assert.equal(logs.listSqlite({}).length,1,'SQLite has normalized event');
 assert.equal(logs.listSqlite({})[0].metadata.token,'[REDACTED]');
 assert.equal(formatExecutionLog(logs.listSqlite({})[0]).title,'Ordre accepté');
 assert.equal(fs.readFileSync(legacy,'utf8').trim().split('\n').length,1);
 assert.equal(logs.db.pragma('journal_mode',{simple:true}),'wal');
 logs.close();
 const again=new TradingLogsV2(dir,{file:legacy,dbFile:sqlite});
 assert.equal(again.listSqlite({exchange:'BINANCE'}).length,1,'SQLite survives restart');
 again.close();
 console.log('PASS Trading Logs V2 JSONL + SQLite WAL + formatter');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
