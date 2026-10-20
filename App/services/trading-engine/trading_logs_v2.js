'use strict';
// IA-TB v2.3: dual-write JSONL (legacy) + SQLite WAL (new).
// JSONL remains the authoritative compatibility read path during migration.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const LegacyHistory = require('./history-store');

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (/^(api[_-]?key|api[_-]?secret|secret|token|password|authorization|private[_-]?key|signature|cookie)$/i.test(k)) {
      out[k] = '[REDACTED]';
    } else out[k] = redact(v);
  }
  return out;
}
class TradingLogsV2 {
  constructor(root, options = {}) {
    this.legacy = new LegacyHistory(root, options);
    this.file = this.legacy.file;
    this.dbFile = path.resolve(options.dbFile || process.env.IATB_TRADING_LOGS_DB || path.join(path.dirname(this.file), 'trading_logs.db'));
    fs.mkdirSync(path.dirname(this.dbFile), { recursive: true });
    this.db = new Database(this.dbFile);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.exec(`CREATE TABLE IF NOT EXISTS execution_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      timestamp INTEGER NOT NULL,
      event_type TEXT,
      exchange TEXT,
      symbol TEXT,
      request_id TEXT,
      risk_approval_id TEXT,
      client_order_id TEXT,
      exchange_order_id TEXT,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_execution_logs_time ON execution_logs(timestamp);
    CREATE INDEX IF NOT EXISTS ix_execution_logs_request ON execution_logs(request_id);
    CREATE INDEX IF NOT EXISTS ix_execution_logs_exchange_order ON execution_logs(exchange,exchange_order_id);`);
    this.insert = this.db.prepare(`INSERT OR IGNORE INTO execution_logs
      (event_id,timestamp,event_type,exchange,symbol,request_id,risk_approval_id,client_order_id,exchange_order_id,payload_json,created_at)
      VALUES (@event_id,@timestamp,@event_type,@exchange,@symbol,@request_id,@risk_approval_id,@client_order_id,@exchange_order_id,@payload_json,@created_at)`);
  }
  append(event) {
    // Preserve the legacy contract. If JSONL write fails, do not create an unmatched DB row.
    this.legacy.append(event);
    const safe = redact(event);
    const eventId = String(safe.event_id || safe.execution_id || safe.request_id || ('legacy-' + Date.now() + '-' + require('crypto').randomBytes(8).toString('hex')));
    this.insert.run({
      event_id: eventId,
      timestamp: Number(safe.timestamp) || Date.now(),
      event_type: safe.event_type || null,
      exchange: safe.exchange || null,
      symbol: safe.symbol || null,
      request_id: safe.request_id || null,
      risk_approval_id: safe.risk_approval_id || null,
      client_order_id: safe.client_order_id || null,
      exchange_order_id: safe.exchange_order_id || null,
      payload_json: JSON.stringify(safe),
      created_at: Date.now()
    });
  }
  // Until all consumers have migrated, preserve JSONL reads unchanged.
  list(options) { return this.legacy.list(options); }
  listSqlite({limit=200,since=0,exchange,symbol}={}) {
    const count = Math.min(2000,Math.max(1,Number(limit)||200));
    let sql='SELECT payload_json FROM execution_logs WHERE timestamp >= ?';
    const args=[Number(since)||0];
    if(exchange){ sql+=' AND exchange = ?'; args.push(String(exchange).toUpperCase()); }
    if(symbol){ sql+=' AND symbol = ?'; args.push(String(symbol).toUpperCase()); }
    sql+=' ORDER BY timestamp DESC, log_id DESC LIMIT ?'; args.push(count);
    return this.db.prepare(sql).all(...args).reverse().map(r=>JSON.parse(r.payload_json));
  }
  close(){ this.db.close(); }
}
module.exports={TradingLogsV2,redact};
