
"use strict";

const { randomBytes } = require("crypto");

const ENGINE_NAME = "trading-engine";
const ENGINE_VERSION = "1.0.0";
const CONTRACT_VERSION = 1;

function uid(prefix = "ord") {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function required(obj, field) {
  if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
    throw new Error(`Missing required field: ${field}`);
  }
}

function normalizeOrderIntent(input = {}) {
  const out = {
    request_id: input.request_id || uid("req"),
    risk_approval_id: input.risk_approval_id || null,
    exchange: String(input.exchange || "").toUpperCase(),
    market_type: String(input.market_type || "SPOT").toUpperCase(),
    symbol: String(input.symbol || "").toUpperCase(),
    side: String(input.side || "").toUpperCase(),
    order_type: String(input.order_type || "MARKET").toUpperCase(),
    quantity: input.quantity !== undefined ? String(input.quantity) : null,
    quote_quantity: input.quote_quantity !== undefined ? String(input.quote_quantity) : null,
    price: input.price !== undefined ? String(input.price) : null,
    stop_price: input.stop_price !== undefined ? String(input.stop_price) : null,
    leverage: input.leverage !== undefined ? Number(input.leverage) : null,
    reduce_only: Boolean(input.reduce_only),
    time_in_force: input.time_in_force ? String(input.time_in_force).toUpperCase() : null,
    client_order_id: input.client_order_id || uid("ia"),
    position_side: input.position_side ? String(input.position_side).toUpperCase() : null,
    chain: input.chain ? String(input.chain).toLowerCase() : null,
    account: input.account || null,
    slippage_bps: input.slippage_bps !== undefined ? Number(input.slippage_bps) : null,
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {}
  };

  required(out, "risk_approval_id");
  required(out, "exchange");
  required(out, "symbol");
  required(out, "side");
  if (!["BUY", "SELL"].includes(out.side)) throw new Error("side must be BUY or SELL");
  if (!out.quantity && !out.quote_quantity) throw new Error("quantity or quote_quantity required");

  return out;
}

class TradingEngine {
  constructor(options = {}) {
    this.executors = new Map();
    this.secretProvider = options.secretProvider || null;
    this.transport = options.transport || null;
    this.liveExecutionEnabled = Boolean(options.liveExecutionEnabled);
  }

  registerExecutor(name, executor) {
    if (!name || !executor || typeof executor.execute !== "function") {
      throw new Error("Executor must expose execute(order, context)");
    }
    this.executors.set(String(name).toUpperCase(), executor);
  }

  capabilities(exchange) {
    const ex = this.executors.get(String(exchange || "").toUpperCase());
    return ex && typeof ex.capabilities === "function" ? ex.capabilities() : null;
  }

  async execute(intent, context = {}) {
    const order = normalizeOrderIntent(intent);
    const executor = this.executors.get(order.exchange);
    if (!executor) throw new Error(`Unsupported exchange: ${order.exchange}`);

    const executionContext = {
      secretProvider: this.secretProvider,
      transport: this.transport,
      liveExecutionEnabled: this.liveExecutionEnabled,
      now: Date.now(),
      ...context
    };

    const result = await executor.execute(order, executionContext);

    return {
      contract_version: CONTRACT_VERSION,
      engine: ENGINE_NAME,
      engine_version: ENGINE_VERSION,
      request_id: order.request_id,
      risk_approval_id: order.risk_approval_id,
      client_order_id: order.client_order_id,
      exchange: order.exchange,
      symbol: order.symbol,
      ok: Boolean(result && result.ok),
      status: result && result.status || "UNKNOWN",
      exchange_order_id: result && result.exchange_order_id || null,
      raw_status: result && result.raw_status || null,
      filled_quantity: result && result.filled_quantity || null,
      average_price: result && result.average_price || null,
      fees: result && result.fees || null,
      error: result && result.error || null,
      timestamp: Date.now(),
      diagnostics: result && result.diagnostics || {}
    };
  }

  health() {
    return {
      ok: true,
      engine: ENGINE_NAME,
      engine_version: ENGINE_VERSION,
      contract_version: CONTRACT_VERSION,
      live_execution_enabled: this.liveExecutionEnabled,
      exchanges: [...this.executors.keys()],
      timestamp: Date.now()
    };
  }
}

module.exports = {
  TradingEngine,
  normalizeOrderIntent,
  ENGINE_NAME,
  ENGINE_VERSION,
  CONTRACT_VERSION
};
