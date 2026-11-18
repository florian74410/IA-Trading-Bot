"use strict";
// Durable manual operations in the existing Trading lifecycle database.
const C = require("../../Core/Execution/manual_contract"),
  A = require("../../Core/Execution/manual_authority"),
  crypto = require("node:crypto");
const number = require("./exchange-adapters/okx/account-reader").number;
function setup(engine) {
  engine.lifecycle.db.exec(
    `CREATE TABLE IF NOT EXISTS manual_submissions(owner TEXT,plan TEXT,account TEXT,spec TEXT,digest TEXT,phase TEXT,result TEXT,PRIMARY KEY(owner,plan));CREATE TABLE IF NOT EXISTS manual_broker_links(owner TEXT,account TEXT,plan TEXT,order_id TEXT,PRIMARY KEY(owner,account,plan,order_id));`,
  );
}
async function execute(input) {
  setup(this);
  const db = this.lifecycle.db,
    value = A.binding(input),
    digest = C.hash(value),
    old = db
      .prepare("SELECT * FROM manual_submissions WHERE owner=? AND plan=?")
      .get(input.owner, input.plan_id);
  if (old) {
    if (old.digest !== digest) throw Error("MANUAL_IDEMPOTENCY_CONFLICT");
    return old.result
      ? JSON.parse(old.result)
      : {
          ok: false,
          status: "UNKNOWN",
          error: "MANUAL_RECONCILIATION_REQUIRED",
        };
  }
  db.prepare("INSERT INTO manual_submissions VALUES(?,?,?,?,?,?,NULL)").run(
    input.owner,
    input.plan_id,
    input.account,
    JSON.stringify(value),
    digest,
    "SUBMITTING",
  );
  const result = await this.manualExecuteRaw(input);
  db.prepare(
    "UPDATE manual_submissions SET result=?,phase=? WHERE owner=? AND plan=?",
  ).run(JSON.stringify(result), result.status, input.owner, input.plan_id);
  if (
    [
      "ACKNOWLEDGED",
      "LEVERAGE_ACKNOWLEDGED",
      "CANCEL_REQUESTED",
      "AMEND_REQUESTED",
      "BATCH_ACKNOWLEDGED",
      "BATCH_PARTIAL",
      "REJECTED",
    ].includes(result.status)
  )
    db.prepare(
      "UPDATE trading_operations SET phase=?,updated_at=? WHERE id=?",
    ).run(
      result.status === "REJECTED" ? "REJECTED" : "ACKNOWLEDGED",
      Date.now(),
      input.plan_id,
    );
  return result;
}
function identity(row) {
  return JSON.parse(row.spec);
}
function event(row, status, broker = {}, fill = null) {
  const a = identity(row),
    b = a.spec.body,
    algo = a.spec.kind.includes("ALGO"),
    fillId = fill?.tradeId;
  const filled = fill ? number(fill.fillSz) : null,
    baseFilled =
      filled === null
        ? null
        : a.spec.valuation
          ? filled * Number(a.spec.valuation.contract_value)
          : filled;
  const rawFee = fill ? number(fill.fee) : null,
    feeCost = rawFee === null ? null : -rawFee,
    quote = a.symbol.split("-")[1],
    base = a.symbol.split("-")[0],
    feeInQuote =
      feeCost === null
        ? null
        : fill.feeCcy === quote
          ? feeCost
          : fill.feeCcy === base && number(fill.fillPx) !== null
            ? feeCost * number(fill.fillPx)
            : null;
  const kind = fill
    ? "ORDER_FILLED"
    : status === "CANCELLED"
      ? "ORDER_CANCELLED"
      : status === "REJECTED"
        ? "EXECUTION_REJECTED"
        : status === "UNKNOWN_RECONCILIATION_REQUIRED"
          ? "ORDER_RESULT_UNKNOWN"
          : "ORDER_ACCEPTED";
  const eid =
    "manual-" +
    crypto
      .createHash("sha256")
      .update(
        [
          a.owner,
          a.account,
          fillId ? "fill" : a.plan_id,
          fillId ? "fill:" + fillId : status,
          broker.ordId || broker.algoId || "",
        ].join("|"),
      )
      .digest("hex");
  return {
    schema: "portfolio.execution-event/1.1",
    event_id: eid,
    execution_id: eid,
    event_type: kind,
    timestamp: fill ? number(fill.ts) : Date.now(),
    source: "trading-engine",
    exchange: "OKX",
    symbol: a.symbol,
    side: (fill?.side || b.side || "").toUpperCase(),
    position_side: b.posSide === "net" ? null : (b.posSide || "").toUpperCase(),
    order_type: (b.ordType || "").toUpperCase(),
    quantity: baseFilled,
    filled_quantity: baseFilled,
    average_price: fill ? number(fill.fillPx) : null,
    fees: feeCost,
    fee_currency: fill?.feeCcy || null,
    exchange_order_id: fill?.ordId || broker.ordId || broker.algoId || null,
    status,
    ok: status !== "REJECTED",
    reduce_only:
      b.reduceOnly === true ||
      !!a.spec.position_id ||
      (a.market_type === "SPOT" && (fill?.side || b.side) === "sell"),
    metadata: {
      ownerClientId: a.owner,
      accountId: a.account,
      plan_id: a.plan_id,
      confirmation_id: a.plan_id,
      confirmation_digest: a.confirmation_digest,
      client_order_id: b.clOrdId || b.algoClOrdId || null,
      algo_id: algo ? broker.algoId || null : null,
      position_id: a.spec.position_id || null,
      marketType: a.market_type,
      filled_contracts: a.spec.valuation ? filled : null,
      contract_value: a.spec.valuation?.contract_value || null,
      contract_value_currency:
        a.spec.valuation?.contract_value_currency || null,
      quantity_unit: a.spec.valuation ? "BASE_EQUIVALENT" : "BASE",
      broker_state: broker.state || null,
      price_currency: quote,
      broker_fee: rawFee,
      fee_in_quote: feeInQuote,
      fee_quote_currency: quote,
      fee_available: feeInQuote !== null,
    },
  };
}
async function inspect(input) {
  setup(this);
  const r = await this.manualInspectRaw(input),
    q = input.query;
  if (!q.plan_id) return r;
  const row = this.lifecycle.db
    .prepare(
      "SELECT * FROM manual_submissions WHERE owner=? AND account=? AND plan=?",
    )
    .get(r.account_identity.owner, input.account, q.plan_id);
  if (!row) return r;
  const a = identity(row),
    b = a.spec.body;
  if (a.symbol !== input.symbol) throw Error("MANUAL_TRACKING_SCOPE_MISMATCH");
  if (q.kind === "PREFLIGHT" && a.spec.kind === "LEVERAGE") {
    const values = r.leverage?.filter(
      (x) =>
        x.instId === a.symbol &&
        x.mgnMode === b.mgnMode &&
        (!b.posSide || x.posSide === b.posSide),
    );
    if (
      values?.length &&
      values.every((x) => Number(x.lever) === Number(b.lever))
    ) {
      this.lifecycle.db
        .prepare(
          "UPDATE manual_submissions SET phase=? WHERE owner=? AND plan=?",
        )
        .run("LEVERAGE_VERIFIED", a.owner, a.plan_id);
      this.lifecycle.db
        .prepare(
          "UPDATE trading_operations SET phase=?,updated_at=? WHERE id=?",
        )
        .run("RECONCILED", Date.now(), a.plan_id);
    }
  }
  for (const broker of r.rows || []) {
    if (broker.instId !== a.symbol)
      throw Error("MANUAL_RECONCILIATION_MISMATCH");
    const linked =
      a.spec.kind === "ALGO" &&
      this.lifecycle.db
        .prepare(
          "SELECT 1 FROM manual_broker_links WHERE owner=? AND account=? AND plan=? AND order_id=?",
        )
        .get(a.owner, a.account, a.plan_id, broker.ordId || "");
    if (q.kind === "FILLS") {
      if (
        !q.order_id ||
        broker.ordId !== q.order_id ||
        !broker.tradeId ||
        !broker.fillSz ||
        !broker.fillPx
      )
        throw Error("MANUAL_FILL_INVALID");
      if (!["ORDER", "ALGO", "BATCH"].includes(a.spec.kind)) continue;
      if (a.spec.kind === "ALGO" && !linked)
        throw Error("MANUAL_ALGO_CHILD_MISMATCH");
      this.onManualEvent?.(event(row, "FILLED", broker, broker));
      continue;
    }
    if (!["ORDER", "ALGO"].includes(q.kind)) continue;
    const algo = q.kind === "ALGO",
      target = b.ordId || b.algoId,
      client = b.clOrdId || b.algoClOrdId;
    if (
      a.spec.kind === "BATCH" &&
      !b.orders.some((x) => x.clOrdId === broker.clOrdId)
    )
      throw Error("MANUAL_BATCH_SCOPE_INVALID");
    if (
      !linked &&
      ((target && (algo ? broker.algoId : broker.ordId) !== target) ||
        (!target &&
          client &&
          (algo ? broker.algoClOrdId : broker.clOrdId) !== client))
    )
      throw Error("MANUAL_RECONCILIATION_MISMATCH");
    if (q.kind === "ALGO" && /^[0-9]+$/.test(broker.ordId || ""))
      this.lifecycle.db
        .prepare("INSERT OR IGNORE INTO manual_broker_links VALUES(?,?,?,?)")
        .run(a.owner, a.account, a.plan_id, broker.ordId);
    const state = {
      live: "OPEN",
      partially_filled: "PARTIALLY_FILLED",
      filled: "FILLED",
      canceled: "CANCELLED",
      effective: "TRIGGERED",
      order_failed: "REJECTED",
    }[broker.state];
    if (
      state &&
      (["ORDER", "ALGO", "BATCH"].includes(a.spec.kind) ||
        (a.spec.kind.startsWith("CANCEL") && state === "CANCELLED") ||
        (a.spec.kind === "AMEND" &&
          (!b.newPx || b.newPx === broker.px) &&
          (!b.newSz || b.newSz === broker.sz)))
    )
      this.lifecycle.db
        .prepare(
          "UPDATE trading_operations SET phase=?,updated_at=? WHERE id=?",
        )
        .run("RECONCILED", Date.now(), a.plan_id);
    if (state) {
      this.onManualEvent?.(event(row, state, broker));
      this.lifecycle.db
        .prepare(
          "UPDATE manual_submissions SET phase=? WHERE owner=? AND plan=?",
        )
        .run(state, a.owner, a.plan_id);
    }
  }
  return r;
}
function install(Engine) {
  Engine.prototype.manualExecuteRaw = Engine.prototype.manualExecute;
  Engine.prototype.manualExecute = execute;
  Engine.prototype.manualInspectRaw = Engine.prototype.manualInspect;
  Engine.prototype.manualInspect = inspect;
}
module.exports = { install, setup, event };
