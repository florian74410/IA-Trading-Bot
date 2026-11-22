"use strict";
// Explicit finite plans on the existing ManualOrders store. No autonomous strategy.
const crypto = require("node:crypto"),
  C = require("./manual_contract"),
  W = require("./manual_workflow");
async function preparePlan(token, p) {
  const actor = this.actor(token),
    steps = p.intent_parameters.steps;
  if (!Array.isArray(steps) || !steps.length || steps.length > 20)
    throw Error("MANUAL_PLAN_SIZE_INVALID");
  const old = this.db
    .prepare("SELECT * FROM manual_orders WHERE id=?")
    .get(p.id);
  if (
    old &&
    (old.owner !== actor.owner ||
      old.session !== actor.session ||
      JSON.parse(old.data).sourceDigest !== p.digest)
  )
    throw Error("PREPARATION_CONFLICT");
  if (old && old.phase !== "PREPARED")
    throw Error("PREPARATION_ALREADY_CLAIMED");
  const prepared = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (
      !Array.isArray(step.depends_on) ||
      step.depends_on.some((n) => !Number.isInteger(n) || n < 0 || n >= i)
    )
      throw Error("MANUAL_PLAN_DEPENDENCY_INVALID");
    const params = {
      ...step.parameters,
      environment:
        step.parameters.environment || p.intent_parameters.environment,
    };
    if (params.environment !== p.intent_parameters.environment) throw Error("MANUAL_PLAN_MODE_MISMATCH");
    const child = await this.advancedPrepare(
      token,
      {
        id: crypto.randomUUID(),
        digest: C.hash(step),
        route_version: 2,
        operation: step.intent_id,
        intent_parameters: params,
        expires_at: p.expires_at,
      },
      {
        leverageDependency: step.depends_on.some(
          (n) =>
            steps[n].intent_id === "account.leverage" &&
            steps[n].parameters.account === params.account &&
            steps[n].parameters.instrument_candidate ===
              params.instrument_candidate &&
            steps[n].parameters.margin_mode === params.margin_mode &&
            steps[n].parameters.leverage === params.leverage,
        ),
      },
    );
    if (!child.confirmable) throw Error("MANUAL_PLAN_STEP_UNAVAILABLE");
    prepared.push({
      preparation: child,
      depends_on: step.depends_on,
      status: "AWAITING_CONFIRMATION",
    });
  }
  const out = {
    ...p,
    advanced: true,
    steps: prepared.map((x) => ({
      id: x.preparation.id,
      operation: x.preparation.operation,
      spec: x.preparation.spec,
      depends_on: x.depends_on,
      missing_information: x.preparation.missing_information,
      warnings: x.preparation.warnings,
    })),
    confirmable: true,
    requires_acknowledgement: true,
    missing_information: [
      ...new Set(prepared.flatMap((x) => x.preparation.missing_information)),
    ],
    warnings: [
      "SEQUENTIAL_PLAN_NOT_ATOMIC",
      "NO_AUTOMATIC_FINANCIAL_COMPENSATION",
    ],
    message:
      p.intent_parameters.environment + " : vérifie toutes les étapes et leurs dépendances avant confirmation.",
  };
  out.digest = C.hash({ source: p.digest, steps: out.steps });
  const row = { id: p.id, ...actor, digest: out.digest };
  this.db
    .transaction(() => {
      const current = this.db
        .prepare("SELECT * FROM manual_orders WHERE id=?")
        .get(p.id);
      if (
        current &&
        (current.owner !== actor.owner ||
          current.session !== actor.session ||
          current.phase !== "PREPARED")
      )
        throw Error("PREPARATION_ALREADY_CLAIMED");
      for (const step of prepared) {
        const child = W.lookup(this, actor, step.preparation.id);
        if (!child || child.phase !== "PREPARED")
          throw Error("PLAN_STEP_CHANGED");
        const d = JSON.parse(child.data);
        d.parent_plan_id = p.id;
        W.save(this, child, d, "PREPARED");
      }
      W.save(
        this,
        row,
        {
          advanced: true,
          plan: true,
          sourceDigest: p.digest,
          preparation: out,
          steps: prepared,
        },
        "PREPARED",
      );
      this.record(row, "AWAITING_CONFIRMATION", { steps: out.steps });
    })
    .immediate();
  return out;
}
async function confirmPlan(token, input) {
  const actor = this.actor(token),
    row = W.lookup(this, actor, input.preparation_id);
  if (!row || row.digest !== input.digest) throw Error("PREPARATION_NOT_FOUND");
  const data = JSON.parse(row.data);
  if (row.phase !== "PREPARED")
    return row.result
      ? JSON.parse(row.result)
      : { status: row.phase, message: "Plan déjà confirmé." };
  if (input.acknowledge_warnings !== true)
    throw Error("MANUAL_WARNINGS_ACKNOWLEDGEMENT_REQUIRED");
  if (data.preparation.expires_at <= Date.now())
    throw Error("PREPARATION_EXPIRED_OR_BLOCKED");
  const claim = this.db
    .prepare(
      "UPDATE manual_orders SET phase='CONFIRMING' WHERE id=? AND phase='PREPARED'",
    )
    .run(row.id);
  if (!claim.changes) throw Error("CONFIRMATION_ALREADY_RESERVED");
  try {
    const r = await this.bridge.bridge(token, {
      target: "supervisor",
      action: "supervisor.chatbot.confirm",
      arguments: {
        preparation_id: row.id,
        digest: data.sourceDigest,
        conversation_id: data.preparation.conversation_id || "default",
        claim: true,
      },
    });
    if (r.execution !== "INTENT_CONFIRMED")
      throw Error("SUPERVISOR_CONFIRMATION_REQUIRED");
    data.confirmed = true;
    W.save(this, row, data, "CONFIRMED");
    this.record(row, "CONFIRMED", { steps: data.preparation.steps });
    const out = await this.advancePlan(token, row.id);
    this.planTimers ||= new Map();
    if (!out.terminal && !this.planTimers.has(row.id)) {
      const timer = setInterval(async () => {
        try {
          const next = await this.advancePlan(token, row.id);
          if (next.terminal) {
            clearInterval(timer);
            this.planTimers.delete(row.id);
          }
        } catch (_) {
          clearInterval(timer);
          this.planTimers.delete(row.id);
        }
      }, 4000);
      timer.unref();
      this.planTimers.set(row.id, timer);
    }
    return out;
  } catch (e) {
    this.finish(row, { ok: false, status: "FAILED", message: e.message });
    throw e;
  }
}
async function advancePlan(token, planId) {
  const actor = this.actor(token),
    row = W.lookup(this, actor, planId);
  if (!row) throw Error("PREPARATION_NOT_FOUND");
  const d = JSON.parse(row.data);
  if (!d.confirmed) throw Error("PLAN_CONFIRMATION_REQUIRED");
  this.planBusy ||= new Set();
  if (this.planBusy.has(planId))
    return row.result
      ? JSON.parse(row.result)
      : { status: "CONFIRMED", terminal: false };
  this.planBusy.add(planId);
  try {
    for (let i = 0; i < d.steps.length; i++) {
      const step = d.steps[i],
        child = W.lookup(this, actor, step.preparation.id);
      if (child?.phase !== "PREPARED") {
        const r = await this.reconcileAdvanced(token, step.preparation.id);
        step.status = r.status;
        step.result = r;
        continue;
      }
      const deps = step.depends_on.map((n) => d.steps[n]);
      if (
        deps.some((x) =>
          ["FAILED", "REJECTED", "CANCELLED", "CANCELLED_DEPENDENCY"].includes(
            x.status,
          ),
        )
      ) {
        step.status = "CANCELLED_DEPENDENCY";
        step.result = {
          ok: false,
          status: step.status,
          execution: "NONE",
          message: "Étape non exécutée : une dépendance a échoué.",
        };
        this.finish(child, step.result);
        this.record(row, "CANCELLED_DEPENDENCY", {
          step: i,
          depends_on: step.depends_on,
        });
        continue;
      }
      if (
        deps.some((x) => !["FILLED", "LEVERAGE_VERIFIED"].includes(x.status))
      ) {
        step.status = "AWAITING_DEPENDENCY";
        continue;
      }
      try {
        step.result = await this.advancedConfirm(
          token,
          {
            preparation_id: step.preparation.id,
            digest: step.preparation.digest,
            acknowledge_warnings: true,
          },
          { parentPlanId: planId },
        );
      } catch (e) {
        step.result = {
          ok: false,
          status: "FAILED",
          execution: "NONE",
          reason: /^[A-Z0-9_]+$/.test(e.message)
            ? e.message
            : "PLAN_STEP_FAILED",
          message: "Étape refusée avant soumission.",
        };
        this.finish(child, step.result);
      }
      step.status = step.result.status;
    }
    const terminal = d.steps.every(
        (x) => W.TERMINAL.has(x.status) || x.status === "LEVERAGE_VERIFIED",
      ),
      out = {
        ok: !d.steps.some((x) => ["FAILED", "REJECTED"].includes(x.status)),
        status: terminal ? "COMPLETED" : "AWAITING_DEPENDENCY",
        terminal,
        plan_id: planId,
        steps: d.steps.map((x, i) => ({
          index: i,
          id: x.preparation.id,
          status: x.status,
          depends_on: x.depends_on,
          result: x.result || null,
        })),
        message: terminal
          ? "Plan terminé. Consulte le résultat de chaque étape."
          : "Plan suivi : les étapes dépendantes attendent une exécution broker vérifiée.",
      };
    W.save(this, row, d, out.status, out);
    this.record(row, "PLAN_PROGRESS", {
      steps: out.steps.map((x) => ({ index: x.index, status: x.status })),
      terminal,
    });
    return out;
  } finally {
    this.planBusy.delete(planId);
  }
}
async function reconcilePlan(token, planId) {
  const actor = this.actor(token),
    row = this.db
      .prepare("SELECT * FROM manual_orders WHERE id=? AND owner=?")
      .get(planId, actor.owner);
  if (!row) throw Error("PREPARATION_NOT_FOUND");
  const d = JSON.parse(row.data);
  if (!d.plan) throw Error("PLAN_REQUIRED");
  if (!d.confirmed)
    return row.result
      ? JSON.parse(row.result)
      : { status: row.phase, plan_id: planId, execution: "NONE" };
  this.planBusy ||= new Set();
  if (this.planBusy.has(planId))
    return row.result
      ? JSON.parse(row.result)
      : { status: row.phase, terminal: false };
  this.planBusy.add(planId);
  try {
    for (const s of d.steps) {
      const child = this.db
        .prepare("SELECT * FROM manual_orders WHERE id=? AND owner=?")
        .get(s.preparation.id, actor.owner);
      if (child && child.phase !== "PREPARED") {
        s.result = await this.reconcileAdvanced(token, s.preparation.id);
        s.status = s.result.status;
      }
    }
    const terminal = d.steps.every(
        (s) => W.TERMINAL.has(s.status) || s.status === "BATCH_COMPLETED",
      ),
      out = {
        ok: !d.steps.some((s) => ["FAILED", "REJECTED"].includes(s.status)),
        status: terminal ? "COMPLETED" : "AWAITING_DEPENDENCY",
        terminal,
        plan_id: planId,
        steps: d.steps.map((s, i) => ({
          index: i,
          id: s.preparation.id,
          status: s.status,
          depends_on: s.depends_on,
          result: s.result || null,
        })),
        message: "États des étapes vérifiés sans nouvelle soumission.",
      };
    W.save(this, row, d, out.status, out);
    return out;
  } finally {
    this.planBusy.delete(planId);
  }
}
module.exports = { preparePlan, confirmPlan, advancePlan, reconcilePlan };
