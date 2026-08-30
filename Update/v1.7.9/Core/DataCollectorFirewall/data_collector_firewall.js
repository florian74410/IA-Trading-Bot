'use strict';

const crypto = require('crypto');

function num(v){ return typeof v === 'number' && Number.isFinite(v); }
function nowMs(){ return Date.now(); }
function norm(s){ return String(s || '').trim().toUpperCase(); }
function clone(v){ return v == null ? v : JSON.parse(JSON.stringify(v)); }

class DataCollectorFirewall {
  constructor(options){
    const o = options || {};
    this.enabled = o.enabled !== false;
    this.mode = String(o.mode || 'PROTECTION').toUpperCase() === 'OBSERVATION' ? 'OBSERVATION' : 'PROTECTION';
    this.maxMessageAgeMs = Math.max(1000, Number(o.maxMessageAgeMs || 30000));
    this.maxFutureSkewMs = Math.max(0, Number(o.maxFutureSkewMs || 5000));
    this.maxPayloadBytes = Math.max(1024, Number(o.maxPayloadBytes || 512 * 1024));
    this.duplicateWindowMs = Math.max(0, Number(o.duplicateWindowMs || 5000));
    this.maxPriceJumpPct = Math.max(0, Number(o.maxPriceJumpPct || 20));
    this.maxSpreadPct = Math.max(0, Number(o.maxSpreadPct || 10));
    this.requireProvenance = o.requireProvenance !== false;
    this.providerWhitelist = new Set((o.providerWhitelist || [
      'KRAKEN','KRAKEN_PUBLIC_REFERENCE','GMX','HYPERLIQUID','FX','COINGECKO','DEFILLAMA','BLOCKCHAIN'
    ]).map(norm));
    this.typeWhitelist = new Set((o.typeWhitelist || [
      'PRICE','TICKER','OHLC','OHLCV','CANDLES','TRADES','ORDERBOOK','L2BOOK','MARKET_ANALYTICS','ONCHAIN'
    ]).map(norm));
    this.seen = new Map();
    this.lastPrice = new Map();
    this.stats = {received:0,passed:0,warned:0,rejected:0,duplicates:0,lastDecisionAt:null,lastReason:null};
  }

  configure(patch){
    const p = patch || {};
    if (typeof p.enabled === 'boolean') this.enabled = p.enabled;
    if (p.mode) this.mode = String(p.mode).toUpperCase() === 'OBSERVATION' ? 'OBSERVATION' : 'PROTECTION';
    if (p.maxMessageAgeMs != null) this.maxMessageAgeMs = Math.max(1000, Number(p.maxMessageAgeMs));
    if (p.maxFutureSkewMs != null) this.maxFutureSkewMs = Math.max(0, Number(p.maxFutureSkewMs));
    if (p.maxPayloadBytes != null) this.maxPayloadBytes = Math.max(1024, Number(p.maxPayloadBytes));
    if (p.duplicateWindowMs != null) this.duplicateWindowMs = Math.max(0, Number(p.duplicateWindowMs));
    if (p.maxPriceJumpPct != null) this.maxPriceJumpPct = Math.max(0, Number(p.maxPriceJumpPct));
    if (p.maxSpreadPct != null) this.maxSpreadPct = Math.max(0, Number(p.maxSpreadPct));
    if (typeof p.requireProvenance === 'boolean') this.requireProvenance = p.requireProvenance;
    if (Array.isArray(p.providerWhitelist)) this.providerWhitelist = new Set(p.providerWhitelist.map(norm));
    if (Array.isArray(p.typeWhitelist)) this.typeWhitelist = new Set(p.typeWhitelist.map(norm));
    return this.status();
  }

  status(){
    return {
      enabled:this.enabled, mode:this.mode,
      maxMessageAgeMs:this.maxMessageAgeMs, maxFutureSkewMs:this.maxFutureSkewMs,
      maxPayloadBytes:this.maxPayloadBytes, duplicateWindowMs:this.duplicateWindowMs,
      maxPriceJumpPct:this.maxPriceJumpPct, maxSpreadPct:this.maxSpreadPct,
      requireProvenance:this.requireProvenance,
      providerWhitelist:Array.from(this.providerWhitelist), typeWhitelist:Array.from(this.typeWhitelist),
      stats:clone(this.stats)
    };
  }

  _fingerprint(msg){
    const stable = JSON.stringify({provider:msg.provider,source:msg.source,type:msg.type,symbol:msg.symbol,timeframe:msg.timeframe,timestamp:msg.timestamp,data:msg.data});
    return crypto.createHash('sha256').update(stable).digest('hex');
  }

  _cleanupSeen(t){
    if (!this.duplicateWindowMs) return;
    for (const [k,v] of this.seen.entries()) if (t - v > this.duplicateWindowMs) this.seen.delete(k);
  }

  _extractPrice(msg){
    const d = msg && msg.data;
    if (num(d)) return d;
    if (!d || typeof d !== 'object') return null;
    for (const k of ['price','close','last','markPrice','indexPrice']) if (num(d[k])) return d[k];
    return null;
  }

  _validateCandle(c, issues, path){
    let o,h,l,cl,v;
    if (Array.isArray(c)) { o=+c[1]; h=+c[2]; l=+c[3]; cl=+c[4]; v=c.length>5?+c[5]:null; }
    else if (c && typeof c === 'object') { o=+c.open; h=+c.high; l=+c.low; cl=+c.close; v=c.volume==null?null:+c.volume; }
    else { issues.push({code:'INVALID_CANDLE',path:path}); return; }
    if (![o,h,l,cl].every(Number.isFinite)) { issues.push({code:'INVALID_OHLC_NUMBER',path:path}); return; }
    if (o<=0 || h<=0 || l<=0 || cl<=0) issues.push({code:'NON_POSITIVE_PRICE',path:path});
    if (h < Math.max(o,l,cl) || l > Math.min(o,h,cl)) issues.push({code:'OHLC_INVARIANT',path:path});
    if (v != null && (!Number.isFinite(v) || v < 0)) issues.push({code:'INVALID_VOLUME',path:path});
  }

  inspect(message){
    const t = nowMs();
    this.stats.received++;
    const msg = message && typeof message === 'object' ? message : {};
    const issues = [];
    const warnings = [];

    if (!this.enabled) return this._finish('PASS','FIREWALL_DISABLED',msg,issues,warnings,t);

    let bytes = 0;
    try { bytes = Buffer.byteLength(JSON.stringify(msg),'utf8'); } catch(e) { issues.push({code:'UNSERIALIZABLE_PAYLOAD'}); }
    if (bytes > this.maxPayloadBytes) issues.push({code:'PAYLOAD_TOO_LARGE',bytes:bytes,max:this.maxPayloadBytes});

    const provider = norm(msg.provider || msg.source);
    const type = norm(msg.type || msg.dataType);
    if (!provider) issues.push({code:'PROVIDER_MISSING'});
    else if (!this.providerWhitelist.has(provider)) issues.push({code:'PROVIDER_NOT_ALLOWED',provider:provider});
    if (!type) issues.push({code:'DATA_TYPE_MISSING'});
    else if (!this.typeWhitelist.has(type)) issues.push({code:'DATA_TYPE_NOT_ALLOWED',type:type});

    if (this.requireProvenance) {
      const hasProv = !!(msg.provenance || msg.source || msg.provider);
      if (!hasProv) issues.push({code:'PROVENANCE_MISSING'});
    }

    const ts = Number(msg.timestamp || msg.updatedAt || msg.receivedAt);
    if (!Number.isFinite(ts)) issues.push({code:'TIMESTAMP_MISSING_OR_INVALID'});
    else {
      const age = t - ts;
      if (age > this.maxMessageAgeMs) issues.push({code:'STALE_DATA',ageMs:age,maxAgeMs:this.maxMessageAgeMs});
      if (age < -this.maxFutureSkewMs) issues.push({code:'FUTURE_TIMESTAMP',skewMs:-age,maxFutureSkewMs:this.maxFutureSkewMs});
    }

    if (msg.symbol && !/^[A-Za-z0-9:_\-\/\.]{2,40}$/.test(String(msg.symbol))) issues.push({code:'INVALID_SYMBOL'});

    const data = msg.data;
    if (['OHLC','OHLCV','CANDLES'].includes(type)) {
      const rows = Array.isArray(data) ? data : (data && Array.isArray(data.candles) ? data.candles : []);
      if (!rows.length) issues.push({code:'CANDLES_EMPTY'});
      else rows.slice(0,2000).forEach((c,i)=>this._validateCandle(c,issues,'data['+i+']'));
    }

    const p = this._extractPrice(msg);
    if (p != null) {
      if (!num(p) || p <= 0) issues.push({code:'INVALID_PRICE'});
      else if (msg.symbol) {
        const key = provider+'|'+norm(msg.symbol);
        const prev = this.lastPrice.get(key);
        if (num(prev) && prev > 0) {
          const jump = Math.abs(p-prev)/prev*100;
          if (jump > this.maxPriceJumpPct) issues.push({code:'PRICE_JUMP',jumpPct:+jump.toFixed(4),maxPct:this.maxPriceJumpPct});
        }
        this.lastPrice.set(key,p);
      }
    }

    if (data && typeof data === 'object' && num(data.bid) && num(data.ask)) {
      if (data.bid <= 0 || data.ask <= 0 || data.ask < data.bid) issues.push({code:'INVALID_BID_ASK'});
      else {
        const mid=(data.bid+data.ask)/2; const spread=(data.ask-data.bid)/mid*100;
        if (spread > this.maxSpreadPct) warnings.push({code:'WIDE_SPREAD',spreadPct:+spread.toFixed(4),maxPct:this.maxSpreadPct});
      }
    }

    this._cleanupSeen(t);
    if (this.duplicateWindowMs > 0) {
      const fp = this._fingerprint(msg); const previous = this.seen.get(fp);
      if (previous && t-previous <= this.duplicateWindowMs) { issues.push({code:'DUPLICATE_DATA',ageMs:t-previous}); this.stats.duplicates++; }
      this.seen.set(fp,t);
    }

    if (issues.length) {
      if (this.mode === 'OBSERVATION') return this._finish('WARN','WOULD_REJECT',msg,issues,warnings,t);
      return this._finish('REJECT','VALIDATION_FAILED',msg,issues,warnings,t);
    }
    if (warnings.length) return this._finish('WARN','ANOMALY_WARNING',msg,issues,warnings,t);
    return this._finish('PASS','VALID',msg,issues,warnings,t);
  }

  _finish(decision,reason,msg,issues,warnings,t){
    if (decision==='PASS') this.stats.passed++;
    else if (decision==='WARN') this.stats.warned++;
    else this.stats.rejected++;
    this.stats.lastDecisionAt=t; this.stats.lastReason=reason;
    return {ok:decision!=='REJECT',decision:decision,reason:reason,issues:issues,warnings:warnings,checkedAt:t,message:msg};
  }
}

module.exports = DataCollectorFirewall;
