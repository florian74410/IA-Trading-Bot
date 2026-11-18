"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { ManualOrders, orderFor } = require("./manual_orders"),
  { profileFixture } = require("../../Engines/Portfolio/Tests/okx_fixture"),
  { Orchestrator } = require("../../Engines/Risk/Snapshots/orchestrator"),
  { fixture } = require("../../Engines/Risk/Tests/snapshot_fixture"),
  { RiskGate } = require("../../Engines/Risk/Engine/risk_gate"),
  {
    OkxExecutor,
  } = require("../../Engines/Trading/exchange-adapters/okx/executor"),
  { TradingEngine } = require("../../Engines/Trading/trading-engine");
function prep() {
  return {
    id: crypto.randomUUID(),
    digest: "d".repeat(64),
    expires_at: Date.now() + 90000,
    operation: "trading.buy",
    intent_parameters: {
      asset: "BTC",
      quote: "USDT",
      instrument_candidate: "BTC-USDT",
      amount: 5,
      amount_unit: "USDT",
      market: "SPOT",
      order_type: "MARKET",
      environment: "LIVE",
      account: "okx-main",
    },
  };
}
test("manual order accepts NULL historical statistics; fresh owner Risk -> approval -> bound signed EU OKX request; repeat confirms never resend", async (t) => {
  const f = profileFixture(),
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "manual-order-")),
    a = fixture();
  a.sources.portfolio.portfolio_id = "okx-main";
  a.sources.portfolio.availableQuote = 900;
  a.sources.book.market_type = "SPOT";
  a.sources.portfolio.peakEquity = null;
  a.sources.portfolio.dailyPnl = null;
  a.sources.trades.trades = [];
  a.sources.book.source = "OKX";
  a.args.intent.exchange = "OKX";
  const o = new Orchestrator({ request: a.request }),
    gate = new RiskGate({
      secret: "test-only",
      getSettings: () => ({
        enabled: true,
        thresholds: { leverageWarning: 5 },
      }),
    });
  let calls = 0,
    seen;
  const engine = new TradingEngine({
    liveExecutionEnabled: true,
    lifecycle: {
      snapshot: () => ({ generation: 1 }),
      canExecute: () => true,
      submit: (_, send) => send(),
    },
    secretProvider: {
      get: async () => ({
        apiKey: "FAKE",
        apiSecret: "FAKE_SECRET",
        passphrase: "FAKE_PASS",
        apiRegion: "EEA",
      }),
    },
    transport: async (request) => {
      calls++;
      seen = request;
      return {
        statusCode: 200,
        body: { code: "0", data: [{ ordId: "fixture-order", sCode: "0" }] },
      };
    },
  });
  engine.registerExecutor("OKX", new OkxExecutor());
  const rows = [
    {
      id: "okx-main",
      owner: "CLalice",
      enabled: true,
      exchange: "OKX",
      demoMode: false,
      markets: ["SPOT"],
      actions: ["execute"],
      revision: 1,
      apiRegion: "EEA",
    },
  ];
  const bridge = {
    bridge: async (token, q) => {
      if (q.action === "supervisor.chatbot.confirm")
        return {
          execution: "INTENT_CONFIRMED",
          preparation_id: q.arguments.preparation_id,
          digest: q.arguments.digest,
        };
      if (q.action === "risk.snapshot.create") {
        a.sources.book.quoteCurrency = "USDT";
        return o.create(q.arguments, {
          ownerContext: { ownerId: "CLalice", portfolioRead: {} },
        });
      }
      if (q.action === "risk.order.authorize") {
        const s = o.get(
          q.arguments.snapshot_id,
          q.arguments.portfolio_id,
          "CLalice",
        );
        return gate.evaluate(q.arguments.intent, {
          snapshot: s,
          ownerId: "CLalice",
        });
      }
      if (q.action === "trading.execute") {
        assert(require("./binding").valid(q.arguments));
        assert.equal(
          gate.verify(
            q.arguments.risk_approval_id,
            q.arguments.metadata.trade_intent,
            true,
          ).ok,
          true,
        );
        return engine.execute(q.arguments);
      }
      throw Error("UNEXPECTED");
    },
  };
  const orders = new ManualOrders({
    root: dir,
    sessions: f.sessions,
    bridge,
    vault: { list: () => rows },
    env: { IATB_DATA_ROOT: dir, IATB_TRADING_LIVE: "true" },
  });
  t.after(async () => {
    orders.close();
    await o.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const p = prep(),
    prepared = await orders.prepare(f.tokens.alice, p);
  assert.equal(prepared.confirmable, true, JSON.stringify(prepared));
  assert.equal(prepared.risk_decision, "ALLOW_WITH_LIMITS");
  const result = await orders.confirm(f.tokens.alice, {
    preparation_id: p.id,
    digest: p.digest,
  });
  assert.equal(result.status, "ACKNOWLEDGED", JSON.stringify(result));
  assert.equal(calls, 1);
  assert.equal(new URL(seen.url).host, "eea.okx.com");
  const payload = JSON.parse(seen.body);
  assert.equal(payload.sz, "5");
  assert.equal(payload.tgtCcy, "quote_ccy");
  assert.equal(payload.banAmend, true);
  assert.equal(
    seen.headers["OK-ACCESS-SIGN"],
    crypto
      .createHmac("sha256", "FAKE_SECRET")
      .update(
        seen.headers["OK-ACCESS-TIMESTAMP"] +
          "POST/api/v5/trade/order" +
          seen.body,
      )
      .digest("base64"),
  );
  assert.deepEqual(
    await orders.confirm(f.tokens.alice, {
      preparation_id: p.id,
      digest: p.digest,
    }),
    result,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    orders.confirm(f.tokens.bob, { preparation_id: p.id, digest: p.digest }),
    /NOT_FOUND/,
  );
  assert.equal(orders.history(f.tokens.bob).length, 0);
});
test("manual Gate cannot be obtained without fresh owner snapshot or after mutation; binding rejects altered amount", () => {
  const p = prep(),
    intent = orderFor(p, "CLalice"),
    gate = new RiskGate({
      secret: "test-only",
      getSettings: () => ({
        enabled: true,
        thresholds: { leverageWarning: 5 },
      }),
    });
  assert.equal(gate.evaluate(intent).approved, false);
  const args = {
    exchange: "OKX",
    market_type: "SPOT",
    symbol: intent.symbol,
    side: "BUY",
    order_type: "MARKET",
    account: "okx-main",
    client_order_id: intent.metadata.client_order_id,
    quote_quantity: "500",
    metadata: { trade_intent: intent, plan_id: p.id },
  };
  assert.equal(require("./binding").valid(args), false);
  assert.throws(
    () =>
      orderFor(
        { ...p, intent_parameters: { ...p.intent_parameters, stop_loss: 90 } },
        "CLalice",
      ),
    /ONLY/,
  );
});

test("manual context preserves null history while missing fees and balance remain blocking", async () => {
  for (const fault of ["history", "fees", "balance"]) {
    const f = fixture();
    f.sources.portfolio.availableQuote = 900;
    f.sources.portfolio.dailyPnl = null;
    f.sources.portfolio.peakEquity = null;
    f.sources.trades.trades = [];
    f.args.strategy_type = "manual_order";
    if (fault === "fees") f.sources.book.feeRate = null;
    if (fault === "balance") f.sources.portfolio.availableQuote = null;
    const o = new Orchestrator({ request: f.request });
    try {
      const s = await o.create(f.args);
      assert.equal(s.metrics.strategy.expectancy, null);
      assert.equal(s.metrics.portfolio.daily_loss, null);
      if (fault === "history") {
        assert.equal(s.decision, "ALLOW_WITH_LIMITS");
        assert.equal(s.required_missing_metrics.length, 0);
      } else assert(["UNAVAILABLE", "BLOCK"].includes(s.decision));
    } finally {
      await o.close();
    }
  }
});
test("LIVE configuration is true and an explicit false override is respected", () => {
  const c = require("./config").configuration;
  assert.equal(c({}).live, true);
  assert.equal(c({ IATB_TRADING_LIVE: "false" }).live, false);
  assert.throws(() => c({ IATB_TRADING_LIVE: "False-ish" }), /INVALID/);
});
test("authenticated ADMIN START transitions actual durable lifecycle to RUNNING after checks", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "manual-start-")),
    Runtime =
      require("../../Engines/Trading/trading_runtime_state_v2").RuntimeState,
    Ledger =
      require("../../Engines/Trading/trading_admin_ledger_v2").AdminCommandLedger,
    Controller =
      require("../../Engines/Trading/trading_admin_controller_v2").TradingAdminController;
  const state = new Runtime({ file: path.join(dir, "state.json") }),
    ledger = new Ledger({ file: state.dbFile, db: state.db });
  try {
    const controller = new Controller({
      lifecycle: state,
      ledger,
      verifyPrincipal: async () => ({
        verified: true,
        role: "ADMIN",
        subject: "CLadmin",
      }),
      startCheck: async () => true,
    });
    const input = {
      command: "START",
      command_id: crypto.randomUUID(),
      timestamp: Date.now(),
      confirmed: true,
    };
    const r = await controller.command(input);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(state.canExecute(), true);
    assert.equal(
      (await controller.command(input)).error,
      "ADMIN_COMMAND_REPLAY",
    );
  } finally {
    state.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
