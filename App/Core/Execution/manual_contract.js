"use strict";
const CP = require("../Communication/communication_protocol_v1");
const KINDS = [
  "ORDER",
  "ALGO",
  "CANCEL",
  "AMEND",
  "CANCEL_ALGO",
  "AMEND_ALGO",
  "LEVERAGE",
  "BATCH",
];
const READ_INTENTS = Object.freeze({
  'orders.status': 'ORDER',
  'orders.fills': 'FILLS',
  'orders.history': 'HISTORY',
  'algorithms.status': 'ALGO'
});
const MARKETS = ["SPOT", "MARGIN", "SWAP", "FUTURES"];
const FIELDS = [
  "instId",
  "tdMode",
  "clOrdId",
  "side",
  "ordType",
  "sz",
  "px",
  "tgtCcy",
  "banAmend",
  "reduceOnly",
  "posSide",
  "ccy",
  "tpTriggerPx",
  "tpOrdPx",
  "slTriggerPx",
  "slOrdPx",
  "tpTriggerPxType",
  "slTriggerPxType",
  "callbackRatio",
  "callbackSpread",
  "activePx",
  "triggerPx",
  "triggerPxType",
  "orderPx",
  "algoClOrdId",
  "algoId",
  "ordId",
  "newSz",
  "newPx",
  "newTpTriggerPx",
  "newTpOrdPx",
  "newSlTriggerPx",
  "newSlOrdPx",
  "cxlOnFail",
  "lever",
  "mgnMode",
  "tradeQuoteCcy",
  "attachAlgoOrds",
  "newTriggerPx",
  "newOrdPx",
];
function decimal(v, { zero = false, market = false } = {}) {
  if (market && (v === -1 || v === "-1")) return "-1";
  const s = String(v);
  if(s.length>64)throw Error("MANUAL_NUMERIC_PRECISION_INVALID");
  if (
    !/^\d+(?:\.\d+)?$/.test(s) ||
    !Number.isFinite(+s) ||
    (zero ? +s < 0 : +s <= 0)
  )
    throw Error("MANUAL_NUMERIC_INVALID");
  return s;
}
function validate(spec) {
  if (
    !spec ||
    Object.keys(spec).some(
      (k) => !["kind", "market", "body", "position_id","valuation"].includes(k),
    ) ||
    !KINDS.includes(spec.kind) ||
    !MARKETS.includes(spec.market) ||
    !spec.body ||
    typeof spec.body !== "object" ||
    Array.isArray(spec.body)
  )
    throw Error("MANUAL_CONTRACT_INVALID");
  if(spec.valuation){const v=spec.valuation;if(Object.keys(v).sort().join(',')!=='contract_type,contract_value,contract_value_currency'||v.contract_type!=='linear'||!/^[-A-Z0-9]{2,20}$/.test(v.contract_value_currency||''))throw Error('MANUAL_VALUATION_INVALID');decimal(v.contract_value);}
  if(spec.kind==='BATCH'){
   const b=spec.body;if(Object.keys(b).some(k=>!['instId','orders'].includes(k))||!Array.isArray(b.orders)||b.orders.length<1||b.orders.length>20)throw Error('MANUAL_BATCH_INVALID');
   const ids=new Set();for(const item of b.orders){validate({kind:'ORDER',market:spec.market,body:item});if(item.instId!==b.instId||ids.has(item.clOrdId))throw Error('MANUAL_BATCH_SCOPE_INVALID');ids.add(item.clOrdId);}
   return JSON.parse(JSON.stringify(spec));
  }
  const b = spec.body;
  const fields={ORDER:['instId','tdMode','clOrdId','side','ordType','sz','px','tgtCcy','banAmend','reduceOnly','posSide','ccy','tradeQuoteCcy','attachAlgoOrds'], ALGO:['tgtCcy','instId','tdMode','algoClOrdId','side','ordType','sz','reduceOnly','posSide','ccy','tpTriggerPx','tpOrdPx','slTriggerPx','slOrdPx','tpTriggerPxType','slTriggerPxType','callbackRatio','callbackSpread','activePx','triggerPx','triggerPxType','orderPx','tradeQuoteCcy'],CANCEL:['instId','ordId'],AMEND:['instId','ordId','newSz','newPx','cxlOnFail'],CANCEL_ALGO:['tgtCcy','instId','algoId'],AMEND_ALGO:['tgtCcy','instId','algoId','newSz','newTpTriggerPx','newTpOrdPx','newSlTriggerPx','newSlOrdPx','newTriggerPx','newOrdPx','cxlOnFail'],LEVERAGE:['instId','lever','mgnMode','ccy','posSide']};
  if(Object.keys(b).some(k=>!fields[spec.kind].includes(k)))throw Error('MANUAL_FIELD_NOT_APPLICABLE');
  if(spec.kind==='ORDER'&&b.ordType==='market'&&b.px!==undefined)throw Error('MANUAL_PRICE_NOT_APPLICABLE');
  for(const k of ['reduceOnly','banAmend','cxlOnFail'])if(b[k]!==undefined&&typeof b[k]!=='boolean')throw Error('MANUAL_BOOLEAN_INVALID');
  if(spec.kind==='ALGO'){
   const extras={move_order_stop:['callbackRatio','callbackSpread','activePx'],trigger:['triggerPx','triggerPxType','orderPx'],conditional:['tpTriggerPx','tpOrdPx','slTriggerPx','slOrdPx','tpTriggerPxType','slTriggerPxType'],oco:['tpTriggerPx','tpOrdPx','slTriggerPx','slOrdPx','tpTriggerPxType','slTriggerPxType']}[b.ordType]||[];
   const common=['tgtCcy','instId','tdMode','algoClOrdId','side','ordType','sz','reduceOnly','posSide','ccy','tradeQuoteCcy'];
   if(Object.keys(b).some(k=>!common.includes(k)&&!extras.includes(k)))throw Error('MANUAL_ALGO_FIELD_NOT_APPLICABLE');
  }
  if (
    Object.keys(b).some((k) => !FIELDS.includes(k)) ||
    !/^[-A-Z0-9]{3,64}$/.test(b.instId || "")
  )
    throw Error("MANUAL_BODY_INVALID");
  if (spec.kind === "ORDER" || spec.kind === "ALGO") {
    if (
      !["buy", "sell"].includes(b.side) ||
      !["cash", "cross", "isolated"].includes(b.tdMode)
    )
      throw Error("MANUAL_ORDER_MODE_INVALID");
    if (
      (spec.market === "SPOT" && b.tdMode !== "cash") ||
      (spec.market !== "SPOT" && b.tdMode === "cash")
    )
      throw Error("MANUAL_ORDER_MODE_INVALID");
    decimal(b.sz);
    if (
      !/^[a-zA-Z0-9]{1,32}$/.test(
        (spec.kind === "ORDER" ? b.clOrdId : b.algoClOrdId) || "",
      )
    )
      throw Error("MANUAL_CLIENT_ID_INVALID");
    if (spec.kind === "ORDER") {
      if (!["market", "limit", "post_only", "ioc", "fok"].includes(b.ordType))
        throw Error("MANUAL_TYPE_INVALID");
      if (b.ordType !== "market") decimal(b.px);
      if (
        b.tgtCcy &&
        !(
          spec.market === "SPOT" &&
          b.ordType === "market" &&
          ["base_ccy", "quote_ccy"].includes(b.tgtCcy)
        )
      )
        throw Error("MANUAL_UNIT_INVALID");
    } else {
      if (
        !["conditional", "oco", "trigger", "move_order_stop"].includes(
          b.ordType,
        )
      )
        throw Error("MANUAL_TYPE_INVALID");
      if (b.ordType === "move_order_stop") {
        if ((b.callbackRatio != null) === (b.callbackSpread != null))
          throw Error("MANUAL_CALLBACK_REQUIRED");
        if (b.callbackRatio != null && +decimal(b.callbackRatio) >= 1)
          throw Error("MANUAL_CALLBACK_INVALID");
        if (b.callbackSpread != null) decimal(b.callbackSpread);
        if (b.activePx != null) decimal(b.activePx);
      } else if (b.ordType === "trigger") {
        decimal(b.triggerPx);
        decimal(b.orderPx, { market: true });
      } else {
        if (b.tpTriggerPx == null && b.slTriggerPx == null)
          throw Error("MANUAL_PROTECTION_REQUIRED");
        if (
          b.ordType === "oco" &&
          (b.tpTriggerPx == null || b.slTriggerPx == null)
        )
          throw Error("MANUAL_OCO_REQUIRED");
        if (
          b.ordType === "conditional" &&
          b.tpTriggerPx != null &&
          b.slTriggerPx != null
        )
          throw Error("MANUAL_TPSL_REQUIRES_OCO");
        for (const prefix of ["tp", "sl"])
          if (b[prefix + "TriggerPx"] != null) {
            decimal(b[prefix + "TriggerPx"]);
            decimal(b[prefix + "OrdPx"], { market: true });
          }
      }
    }
  } else if (spec.kind === "LEVERAGE") {
    if (spec.market === "SPOT" || !["cross", "isolated"].includes(b.mgnMode))
      throw Error("MANUAL_LEVERAGE_MODE_INVALID");
    decimal(b.lever);
  } else {
    const algo = spec.kind.endsWith("ALGO");
    if (!/^[0-9]{1,64}$/.test(b[algo ? "algoId" : "ordId"] || ""))
      throw Error("MANUAL_TARGET_REQUIRED");
    if (spec.kind === "AMEND" && !b.newSz && !b.newPx)
      throw Error("MANUAL_AMEND_EMPTY");
    if (
      spec.kind === "AMEND_ALGO" &&
      !["newSz", "newTpTriggerPx", "newSlTriggerPx","newTriggerPx"].some((k) => b[k] != null)
    )
      throw Error("MANUAL_AMEND_EMPTY");
    for (const k of ["newSz", "newPx", "newTpTriggerPx", "newSlTriggerPx"])
      if (b[k] != null) decimal(b[k], { zero: k !== "newSz" && k !== "newPx" });
  }
  if (b.posSide && !["net", "long", "short"].includes(b.posSide))
    throw Error("MANUAL_POSITION_MODE_INVALID");
  for (const k of ["tpTriggerPxType", "slTriggerPxType", "triggerPxType"])
    if (b[k] && !["last", "index", "mark"].includes(b[k]))
      throw Error("MANUAL_TRIGGER_TYPE_INVALID");
  if (b.attachAlgoOrds) {
    if (!Array.isArray(b.attachAlgoOrds) || b.attachAlgoOrds.length !== 1)
      throw Error("MANUAL_ATTACHED_INVALID");
    const a = b.attachAlgoOrds[0];
    if (
      Object.keys(a).some(
        (k) =>
          ![
            "attachAlgoClOrdId",
            "tpTriggerPx",
            "tpOrdPx",
            "slTriggerPx",
            "slOrdPx",
            "tpTriggerPxType",
            "slTriggerPxType",
          ].includes(k),
      )
    )
      throw Error("MANUAL_ATTACHED_INVALID");
    for (const prefix of ["tp", "sl"])
      if (a[prefix + "TriggerPx"] != null) {
        decimal(a[prefix + "TriggerPx"]);
        decimal(a[prefix + "OrdPx"], { market: true });
      }
  }
  return JSON.parse(JSON.stringify(spec));
}
function canonical(input) {
  if (
    !input ||
    input.exchange !== "OKX" ||
    !input.account ||
    typeof input.account !== "string" ||
    !input.spec
  )
    throw Error("MANUAL_ENVELOPE_INVALID");
  const spec = validate(input.spec);
  if (input.symbol !== spec.body.instId || input.market_type !== spec.market)
    throw Error("MANUAL_BINDING_MISMATCH");
  return {
    exchange: "OKX",
    account: input.account,
    market_type: spec.market,
    symbol: input.symbol,
    spec,
  };
}
function endpoint(s) {
  return {
    ORDER: "/api/v5/trade/order",
    BATCH: "/api/v5/trade/batch-orders",
    ALGO: "/api/v5/trade/order-algo",
    CANCEL: "/api/v5/trade/cancel-order",
    AMEND: "/api/v5/trade/amend-order",
    CANCEL_ALGO: "/api/v5/trade/cancel-algos",
    AMEND_ALGO: "/api/v5/trade/amend-algos",
    LEVERAGE: "/api/v5/account/set-leverage",
  }[s.kind];
}
function hash(v) {
  return CP.hashData(v);
}
const ACTIONS={"BATCH":"trading.manual.batch","ORDER": "trading.manual.order", "ALGO": "trading.manual.algo", "CANCEL": "trading.manual.cancel", "AMEND": "trading.manual.amend", "CANCEL_ALGO": "trading.manual.cancel_algo", "AMEND_ALGO": "trading.manual.amend_algo", "LEVERAGE": "trading.manual.leverage"};
function actionFor(s){validate(s);return ACTIONS[s.kind];}
function isAction(a){return Object.values(ACTIONS).includes(a);}
module.exports = { ACTIONS,READ_INTENTS,actionFor,isAction,
  validate,
  canonical,
  decimal,
  endpoint,
  hash,
  KINDS,
  MARKETS,
};
