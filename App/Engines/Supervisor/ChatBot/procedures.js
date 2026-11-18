"use strict";
// This code, never editable intent JSON, determines callable procedures.
const crypto = require("node:crypto"),
  { digest } = require("./state");
const financial = new Set([
  "trading.buy",
  "trading.sell",
  "positions.open",
  "positions.close",
  "orders.cancel",
  "orders.amend",
  "plans.execute","orders.batch",
  "algorithms.place","algorithms.cancel","algorithms.amend","account.leverage","orders.status","orders.fills","orders.history","algorithms.status",
]);
const commands = {
  "account.balance": ["portfolio", "portfolio.account.snapshot"],
  "account.fees": ["portfolio", "portfolio.account.snapshot"],
  "positions.list": ["portfolio", "portfolio.account.snapshot"],
  "orders.open": ["portfolio", "portfolio.account.snapshot"],
  "market.candles": ["marketdata", "marketdata.candles"],
  "market.book": ["marketdata", "marketdata.microstructure.snapshot"],
  "risk.evaluate": ["risk", "risk.snapshot.create"],
};
function commandFor(intent) {
  return commands[intent.intent_id] || null;
}
async function available(gateway, engine, command, args) {
  if (!gateway) throw Error("CP1_CONTROL_UNAVAILABLE");
  const c = await gateway.describe_command(engine, command);
  if (
    c.contract.hard_deny ||
    !c.contract.verified_handler ||
    c.contract.agent_qualified === false
  )
    throw Error("COMMAND_UNQUALIFIED");
  if (c.decision !== "ALLOW") throw Error("PERMISSION_REQUIRED");
  if (c.online === false) throw Error("ENGINE_OFFLINE");
  await gateway.validate_command(engine, command, args);
  return gateway.execute_authorized_command(engine, command, args);
}
async function run(intent, { gateway, accounts = [], now = Date.now }) {
  const p = intent.parameters,
    base = { execution: "NONE", intent_id: intent.intent_id, parameters: p };
  if (intent.intent_id === "market.cross_analysis") {
    return { ...base, ...await require("./engine_reads").marketAnalysis(p, gateway, available) };
  }
  if (intent.intent_id === "platform.diagnostics" || intent.intent_id === "platform.commands") {
    return { ...base, ...await require("./engine_reads").run(intent.intent_id, gateway, available) };
  }
  if (intent.intent_id === "platform.status") {
    if (!gateway)
      return {
        ...base,
        status: "UNAVAILABLE",
        message: "Contrôle CP1 indisponible.",
      };
    const engines = await gateway.list_available_engines();
    return {
      ...base,
      status: "COMPLETED",
      message: engines
        .map((e) => e.id + " : " + (e.online ? "en ligne" : "indisponible"))
        .join("\n"),
    };
  }
  if (financial.has(intent.intent_id)) {
    const command =
      intent.intent_id === "orders.cancel"
        ? "trading.cancel"
        : intent.intent_id === "positions.close"
          ? "trading.close_position"
          : "trading.execute";
    let qualification = "UNQUALIFIED";
    if (gateway) {
      try {
        const c = await gateway.describe_command("trading", command);
        qualification =
          c.contract.hard_deny || !c.contract.agent_qualified
            ? "UNQUALIFIED"
            : c.decision;
      } catch (e) {
        qualification = "UNAVAILABLE";
      }
    }
    const preparation = {
      id: crypto.randomUUID(),
      route_version:2,
      digest: digest(intent),
      expires_at: now() + 90000,
      state: "PREPARED",
      confirmable: false,
      intent_parameters: structuredClone(p),
      operation: intent.intent_id,
      exchange: "OKX",
      account: p.account || null,
      environment: p.environment || null,
      market: p.market || null,
      instrument: null,
      instrument_candidate: p.instrument_candidate || null,
      side:
        intent.intent_id === "trading.sell"
          ? "SELL"
          : intent.intent_id === "trading.buy"
            ? "BUY"
            : p.position_side === "SHORT"
              ? "SELL"
              : p.position_side === "LONG"
                ? "BUY"
                : null,
      order_type: p.order_type || null,
      quantity: p.amount_unit === p.asset ? p.amount : null,
      quote_amount: p.amount_unit === p.quote ? p.amount : null,
      limit_price: p.limit_price || null,
      trigger_price: p.trigger_price || null,
      protections: {
        stop_loss: p.stop_loss || null,
        take_profit: p.take_profit || null,
        activation_verified: false,
      },
      position_side: p.position_side || null,
      close_fraction: p.close_fraction || null,
      order_id: p.order_id || null,
      position_id: p.position_id || null,
      leverage: p.leverage || null,
      current_price: null,
      estimated_fees: null,
      slippage: null,
      estimated_total: null,
      available_balance: null,
      risk_scores: null,
      risk_decision: null,
      target: null,
      initial_values: null,
      requested_changes:
        intent.intent_id === "orders.amend"
          ? {
              amount: p.amount || null,
              limit_price: p.limit_price || null,
              trigger_price: p.trigger_price || null,
            }
          : null,
      warnings: ["La préparation doit être vérifiée par Core avant confirmation."],
      sources: [],
      qualification,
    };
    const account = accounts.find((a) => a.id === p.account);
    if (!account) {
      preparation.warnings.push(
        "Compte non résolu dans le profil authentifié.",
      );
      return {
        ...base,
        status: "UNAVAILABLE",
        message: "Préparation non exécutable : compte du profil non résolu.",
        preparation,
      };
    }
    if (
      p.environment &&
      p.environment !== (account.demoMode ? "DEMO" : "LIVE")
    ) {
      preparation.warnings.push(
        "Le mode demandé ne correspond pas au compte du profil.",
      );
      return {
        ...base,
        status: "ACCOUNT_MODE_MISMATCH",
        message:
          "Le compte sélectionné ne correspond pas au mode Demo/Live demandé.",
        preparation,
      };
    }
    // Core owns private preflight and Risk diagnostic, after this intent is stored.
    return {
      ...base,
      status: "PREPARED_UNAVAILABLE",
      message:
        "Demande reconnue. En attente de la préparation par Core.",
      preparation,
    };
  }
  const mapping = commandFor(intent);
  if (!mapping)
    return {
      ...base,
      status: "UNAVAILABLE",
      message:
        "Opération reconnue et documentée, mais aucune procédure CP1 qualifiée ne permet son exécution par cet agent.",
    };
  const [engine, command] = mapping,
    args =
      engine === "portfolio"
        ? {
            account: p.account,
            exchange: "OKX",
            symbol: p.instrument_candidate || "BTC-USDT",
          }
        : engine === "risk"
          ? {
              portfolio_id: p.account,
              symbol: p.instrument_candidate.replace(/-/g, ""),
              correlation_id: crypto.randomUUID(),
              timeframe: p.timeframe || "1m",
              context: "analysis",
            }
          : command === "marketdata.candles"
            ? {
                symbol: p.instrument_candidate.replace(/-/g, ""),
                source: "OKX",
                timeframe: p.timeframe,
                limit: 100,
              }
            : {
                symbol: p.instrument_candidate.replace(/-/g, ""),
                source: "OKX",
                depth: 20,
              };
  const r = await available(gateway, engine, command, args);
  let data = r.data;
  if (intent.intent_id === "orders.open")
    data = { orders: r.data.snapshot.openOrders };
  if (intent.intent_id === "positions.list")
    data = { positions: r.data.snapshot.positions };
  if (intent.intent_id === "account.fees")
    data = {
      fee_rate: r.data.snapshot.execution_context?.feeRate ?? null,
      instrument:
        r.data.snapshot.execution_context?.exchangeConstraints?.symbol || null,
    };
  let message = "Lecture vérifiée par " + engine + " via Supervisor et CP1.";
  if (intent.intent_id === "account.balance") {
    const s = r.data.snapshot;
    message =
      "Solde disponible : " +
      (s.availableQuote === null ? "indisponible" : s.availableQuote) +
      " " +
      (s.quoteCurrency || "") +
      ". Valeur du portefeuille : " +
      (s.equity === null ? "indisponible" : s.equity) +
      " " +
      (s.quoteCurrency || "") +
      ".";
    if (s.warnings?.length)
      message += " Avertissements : " + s.warnings.slice(0, 4).join(", ");
  } else if (intent.intent_id === "account.fees")
    message = Number.isFinite(data.fee_rate)
      ? "Frais taker vérifiés : " +
        data.fee_rate * 100 +
        " % sur " +
        data.instrument +
        "."
      : "Les frais vérifiés ne sont pas disponibles.";
  else if (intent.intent_id === "orders.open")
    message = data.orders.length + " ordre(s) ouvert(s) vérifié(s).";
  else if (intent.intent_id === "positions.list")
    message = data.positions.length + " position(s) vérifiée(s).";
  else if (intent.intent_id === "market.candles")
    message =
      r.data.candles.length +
      " bougies reçues de " +
      (r.data.providerId || r.data.exchange || "MarketData") +
      " pour " +
      r.data.canonicalSymbol +
      " en " +
      r.data.timeframe +
      ".";
  else if (intent.intent_id === "market.book")
    message =
      "Carnet reçu de " +
      r.data.source +
      " : " +
      r.data.orderBook.bids.length +
      " niveaux acheteurs et " +
      r.data.orderBook.asks.length +
      " niveaux vendeurs.";
  else if (intent.intent_id === "risk.evaluate")
    message =
      "Décision Risk : " +
      r.data.decision +
      ". Ce snapshot n’autorise aucun ordre.";
  return {
    ...base,
    status: "COMPLETED",
    message,
    result: data,
    request_id: r.request_id,
    audit: (await gateway.get_command_execution_audit(r.request_id)).events.map(
      (e) => ({ at: e.at, action: e.action }),
    ),
  };
}
module.exports = { run, financial, commandFor, available };
