
"use strict";

const assert = require("assert");
const { TradingEngine, normalizeOrderIntent } = require("./trading-engine");
const { createTradingProtocolAdapter } = require("./communication-protocol-adapter");
const { registerDefaultExecutors } = require("./registry");

(async () => {
  assert.throws(() => normalizeOrderIntent({
    exchange:"BINANCE", symbol:"BTC/USDT", side:"BUY", quantity:"0.001"
  }), /risk_approval_id/);

  const engine = registerDefaultExecutors(new TradingEngine({ liveExecutionEnabled:false }));
  const cp = createTradingProtocolAdapter(engine);

  const h = await cp({ source:"ROUTER", target:"TRADING_ENGINE", type:"trading.health", id:"h1" });
  assert.strictEqual(h.ok, true);
  assert.deepStrictEqual(h.payload.exchanges.sort(), ["BINANCE","GMX","KRAKEN","OKX"]);

  const caps = await cp({
    source:"ROUTER", target:"TRADING_ENGINE", type:"trading.capabilities", id:"c1",
    payload:{exchange:"OKX"}
  });
  assert.strictEqual(caps.ok, true);
  assert.strictEqual(caps.payload.capabilities.exchange, "OKX");

  const r = await cp({
    source:"ROUTER", target:"TRADING_ENGINE", type:"trading.execute", id:"e1",
    payload:{
      risk_approval_id:"risk-001",
      exchange:"BINANCE", market_type:"SPOT", symbol:"BTC/USDT",
      side:"BUY", order_type:"MARKET", quantity:"0.001"
    }
  });
  assert.strictEqual(r.ok, false);
  assert.match(r.error.message, /Live execution is disabled/);

  console.log("[PASS] Trading Engine self-test");
})().catch(err => {
  console.error("[FAIL] Trading Engine self-test");
  console.error(err);
  process.exit(1);
});
