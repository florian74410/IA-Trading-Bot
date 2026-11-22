"use strict";
// Core is the owner authority. Supervisor confirms the immutable intent; all Engine
// calls below use the existing owner bridge and Router, never direct broker I/O.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  Database = require("better-sqlite3");
const { configuration } = require("./config"),
  Messages = require("./messages");
function hash(x) {
  return crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
}
function orderFor(preparation, owner) {
  const p = preparation.intent_parameters;
  if (
    !p ||
    !["trading.buy", "trading.sell"].includes(preparation.operation) ||
    p.market !== "SPOT" ||
    p.order_type !== "MARKET" ||
    p.environment !== "LIVE" ||
    !p.account ||
    !p.instrument_candidate ||
    !Number.isFinite(p.amount) ||
    p.amount <= 0 ||
    p.stop_loss !== undefined ||
    p.take_profit !== undefined ||
    (p.leverage !== undefined && p.leverage !== 1)
  )
    throw Error("MANUAL_SPOT_MARKET_ONLY");
  const [base, quote, ...suffix] = p.instrument_candidate.split("-");
  if (
    suffix.length ||
    p.asset !== base ||
    p.quote !== quote ||
    ![base, quote].includes(p.amount_unit)
  )
    throw Error("ORDER_INSTRUMENT_OR_UNIT_INVALID");
  const clientId = "iatb" + preparation.id.replace(/-/g, "").slice(0, 28);
  return {
    schema: "cp1.trade-intent/1.0",
    source: "supervisor.chatbot.manual",
    mode: "LIVE_GUARDED",
    exchange: "OKX",
    market_type: "SPOT",
    symbol: p.instrument_candidate,
    action: preparation.operation === "trading.buy" ? "BUY" : "SELL",
    orderType: "MARKET",
    ...(p.amount_unit === base
      ? { size: p.amount }
      : { quoteQuantity: p.amount }),
    metadata: {
      ownerClientId: owner,
      account: p.account,
      plan_id: preparation.id,
      client_order_id: clientId,
    },
  };
}
class ManualOrders {
  constructor({ root, sessions, bridge, vault, env = process.env }) {
    this.sessions = sessions;
    this.bridge = bridge;
    this.vault = vault;
    this.env = env;
    const dir = path.join(
      env.IATB_DATA_ROOT ||
        path.join(require("node:os").homedir(), "IA-TB-UserData-Server"),
      "Execution",
    );
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, "manual_orders.sqlite");
    this.db = new Database(file);
    fs.chmodSync(file, 0o600);
    this.db.pragma("journal_mode=WAL");
    this.db.pragma("synchronous=FULL");
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS manual_orders(id TEXT PRIMARY KEY,owner TEXT NOT NULL,session TEXT NOT NULL,digest TEXT NOT NULL,phase TEXT NOT NULL,data TEXT NOT NULL,result TEXT,updated INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS manual_order_events(seq INTEGER PRIMARY KEY,id TEXT NOT NULL,owner TEXT NOT NULL,phase TEXT NOT NULL,at INTEGER NOT NULL,details TEXT NOT NULL);",
    );
  }
  actor(token) {
    const p = this.sessions.verifySession(token);
    if (!p || !["ADMIN", "USER"].includes(p.role))
      throw Error("OWNER_REQUIRED");
    return {
      owner: p.clientId,
      session: crypto
        .createHash("sha256")
        .update(Buffer.from(token, "base64url"))
        .digest("hex"),
    };
  }
  record(row, phase, details = {}) {
    this.db
      .prepare(
        "INSERT INTO manual_order_events(id,owner,phase,at,details) VALUES(?,?,?,?,?)",
      )
      .run(row.id, row.owner, phase, Date.now(), JSON.stringify(details));
  }
  account(token, p) {
    const a = this.vault
      ?.list(token)
      .find(
        (a) =>
          a.id === p.account &&
          a.enabled &&
          a.exchange === "OKX" &&
          (a.demoMode === true) === (p.environment === "DEMO") &&
          a.markets.includes(p.market||"SPOT") &&
          a.actions.includes("execute"),
      );
    if (!a) throw Error(p.environment === "DEMO" ? "DEMO_ACCOUNT_NOT_AUTHORIZED" : "LIVE_ACCOUNT_NOT_AUTHORIZED");
    return a;
  }
  async risk(token, intent) {
    return this.bridge.bridge(token, {
      target: "risk",
      action: "risk.snapshot.create",
      arguments: {
        portfolio_id: intent.metadata.account,
        symbol: intent.symbol.replace(/-/g, ""),
        timeframe: "1m",
        context: "analysis",
        strategy_type: "manual_order",
        correlation_id: intent.metadata.plan_id,
        intent,
      },
    });
  }
  allowed(s) {
    return (
      ["COMPLETE", "PARTIAL"].includes(s.status) &&
      ["ALLOW", "ALLOW_WITH_LIMITS"].includes(s.decision) &&
      Array.isArray(s.required_missing_metrics) &&
      !s.required_missing_metrics.length
    );
  }
  async prepare(token, p) {
    if(p.route_version===2&&this.env.IATB_MANUAL_ORDERS_LEGACY_COMPAT!=='1')return this.advancedPrepare(token,p);
    const actor = this.actor(token),
      out = structuredClone(p);
    out.confirmable = false;
    try {
      if (!configuration(this.env).live) throw Error("LIVE_EXECUTION_DISABLED");
      if (
        this.db
          .prepare(
            "SELECT data FROM manual_orders WHERE owner=? AND phase IN ('CONFIRMING','SUBMITTING','UNKNOWN_RECONCILIATION_REQUIRED')",
          )
          .all(actor.owner)
          .some(
            (r) =>
              JSON.parse(r.data).intent.metadata.account ===
              p.intent_parameters?.account,
          )
      )
        throw Error("ORDER_RECONCILIATION_REQUIRED");
      const intent = orderFor(p, actor.owner),
        account = this.account(token, p.intent_parameters),
        snapshot = await this.risk(token, intent);
      const summary = snapshot.order_summary || {};
      Object.assign(out, {
        risk_scores: snapshot.scores,
        risk_decision: snapshot.decision,
        snapshot_id: snapshot.snapshot_id,
        current_price: summary.estimated_price ?? null,
        estimated_fees: summary.estimated_fees ?? null,
        available_balance: summary.available_quote ?? null,
        slippage: summary.slippage ?? null,
        instrument: summary.instrument ?? null,
        confirmable: this.allowed(snapshot),
        qualification: "OWNER_CONFIRMED_ROUTE",
        warnings: [...(snapshot.reasons || []), ...(snapshot.warnings || [])],
        api_region: account.apiRegion,
      });
      out.message = out.confirmable
        ? "Ordre Spot réel préparé ; confirmation requise."
        : Messages.riskMessage(snapshot);
      const row = { id: p.id, ...actor };
      this.db
        .transaction(() => {
          const prior = this.db
            .prepare("SELECT * FROM manual_orders WHERE id=?")
            .get(p.id);
          if (prior) {
            if (
              prior.owner !== actor.owner ||
              prior.session !== actor.session ||
              prior.digest !== p.digest
            )
              throw Error("PREPARATION_CONFLICT");
            if (prior.phase !== "PREPARED")
              throw Error("PREPARATION_ALREADY_CLAIMED");
          }
          this.db
            .prepare(
              "INSERT INTO manual_orders VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated",
            )
            .run(
              p.id,
              actor.owner,
              actor.session,
              p.digest,
              "PREPARED",
              JSON.stringify({
                preparation: out,
                intent,
                accountRevision: account.revision,
                preview: snapshot,
              }),
              null,
              Date.now(),
            );
          this.record(row, "PREPARED", {
            snapshot_id: snapshot.snapshot_id,
            decision: snapshot.decision,
            confirmable: out.confirmable,
          });
        })
        .immediate();
    } catch (e) {
      out.confirmable = false;
      out.reason = /^[A-Z0-9_]+$/.test(e.message)
        ? e.message
        : "PREPARATION_UNAVAILABLE";
      out.message = Messages.message(out.reason);
      out.warnings = [out.reason];
    }
    return out;
  }
  rejectConfirmation(row, code) {
    if (row) this.record(row, "CONFIRMATION_REFUSED", { code });
    throw Error(code);
  }
  async confirm(token, input) {
    const advanced=input?.preparation_id&&this.db.prepare("SELECT data FROM manual_orders WHERE id=?").get(input.preparation_id);
    if(advanced&&JSON.parse(advanced.data).advanced)return this.advancedConfirm(token,input);
    if (
      !input ||
      Object.keys(input).some(
        (k) => !["preparation_id", "digest", "conversation_id"].includes(k),
      )
    )
      throw Error("CONFIRMATION_INVALID");
    const actor = this.actor(token),
      row = this.db
        .prepare(
          "SELECT * FROM manual_orders WHERE id=? AND owner=? AND session=?",
        )
        .get(input.preparation_id, actor.owner, actor.session);
    if (!row || row.digest !== input.digest)
      return this.rejectConfirmation(row, "PREPARATION_NOT_FOUND");
    if (row.phase !== "PREPARED")
      return row.result
        ? JSON.parse(row.result)
        : {
            ok: false,
            status:
              row.phase === "CANCELLED"
                ? "CANCELLED"
                : "UNKNOWN_RECONCILIATION_REQUIRED",
            execution: "NONE",
            plan_id: row.id,
            message:
              row.phase === "CANCELLED"
                ? "Préparation annulée. Aucun ordre n’a été envoyé."
                : "Demande déjà réservée. Aucun nouvel ordre ne sera envoyé.",
          };
    const saved = JSON.parse(row.data),
      p = saved.preparation;
    if (!p.confirmable || p.expires_at <= Date.now())
      return this.rejectConfirmation(row, "PREPARATION_EXPIRED_OR_BLOCKED");
    if (!configuration(this.env).live)
      return this.rejectConfirmation(row, "LIVE_EXECUTION_DISABLED");
    if (
      this.account(token, p.intent_parameters).revision !==
      saved.accountRevision
    )
      return this.rejectConfirmation(row, "ACCOUNT_CHANGED");
    const claimed = this.db
      .transaction(() => {
        const r = this.db
          .prepare(
            "UPDATE manual_orders SET phase='CONFIRMING',updated=? WHERE id=? AND phase='PREPARED'",
          )
          .run(Date.now(), row.id);
        if (r.changes) this.record(row, "CONFIRMING");
        return r.changes;
      })
      .immediate();
    if (!claimed) throw Error("CONFIRMATION_ALREADY_RESERVED");
    let submitted = false,
      riskRefusal = null;
    try {
      const accepted = await this.bridge.bridge(token, {
        target: "supervisor",
        action: "supervisor.chatbot.confirm",
        arguments: { ...input, claim: true },
      });
      if (
        accepted.execution !== "INTENT_CONFIRMED" ||
        accepted.preparation_id !== row.id ||
        accepted.digest !== row.digest
      )
        throw Error("SUPERVISOR_CONFIRMATION_REQUIRED");
      const s = await this.risk(token, saved.intent);
      this.record(row, "RISK_RECHECK", {
        snapshot_id: s.snapshot_id,
        decision: s.decision,
        reasons: s.reasons || [],
        required_missing_metrics: s.required_missing_metrics || [],
      });
      if (!this.allowed(s)) {
        riskRefusal = Messages.riskMessage(s);
        throw Error("RISK_ORDER_BLOCKED");
      }
      const old = saved.preview.order_summary,
        fresh = s.order_summary;
      if (
        old?.fee_rate !== fresh?.fee_rate ||
        (old?.estimated_price > 0 &&
          (!Number.isFinite(fresh?.estimated_price) ||
            Math.abs(fresh.estimated_price - old.estimated_price) /
              old.estimated_price >
              saved.preview.constraints.maxSlippage))
      )
        throw Error("ORDER_CHANGED_RECONFIRM_REQUIRED");
      this.actor(token);
      if (
        !configuration(this.env).live ||
        this.account(token, p.intent_parameters).revision !==
          saved.accountRevision
      )
        throw Error("ORDER_AUTHORITY_CHANGED");
      const approval = await this.bridge.bridge(token, {
        target: "risk",
        action: "risk.order.authorize",
        arguments: {
          snapshot_id: s.snapshot_id,
          portfolio_id: saved.intent.metadata.account,
          intent: saved.intent,
        },
      });
      if (approval.approved !== true || !approval.risk_approval_id)
        throw Error("RISK_APPROVAL_REQUIRED");
      this.record(row, "RISK_APPROVED", {
        snapshot_id: s.snapshot_id,
        approval_id: approval.risk_approval_id,
      });
      const i = saved.intent,
        args = {
          risk_approval_id: approval.risk_approval_id,
          exchange: "OKX",
          market_type: "SPOT",
          symbol: i.symbol,
          side: i.action,
          order_type: "MARKET",
          account: i.metadata.account,
          client_order_id: i.metadata.client_order_id,
          ...(i.size !== undefined
            ? { quantity: String(i.size) }
            : { quote_quantity: String(i.quoteQuantity) }),
          metadata: { trade_intent: i, plan_id: row.id },
        };
      this.db
        .transaction(() => {
          this.db
            .prepare(
              "UPDATE manual_orders SET phase='SUBMITTING',updated=? WHERE id=?",
            )
            .run(Date.now(), row.id);
          this.record(row, "SUBMITTING", {
            client_order_id: args.client_order_id,
          });
        })
        .immediate();
      submitted = true;
      const result = await this.bridge.bridge(token, {
        target: "trading",
        action: "trading.execute",
        arguments: args,
      });
      const out = {
        ok: result.ok === true,
        status: result.ok
          ? "ACKNOWLEDGED"
          : result.status === "REJECTED"
            ? "REJECTED"
            : "UNKNOWN_RECONCILIATION_REQUIRED",
        execution: result.ok ? "SUBMITTED" : "NONE",
        broker_code: /^[0-9]{1,12}$/.test(
          String(result.diagnostics?.s_code || result.diagnostics?.code || ""),
        )
          ? String(result.diagnostics?.s_code || result.diagnostics?.code)
          : null,
        reason: /^[A-Z0-9_:]+$/.test(result.error || "") ? result.error : null,
        order_id: result.exchange_order_id || null,
        client_order_id: args.client_order_id,
        plan_id: row.id,
        portfolio_recorded: result.portfolio_recorded === true,
        message: result.ok
          ? "Ordre accepté par OKX. Cela ne confirme pas encore son exécution complète."
          : result.status === "REJECTED"
            ? "Ordre rejeté par OKX."
            : "Résultat à réconcilier avec OKX ; aucun renvoi automatique.",
      };
      this.finish(row, out);
      return out;
    } catch (e) {
      const rejected = e.execution_result || e.response?.data;
      if (
        submitted &&
        rejected?.ok === false &&
        rejected.status === "REJECTED"
      ) {
        const out = {
          ok: false,
          status: "REJECTED",
          execution: "NONE",
          plan_id: row.id,
          order_id: null,
          broker_code: /^[0-9]{1,12}$/.test(
            String(rejected.diagnostics?.s_code || ""),
          )
            ? String(rejected.diagnostics.s_code)
            : null,
          message: "Ordre rejeté par OKX. Aucun renvoi automatique.",
        };
        this.finish(row, out);
        return out;
      }
      const uncertain = submitted && !Messages.isPreSendFailure(e.message);
      const out = {
        ok: false,
        status: uncertain ? "UNKNOWN_RECONCILIATION_REQUIRED" : "BLOCKED",
        execution: "NONE",
        plan_id: row.id,
        reason: /^[A-Z0-9_:]+$/.test(e.message || "")
          ? e.message
          : "ORDER_UNAVAILABLE",
        message: uncertain
          ? "Résultat à réconcilier avec OKX ; aucun renvoi automatique."
          : riskRefusal || Messages.message(e.message),
      };
      this.finish(row, out);
      return out;
    }
  }
  finish(row, out) {
    this.db
      .transaction(() => {
        this.db
          .prepare(
            "UPDATE manual_orders SET phase=?,result=?,updated=? WHERE id=?",
          )
          .run(out.status, JSON.stringify(out), Date.now(), row.id);
        this.record(row, out.status, out);
      })
      .immediate();
  }
  async cancel(token, input) {
    const a = this.actor(token),
      row = this.db
        .prepare(
          "SELECT * FROM manual_orders WHERE id=? AND owner=? AND session=?",
        )
        .get(input.preparation_id, a.owner, a.session);
    if (row) {
      if (row.phase !== "PREPARED" && row.phase !== "CANCELLED")
        throw Error("ORDER_ALREADY_RESERVED");
      this.db
        .transaction(() => {
          const r = this.db
            .prepare(
              "UPDATE manual_orders SET phase='CANCELLED',updated=? WHERE id=? AND phase='PREPARED'",
            )
            .run(Date.now(), row.id);
          if (r.changes) this.record(row, "CANCELLED");
        })
        .immediate();
    }
    return this.bridge.bridge(token, {
      target: "supervisor",
      action: "supervisor.chatbot.cancel",
      arguments: input,
    });
  }
  history(token) {
    const { owner } = this.actor(token);
    if(this.env.IATB_MANUAL_ORDERS_LEGACY_COMPAT!=='1')for(const row of this.db.prepare("SELECT id,data FROM manual_orders WHERE owner=? AND phase IN ('CONFIRMING','SUBMITTING','UNKNOWN_RECONCILIATION_REQUIRED','ACKNOWLEDGED','OPEN','PARTIALLY_FILLED','CANCEL_REQUESTED','AMEND_REQUESTED','LEVERAGE_ACKNOWLEDGED','BATCH_PENDING') LIMIT 100").all(owner)){const saved=JSON.parse(row.data);if(saved.advanced&&!saved.plan)this.scheduleReconciliation(token,row.id);}

    return this.db
      .prepare(
        "SELECT id,phase,updated,result FROM manual_orders WHERE owner=? ORDER BY updated DESC LIMIT 100",
      )
      .all(owner)
      .map((r) => ({ ...r, result: r.result ? JSON.parse(r.result) : null }));
  }
  close() {
    for(const t of this.reconcilers?.values()||[])clearInterval(t);
    for(const t of this.planTimers?.values()||[])clearInterval(t);
    this.db.close();
  }
}
Object.assign(ManualOrders.prototype,require("./manual_workflow"),require("./manual_plans"));
module.exports = { ManualOrders, orderFor };
