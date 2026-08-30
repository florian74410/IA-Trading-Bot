"use strict";

const assert = require("assert");
const {
  FundamentalEngine,
  classify,
  normalizeSignal
} = require("./fundamental-engine");
const { createFundamentalRouterAdapter } = require("./router-adapter");

(async () => {
  assert.strictEqual(classify(0.7), "STRONGLY_BULLISH");
  assert.strictEqual(classify(-0.7), "STRONGLY_BEARISH");
  assert.strictEqual(normalizeSignal({ score: 4 }).score, 1);

  const engine = new FundamentalEngine();

  engine.registerProvider("mock-news", {
    async collect(ctx) {
      return [{
        category: "news",
        score: 0.8,
        confidence: 0.9,
        symbol: ctx.symbol,
        metadata: { test: true }
      }];
    }
  });

  engine.registerProvider("mock-onchain", {
    async collect(ctx) {
      return [{
        category: "onchain",
        score: 0.4,
        confidence: 0.8,
        symbol: ctx.symbol
      }];
    }
  });

  const adapter = createFundamentalRouterAdapter(engine);
  const result = await adapter({
    type: "fundamental.analyze",
    request_id: "test-001",
    payload: { exchange: "BINANCE", symbol: "BTC/USDT", timeframe: "4h" }
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.request_id, "test-001");
  assert.strictEqual(result.payload.exchange, "BINANCE");
  assert.strictEqual(result.payload.symbol, "BTC/USDT");
  assert.ok(result.payload.score > 0);
  assert.ok(result.payload.confidence > 0);
  assert.strictEqual(result.payload.signals.length, 2);

  const health = await adapter({
    type: "fundamental.health",
    request_id: "health-001"
  });

  assert.strictEqual(health.ok, true);
  assert.strictEqual(health.payload.engine, "fundamental-engine");

  console.log("[PASS] Fundamental Engine self-test");
})().catch(err => {
  console.error("[FAIL] Fundamental Engine self-test");
  console.error(err);
  process.exit(1);
});
