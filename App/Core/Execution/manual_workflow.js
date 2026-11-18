"use strict";
// Methods of the existing ManualOrders coordinator. No separate engine or broker access.
const crypto = require("node:crypto"),
  C = require("./manual_contract"),
  P = require("./manual_preview"),
  Authority = require("./manual_authority");
const TERMINAL = new Set([
  "FILLED",
  "CANCELLED",
  "REJECTED",
  "FAILED",
  "CANCELLED_DEPENDENCY",
  "LEVERAGE_VERIFIED",
]);
const mapState = (s) =>
  ({
    live: "OPEN",
    effective: "TRIGGERED",
    partially_filled: "PARTIALLY_FILLED",
    filled: "FILLED",
    canceled: "CANCELLED",
    order_failed: "REJECTED",
    pause: "OPEN",
  })[s] || null;
function id() {
  return crypto.randomUUID();
}
function scope(p, spec) {
  if(spec.kind==='BATCH')return 'margin:all';
  const b = spec.body;
  if (["CANCEL", "AMEND"].includes(spec.kind)) return "order:" + b.ordId;
  if (["CANCEL_ALGO", "AMEND_ALGO"].includes(spec.kind))
    return "algo:" + b.algoId;
  if (spec.market !== "SPOT") return "margin:all";
  return "currency:" + (b.side === "buy" ? p.quote : p.asset);
}
async function inspect(token, p, query) {
  const a = await this.bridge.bridge(token, {
    target: "trading",
    action: "trading.account.inspect",
    arguments: {
      exchange: "OKX",
      account: p.account,
      market_type: p.market,
      symbol: p.instrument_candidate,
      query,
    },
  });
  const owner = this.actor(token).owner;
  if (
    a.account_identity &&
    (a.account_identity.owner !== owner || a.account_identity.id !== p.account)
  )
    throw Error("MANUAL_READ_OWNER_MISMATCH");
  return a;
}
function lookup(self, actor, orderId) {
  return self.db
    .prepare("SELECT * FROM manual_orders WHERE id=? AND owner=? AND session=?")
    .get(orderId, actor.owner, actor.session);
}
function save(self, row, data, phase, result = null) {
  self.db
    .prepare(
      "INSERT INTO manual_orders VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET phase=excluded.phase,data=excluded.data,result=excluded.result,updated=excluded.updated",
    )
    .run(
      row.id,
      row.owner,
      row.session,
      row.digest,
      phase,
      JSON.stringify(data),
      result ? JSON.stringify(result) : null,
      Date.now(),
    );
}
function setup(self) {
  self.db.exec(
    "CREATE TABLE IF NOT EXISTS manual_reservations(id TEXT PRIMARY KEY,owner TEXT NOT NULL,account TEXT NOT NULL,scope TEXT NOT NULL);",
  );
}
function reserve(self, row, data) {
  setup(self);
  return self.db
    .transaction(() => {
      const current = lookup(self, row, row.id);
      if (current?.phase !== "PREPARED")
        throw Error("CONFIRMATION_ALREADY_RESERVED");
      const account = data.preparation.intent_parameters.account,
        sc = scope(data.preparation.intent_parameters, data.spec),
        active = self.db
          .prepare(
            "SELECT * FROM manual_reservations WHERE owner=? AND account=? AND id<>?",
          )
          .all(row.owner, account, row.id);
      if (
        active.some(
          (a) =>
            a.scope === sc || a.scope === "margin:all" || sc === "margin:all",
        )
      )
        throw Error("MANUAL_CONFLICT_RECONCILIATION_REQUIRED");
      self.db
        .prepare("INSERT INTO manual_reservations VALUES(?,?,?,?)")
        .run(row.id, row.owner, account, sc);
      self.db
        .prepare(
          "UPDATE manual_orders SET phase='CONFIRMING',updated=? WHERE id=?",
        )
        .run(Date.now(), row.id);
      self.record(row, "CONFIRMED", {
        spec: data.spec,
        diagnostics: data.preparation.missing_information,
        warnings: data.preparation.warnings,
      });
    })
    .immediate();
}
function finish(self, row, out) {
 const stored=self.db.prepare('SELECT data FROM manual_orders WHERE id=? AND owner=?').get(row.id,row.owner),p=stored?JSON.parse(stored.data).preparation:{};
 out.notification={schema:'iatb.manual-notification/1.0',type:['REJECTED','FAILED','BLOCKED'].includes(out.status)?'trading.failed':out.status==='FILLED'?'trading.executed':'engine.status',severity:['REJECTED','FAILED','UNKNOWN_RECONCILIATION_REQUIRED','PARTIALLY_FILLED'].includes(out.status)?'WARNING':'INFO',title:'Opération OKX : '+out.status,message:out.message||out.status,plan_id:row.id,estimated_total:p.estimated_total??null,estimated_fees:p.estimated_fees??null,filled_quantity:out.filled_quantity??null,average_price:out.average_price??null};

  self.db
    .transaction(() => {
      self.finish(row, out);
      if (TERMINAL.has(out.status) || out.status === "BLOCKED")
        self.db
          .prepare("DELETE FROM manual_reservations WHERE id=?")
          .run(row.id);
    })
    .immediate();
  return out;
}
async function advancedPrepare(token, p,{leverageDependency=false}={}) {
  setup(this);
  const actor = this.actor(token),
    out = structuredClone(p);
  out.advanced = true;
  out.confirmable = false;
  try {
    if (!require("./config").configuration(this.env).live)
      throw Error("LIVE_EXECUTION_DISABLED");
    if (p.operation === "plans.execute")return await this.preparePlan(token,p);
    if(p.operation==='positions.open'&&p.intent_parameters.leverage!=null&&!leverageDependency){const q=p.intent_parameters;return await this.preparePlan(token,{...p,operation:'plans.execute',intent_parameters:{account:q.account,environment:q.environment,steps:[{intent_id:'account.leverage',parameters:q,depends_on:[]},{intent_id:'positions.open',parameters:q,depends_on:[0]}]}});}

    const params = { ...p.intent_parameters, operation: p.operation };
    if (
      (params.exchange && params.exchange !== "OKX") ||
      params.environment !== "LIVE"
    )
      throw Error("MANUAL_DEFINITION_REQUIRED");
    this.account(token, { ...params, market: params.market });
    if (
      [
        "orders.status",
        "orders.fills",
        "orders.history",
        "algorithms.status",
      ].includes(p.operation)
    ) {
      const result = await inspect.call(this, token, params, {
        kind:
          p.operation === "orders.fills"
            ? "FILLS"
            : p.operation === "orders.history"
              ? "HISTORY"
              : p.operation === "algorithms.status"
                ? "ALGO"
                : "ORDER",
        ...(params.algo_id
          ? { algoId: params.algo_id }
          : params.order_id
            ? { order_id: params.order_id }
            : {}),
      });
      return {
        ...out,
        result,
        message: "État vérifié auprès du broker, sans mutation.",
        status: "COMPLETED",
      };
    }
    const pre = await inspect.call(this, token, params, {
      kind: "PREFLIGHT",
      ...(params.margin_mode ? { margin_mode: params.margin_mode } : {}),
    });
    if (params.order_id || params.algo_id) {
      const target = await inspect.call(this, token, params, {
        kind: params.algo_id ? "ALGO" : "ORDER",
        ...(params.algo_id
          ? { algoId: params.algo_id }
          : { order_id: params.order_id }),
      });
      if (target.rows.length !== 1) throw Error("MANUAL_TARGET_NOT_FOUND");
      pre.target = target.rows[0];
    }
    const spec = P.build({...params,...(leverageDependency?{_preparing_dependency:true}:{})}, p.id, pre),
      account = this.account(token, params);
    if(!require('./manual_qualification').qualified(require('node:path').resolve(__dirname,'../..'),C.actionFor(spec)))throw Error('MANUAL_CONTRACT_UNQUALIFIED');
    let risk = null;
    try {
      if (["ORDER", "ALGO"].includes(spec.kind)) {
        const intent = {
          schema: "cp1.trade-intent/1.0",
          source: "supervisor.chatbot.manual",
          mode: "LIVE_GUARDED",
          exchange: "OKX",
          market_type: params.market,
          symbol: params.instrument_candidate,
          action: spec.body.side.toUpperCase(),
          orderType: spec.body.ordType.toUpperCase(),
          ...(spec.body.tgtCcy === "quote_ccy"
            ? { quoteQuantity: +spec.body.sz }
            : { size: +spec.body.sz }),
          metadata: {
            ownerClientId: actor.owner,
            account: params.account,
            plan_id: p.id,
          },
        };
        risk = await this.risk(token, intent);
      }
    } catch (_) {
      risk = null;
    }
    const diagnostics = P.preview(spec, pre, risk);
    Object.assign(out, diagnostics, {
      spec,
      confirmable: true,
      account: params.account,
      environment: "LIVE",
      api_region: account.apiRegion,
      requires_acknowledgement:
        diagnostics.missing_information.length > 0 ||
        diagnostics.warnings.some((x) => x !== "ESTIMATES_NOT_GUARANTEED"),
      initial_values: pre.target || null,
      requested_changes: spec.body,
      qualification: "MANUAL_OWNER_CONFIRMED",
      digest: C.hash({
        source_digest: p.digest,
        account: params.account,
        revision: account.revision,
        spec,
        preview:diagnostics,
      }),
    });
    out.message =
      "LIVE : opération préparée. Vérifie les paramètres exacts, les avertissements et les champs N/C avant confirmation.";
    const row = { id: p.id, ...actor, digest: out.digest },
      data = {
        advanced: true,
        preparation: out,
        spec,
        sourceDigest: p.digest,
        accountRevision: account.revision,
        preflight: pre,
      };
    this.db
      .transaction(() => {
        const old = lookup(this, actor, p.id);
        if(old&&(old.digest!==out.digest||old.owner!==actor.owner||old.session!==actor.session))throw Error("PREPARATION_CONFLICT");
      if (old && old.phase !== "PREPARED")
          throw Error("PREPARATION_ALREADY_CLAIMED");
        save(this, row, data, "PREPARED");
        this.record(row, "AWAITING_CONFIRMATION", {
          spec,
          missing: out.missing_information,
          warnings: out.warnings,
        });
      })
      .immediate();
    return out;
  } catch (e) {
    return {
      ...out,
      reason: /^[A-Z0-9_]+$/.test(e.message)
        ? e.message
        : "MANUAL_PREPARATION_FAILED",
      message:
        "Opération non préparée : " +
        (/^[A-Z0-9_]+$/.test(e.message)
          ? e.message
          : "données techniques indisponibles") +
        ". Aucun ordre envoyé.",
    };
  }
}
async function advancedConfirm(token, input, { parentPlanId = null } = {}) {
  if (
    !input ||
    Object.keys(input).some(
      (k) =>
        ![
          "preparation_id",
          "digest",
          "conversation_id",
          "acknowledge_warnings",
        ].includes(k),
    )
  )
    throw Error("CONFIRMATION_INVALID");
  setup(this);
  const actor = this.actor(token),
    row = lookup(this, actor, input.preparation_id);
  if (!row || row.digest !== input.digest) throw Error("PREPARATION_NOT_FOUND");
  const saved = JSON.parse(row.data),
    p = saved.preparation;
  if (saved.plan) return this.confirmPlan(token, input);
  if(saved.parent_plan_id){
   const parent=lookup(this,actor,saved.parent_plan_id),pd=parent&&JSON.parse(parent.data);
   if(parentPlanId!==saved.parent_plan_id||!pd?.confirmed||pd.preparation.expires_at<=Date.now()||!pd.steps.some(s=>s.preparation.id===row.id&&s.preparation.digest===row.digest))throw Error('PLAN_CONFIRMATION_REQUIRED');
  }else if(parentPlanId)throw Error('PLAN_CONFIRMATION_REQUIRED');
  if (row.phase !== "PREPARED")
    return row.result
      ? JSON.parse(row.result)
      : {
          ok: false,
          status: row.phase,
          execution: "NONE",
          message: "Demande déjà réservée ; aucun renvoi.",
        };
  if (!p.confirmable || p.expires_at <= Date.now())
    return this.rejectConfirmation(row, "PREPARATION_EXPIRED_OR_BLOCKED");
  if (p.requires_acknowledgement && input.acknowledge_warnings !== true)
    return this.rejectConfirmation(
      row,
      "MANUAL_WARNINGS_ACKNOWLEDGEMENT_REQUIRED",
    );
  if (!require("./config").configuration(this.env).live)
    throw Error("LIVE_EXECUTION_DISABLED");
  if (
    this.account(token, p.intent_parameters).revision !== saved.accountRevision
  )
    throw Error("ACCOUNT_CHANGED");
  if(!require('./manual_qualification').qualified(require('node:path').resolve(__dirname,'../..'),C.actionFor(saved.spec)))throw Error('MANUAL_CONTRACT_UNQUALIFIED');
  reserve(this, row, saved);
  let submitted = false;
  try {
    if (!parentPlanId) {
      const confirmation = await this.bridge.bridge(token, {
        target: "supervisor",
        action: "supervisor.chatbot.confirm",
        arguments: {
          preparation_id: row.id,
          digest: saved.sourceDigest,
          ...((input.conversation_id||p.conversation_id)?{conversation_id:input.conversation_id||p.conversation_id}:{}),
          claim: true,
        },
      });
      if (
        confirmation.execution !== "INTENT_CONFIRMED" ||
        confirmation.digest !== saved.sourceDigest
      )
        throw Error("SUPERVISOR_CONFIRMATION_REQUIRED");
    }
    const params = { ...p.intent_parameters, operation: p.operation },
      fresh = await inspect.call(this, token, params, {
        kind: "PREFLIGHT",
        ...(params.margin_mode ? { margin_mode: params.margin_mode } : {}),
      });
    if (saved.preflight.target) {
      const target = await inspect.call(this, token, params, {
        kind: params.algo_id ? "ALGO" : "ORDER",
        ...(params.algo_id
          ? { algoId: params.algo_id }
          : { order_id: params.order_id }),
      });
      fresh.target = target.rows.length === 1 ? target.rows[0] : null;
      if (C.hash(fresh.target) !== C.hash(saved.preflight.target))
        throw Error("MANUAL_TARGET_CHANGED_RECONFIRM_REQUIRED");
    }
    const exact = P.build(params, row.id, fresh);
    if (C.hash(exact) !== C.hash(saved.spec))
      throw Error("MANUAL_PARAMETERS_CHANGED_RECONFIRM_REQUIRED");
    const current = P.preview(exact, fresh, null),
      old = p.current_price;
    if (
      old !== null &&
      current.current_price !== null &&
      Math.abs(current.current_price - old) / old > 0.005
    )
      throw Error("ORDER_CHANGED_RECONFIRM_REQUIRED");
    if (
      p.fee_rate !== current.fee_rate ||
      current.missing_information.some(
        (x) => x !== "risk" && !p.missing_information.includes(x),
      )
    )
      throw Error("MANUAL_INFORMATION_CHANGED_RECONFIRM_REQUIRED");
    const principal = this.sessions.verifySession(token);
    if (
      !principal ||
      this.account(token, p.intent_parameters).revision !==
        saved.accountRevision
    )
      throw Error("ORDER_AUTHORITY_CHANGED");
    const args = {
      exchange: "OKX",
      account: params.account,
      market_type: params.market,
      symbol: params.instrument_candidate,
      spec: saved.spec,
      owner: actor.owner,
      plan_id: row.id,
      confirmation_digest:row.digest,diagnostic_digest:C.hash({warnings:p.warnings,missing:p.missing_information}),
    };
    args.proof = Authority.issue(this.bridge.codec, principal, args);
    const approval=await this.bridge.bridge(token,{target:'risk',action:'risk.manual.authorize',arguments:args});
    if(approval.approved!==true||!approval.risk_approval_id)throw Error('RISK_APPROVAL_REQUIRED');
    args.risk_approval_id=approval.risk_approval_id;
    this.record(row,'RISK_APPROVED',{approval_id:args.risk_approval_id,policy:approval.policy});
    this.db
      .transaction(() => {
        this.db
          .prepare(
            "UPDATE manual_orders SET phase='SUBMITTING',updated=? WHERE id=?",
          )
          .run(Date.now(), row.id);
        this.record(row, "SUBMITTING", {
          spec: saved.spec,
          authorization: "MANUAL_OWNER_CONFIRMED",
          risk_diagnostic_only: true,
        });
      })
      .immediate();
    submitted = true;
    const result = await this.bridge.bridge(token, {
      target: "trading",
      action: C.actionFor(saved.spec),
      arguments: args,
    });
    const status =
      result.status === "UNKNOWN"
        ? "UNKNOWN_RECONCILIATION_REQUIRED"
        : result.status === "ERROR"
          ? "FAILED"
          : result.status;
    let out = {
      ok: result.ok === true,
      status,
      execution: result.ok
        ? "SUBMITTED"
        : status === "UNKNOWN_RECONCILIATION_REQUIRED"
          ? "UNCERTAIN"
          : "NONE",
      order_id: result.exchange_order_id || null,
      plan_id: row.id,
      client_order_id:
        saved.spec.body.clOrdId || saved.spec.body.algoClOrdId || null,
      broker_code: result.broker_code || null,
      items:result.items||null,
      protection_active: false,
      portfolio_recorded: result.portfolio_recorded === true,
      message: result.ok
        ? "Demande acceptée par OKX ; exécution et activation restent à vérifier."
        : status === "UNKNOWN_RECONCILIATION_REQUIRED"
          ? "Réponse inconnue : OKX a peut-être reçu la demande. Réconciliation en cours, aucun renvoi."
          : "Demande refusée. Les demandes indépendantes peuvent continuer.",
    };
    finish(this, row, out);
    if (
      [
        "ACKNOWLEDGED",
        "CANCEL_REQUESTED",
        "AMEND_REQUESTED",
        "UNKNOWN_RECONCILIATION_REQUIRED",
      "BATCH_ACKNOWLEDGED","BATCH_PARTIAL",
      ].includes(status)
    ) {
      out = await this.reconcileAdvanced(token, row.id);
      this.scheduleReconciliation(token, row.id);
    } else if (status === "LEVERAGE_ACKNOWLEDGED") {
      const checked = await inspect.call(this, token, params, {
        kind: "PREFLIGHT",
        margin_mode: params.margin_mode,
        plan_id:row.id,
      });
      const actual = checked.leverage?.filter(
        (x) =>
          x.instId === params.instrument_candidate &&x.mgnMode===params.margin_mode&&
          (!saved.spec.body.posSide || x.posSide === saved.spec.body.posSide),
      );
      if (actual?.length&&actual.every(x=>Number(x.lever)===Number(saved.spec.body.lever)))
        out = finish(this, row, {
          ...out,
          status: "LEVERAGE_VERIFIED",
          verified_leverage: Number(actual[0].lever),
          message:
            "Levier vérifié. Aucune position ouverte par cette opération.",
        });
    }
    return out;
  } catch (e) {
    const uncertain =
        submitted && !require("./messages").isPreSendFailure(e.message),
      out = finish(this, row, {
        ok: false,
        status: uncertain ? "UNKNOWN_RECONCILIATION_REQUIRED" : "FAILED",
        execution: uncertain ? "UNCERTAIN" : "NONE",
        plan_id: row.id,
        reason: /^[A-Z0-9_]+$/.test(e.message)
          ? e.message
          : "MANUAL_EXECUTION_FAILED",
        message: uncertain
          ? "Résultat inconnu, aucun renvoi automatique. Réconciliation nécessaire."
          : "Opération non envoyée : " +
            (/^[A-Z0-9_]+$/.test(e.message)?e.message:"MANUAL_EXECUTION_FAILED") +
            ". Les demandes indépendantes peuvent continuer.",
      });
    if (uncertain) this.scheduleReconciliation(token, row.id);
    return out;
  }
}
async function reconcileAdvanced(token, orderId) {
  setup(this);
  const actor = this.actor(token),
    row = this.db.prepare("SELECT * FROM manual_orders WHERE id=? AND owner=?").get(orderId,actor.owner);
  if (!row) throw Error("PREPARATION_NOT_FOUND");
  const saved = JSON.parse(row.data),
    prior = row.result
      ? JSON.parse(row.result)
      : { ok: false, status: row.phase, plan_id: row.id };
  if(saved.plan)return this.reconcilePlan(token,orderId);
  if (!saved.advanced || TERMINAL.has(prior.status)&&!(prior.status==="FILLED"&&saved.spec.body.attachAlgoOrds&&!prior.protection_active)) return prior;
  const spec = saved.spec,
    p = saved.preparation.intent_parameters,
    algo = spec.kind.includes("ALGO"),
    client = spec.body.clOrdId || spec.body.algoClOrdId,
    targetId = spec.body.ordId || spec.body.algoId || prior.order_id;
  if(spec.kind==='BATCH'){
   const items=[];for(const b of spec.body.orders){try{const r=await inspect.call(this,token,p,{kind:'ORDER',client_id:b.clOrdId,plan_id:row.id});const v=r.rows.length===1?r.rows[0]:null;if(v&&Number(v.accFillSz)>0)await inspect.call(this,token,p,{kind:'FILLS',order_id:v.ordId,plan_id:row.id});items.push({client_order_id:b.clOrdId,order_id:v?.ordId||null,status:mapState(v?.state)||prior.items?.find(x=>x.client_order_id===b.clOrdId)?.status||'UNKNOWN_RECONCILIATION_REQUIRED'});}catch(_){items.push({client_order_id:b.clOrdId,status:'UNKNOWN_RECONCILIATION_REQUIRED'});}}
   const done=items.every(x=>TERMINAL.has(x.status)),out={...prior,items,status:done?'BATCH_COMPLETED':'BATCH_PENDING',terminal:done,message:'Groupe non atomique : consulte chaque résultat.'};if(done)this.db.prepare('DELETE FROM manual_reservations WHERE id=?').run(row.id);return finish(this,row,out);
  }
  if(spec.kind==='LEVERAGE'){
    try{const pre=await inspect.call(this,token,p,{kind:'PREFLIGHT',margin_mode:p.margin_mode,plan_id:row.id});const actual=pre.leverage?.filter(x=>x.instId===p.instrument_candidate&&x.mgnMode===p.margin_mode&&(!spec.body.posSide||x.posSide===spec.body.posSide));if(actual?.length&&actual.every(x=>Number(x.lever)===Number(spec.body.lever)))return finish(this,row,{...prior,ok:true,status:'LEVERAGE_VERIFIED',verified_leverage:Number(actual[0].lever),message:'Levier vérifié. Aucune position ouverte.'});}catch(_){}return prior;
  }
  if (!targetId && !client) return prior;
  try {
    const result = await inspect.call(this, token, p, {
      kind: algo ? "ALGO" : "ORDER",
        plan_id:row.id,
      ...(targetId
        ? algo
          ? { algoId: targetId }
          : { order_id: targetId }
        : { client_id: client }),
    });
    if (result.rows.length !== 1) return prior;
    const broker = result.rows[0];
    if (
      broker.instId !== p.instrument_candidate ||
      (targetId && (algo ? broker.algoId : broker.ordId) !== targetId) ||
      (!targetId && (algo ? broker.algoClOrdId : broker.clOrdId) !== client)
    )
      throw Error("MANUAL_RECONCILIATION_MISMATCH");
    let status = mapState(broker.state);
    let resulting=null;if(algo&&broker.state==='effective'&&broker.ordId){const child=await inspect.call(this,token,p,{kind:'ORDER',order_id:broker.ordId,plan_id:row.id});if(child.rows.length===1){resulting=child.rows[0];status=mapState(resulting.state)||'TRIGGERED';if(Number(resulting.accFillSz)>0)await inspect.call(this,token,p,{kind:'FILLS',order_id:broker.ordId,plan_id:row.id});}}
    if(!algo&&Number(broker.accFillSz)>0)await inspect.call(this,token,p,{kind:'FILLS',order_id:broker.ordId,plan_id:row.id});
    if(!status)return prior;
    if(spec.kind==='AMEND'&&status==='OPEN'&&(spec.body.newPx&&broker.px!==spec.body.newPx||spec.body.newSz&&broker.sz!==spec.body.newSz))return prior;
    if(spec.kind.startsWith('CANCEL')&&['OPEN','PARTIALLY_FILLED'].includes(status))status='CANCEL_REQUESTED';
    const out = {
      ...prior,
      ok: !["REJECTED"].includes(status),
      status,
      order_id: algo?broker.algoId:broker.ordId,
      resulting_order_id:resulting?.ordId||null,
      filled_quantity: numberOrNull(resulting?.accFillSz||broker.accFillSz || broker.actualSz),
      average_price: numberOrNull(resulting?.avgPx||broker.avgPx || broker.actualPx),
      protection_active: algo&&broker.state==='live'&&(broker.ordType!=='move_order_stop'||!broker.activePx||Number(broker.moveTriggerPx)>0),
      parent_order_id:!algo?broker.ordId:null,algo_id:algo?broker.algoId:null,
      protection_status:algo&&broker.state==='live'?'ARMED':'UNVERIFIED',
      attached_protections:[],
      broker_state: broker.state,
      execution: status === "FILLED" ? "FILLED" : "SUBMITTED",
      message: "État vérifié auprès d’OKX : " + status + ".",
      reconciled: true,
    };
    if(!algo&&spec.body.attachAlgoOrds){
      for(const a of broker.attachAlgoOrds||[]){
       if(a.algoId){const read=await inspect.call(this,token,p,{kind:'ALGO',algoId:a.algoId});const actual=read.rows.length===1?read.rows[0]:null;out.attached_protections.push({algo_id:a.algoId,parent_order_id:broker.ordId,state:actual?.state||null,active:broker.state==='filled'&&actual?.state==='live'});}
       else out.attached_protections.push({algo_id:null,parent_order_id:broker.ordId,state:null,active:false});
      }
      out.protection_active=out.attached_protections.length>0&&out.attached_protections.every(x=>x.active);
    }
    if (C.hash(out) !== C.hash(prior)) {
      finish(this, row, out);
      this.record(row, "RECONCILED", {
        status,
        order_id: out.order_id,
        filled_quantity: out.filled_quantity,
      });
    }
    return out;
  } catch (_) {
    this.record(row, "RECONCILIATION_PENDING", {
      reason: "BROKER_STATE_UNAVAILABLE",
    });
    return prior;
  }
}
function numberOrNull(v) {
  return require("../../services/trading-engine/exchange-adapters/okx/account-reader").number(
    v,
  );
}
function scheduleReconciliation(token, orderId) {
  this.reconcilers ||= new Map();
  if (this.reconcilers.has(orderId)) return;
  let attempts = 0;
  const timer = setInterval(async () => {
    if (++attempts > 60) {
      clearInterval(timer);
      this.reconcilers.delete(orderId);
      return;
    }
    try {
      const r = await this.reconcileAdvanced(token, orderId);
      if (TERMINAL.has(r.status)&&!(r.status==="FILLED"&&r.attached_protections&&!r.protection_active)||r.status==="BATCH_COMPLETED") {
        clearInterval(timer);
        this.reconcilers.delete(orderId);
      }
    } catch (_) {
      clearInterval(timer);
      this.reconcilers.delete(orderId);
    }
  }, 3000);
  timer.unref();
  this.reconcilers.set(orderId, timer);
}
module.exports = {
  advancedPrepare,
  advancedConfirm,
  reconcileAdvanced,
  scheduleReconciliation,
  inspect,
  save,
  lookup,
  TERMINAL,
};
