"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const Store = require("../Engine/portfolio_store"),
  PE = require("../Engine/portfolio_engine"),
  Owner = require("../Engine/owner_portfolio"),
  Projection = require("../Engine/execution_projection"),
  Lifecycle = require("../../services/trading-engine/manual-lifecycle");
function fill(
  owner = "CLalice",
  account = "okx-main",
  plan = "plan1",
  side = "buy",
  fee = "-0.001",
  feeCcy = "USDT",
) {
  const a = {
    owner,
    account,
    plan_id: plan,
    confirmation_digest: "a".repeat(64),
    symbol: "BTC-USDT-SWAP",
    market_type: "SWAP",
    spec: {
      kind: "ORDER",
      market: "SWAP",
      body: {
        instId: "BTC-USDT-SWAP",
        side,
        posSide: "net",
        ordType: "market",
        sz: "2",
        clOrdId: plan,
      },
      valuation: {
        contract_type: "linear",
        contract_value: "0.01",
        contract_value_currency: "BTC",
      },
    },
  };
  return Lifecycle.event(
    { spec: JSON.stringify(a) },
    "FILLED",
    { ordId: "1001" },
    {
      instId: a.symbol,
      ordId: "1001",
      tradeId: "5001",
      side,
      fillSz: "2",
      fillPx: "100",
      fee,
      feeCcy,
      ts: String(Date.now()),
    },
  );
}
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "iatb-rev2-projection-")),
    store = new Store(dir, { dbPath: path.join(dir, "portfolio.db") }),
    engine = new PE.PortfolioEngine(store, {
      settings: () => ({ baseCurrency: "EUR" }),
    });
  t.after(() => {
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return {
    root: dir,
    store,
    engine,
    read: Owner.dispatch({ root: dir, dbPath: store.dbPath }),
  };
}
test("fills reach the existing private owner ledger exactly once and do not mix owners/accounts", (t) => {
  const f = fixture(t),
    alice = fill(),
    bob = fill("CLbob", "okx-main", "plan2", "sell"),
    other = fill("CLalice", "second-account", "plan3");
  for (const e of [alice, bob, other]) Projection.record(f, e);
  Projection.record(f, alice);
  const ae = f.read({ clientId: "CLalice" }, "portfolio.events", {}).events,
    be = f.read({ clientId: "CLbob" }, "portfolio.events", {}).events;
  assert.equal(ae.length, 2);
  assert.equal(be.length, 1);
  assert(ae.every((e) => e.metadata.ownerClientId === "CLalice"));
  const ap = f.read(
      { clientId: "CLalice" },
      "portfolio.positions",
      {},
    ).positions,
    bp = f.read({ clientId: "CLbob" }, "portfolio.positions", {}).positions;
  assert.equal(ap.length, 2);
  assert(ap.every((p) => p.side === "LONG"));
  assert.equal(bp[0].side, "SHORT");
  assert.equal(ap[0].quantity, 0.02);
  assert.equal(f.engine.state().positions.length, 3);
  assert.equal(
    require("../../Core/Clients/UserManagement/owner_policy").permission(
      "portfolio",
      "portfolio.event.record",
    ),
    null,
  );
});
test("owner projection retries after a partial global write without duplicating either destination", (t) => {
  const f = fixture(t),
    e = fill(),
    original = Owner.dispatch;
  Owner.dispatch = () => () => {
    throw Error("PRIVATE_STORE_OFFLINE");
  };
  try {
    assert.throws(() => Projection.record(f, e), /PRIVATE_STORE/);
  } finally {
    Owner.dispatch = original;
  }
  assert.equal(f.store.allEvents().length, 1);
  Projection.record(f, e);
  assert.equal(f.store.allEvents().length, 1);
  assert.equal(
    f.read({ clientId: "CLalice" }, "portfolio.events", {}).events.length,
    1,
  );
});
test("OKX fee sign, base-currency fees and unknown FX remain explicit", (t) => {
  const e = fill();
  assert.equal(e.fees, 0.001);
  assert.equal(e.metadata.broker_fee, -0.001);
  assert.equal(e.metadata.fee_in_quote, 0.001);
  assert.equal(e.position_side, null);
  assert.equal(
    fill("CLalice", "okx-main", "p2", "buy", "-0.001", "BTC").metadata
      .fee_in_quote,
    0.1,
  );
  assert.equal(
    fill("CLalice", "okx-main", "p2", "buy", "0.001", "USDT").fees,
    -0.001,
  );
  const missing = fill("CLalice", "okx-main", "p2", "buy", "", "USDT");
  assert.equal(missing.fees, null);
  assert.equal(missing.metadata.fee_available, false);
  const f = fixture(t);
  Projection.record(f, e);
  const s = f.read({ clientId: "CLalice" }, "portfolio.overview", {}).snapshot;
  assert.equal(s.equity, null);
  assert.equal(s.fees, null);
  assert(s.missing_information.includes("FX_RATE_UNAVAILABLE:USDT/EUR"));
  assert.equal(s.positions[0].fees, 0.001);
  assert.equal(s.positions[0].quote_currency, "USDT");
});
test("same exchange fill retains its identity through a different management plan", () => {
  const a = fill(),
    b = fill("CLalice", "okx-main", "amend-plan");
  assert.equal(a.event_id, b.event_id);
});
test("Spot sale reduces known inventory and never invents an unbacked short", (t) => {
  const f = fixture(t),
    make = (side, id) => {
      const a = {
        owner: "CLalice",
        account: "okx-main",
        plan_id: id,
        confirmation_digest: "a".repeat(64),
        symbol: "BTC-USDT",
        market_type: "SPOT",
        spec: {
          kind: "ORDER",
          market: "SPOT",
          body: {
            instId: "BTC-USDT",
            side,
            ordType: "market",
            sz: "0.02",
            clOrdId: id,
          },
        },
      };
      return Lifecycle.event(
        { spec: JSON.stringify(a) },
        "FILLED",
        { ordId: id },
        {
          ordId: id,
          tradeId: id,
          side,
          fillSz: "0.02",
          fillPx: "100",
          fee: "-0.001",
          feeCcy: "USDT",
          ts: String(Date.now()),
        },
      );
    };
  Projection.record(f, make("sell", "external-inventory-sale"));
  assert.equal(
    f.read({ clientId: "CLalice" }, "portfolio.positions", {}).positions.length,
    0,
  );
  Projection.record(f, make("buy", "buy-tracked"));
  Projection.record(f, make("sell", "sell-tracked"));
  assert.equal(
    f.read({ clientId: "CLalice" }, "portfolio.positions", {}).positions.length,
    0,
  );
});
