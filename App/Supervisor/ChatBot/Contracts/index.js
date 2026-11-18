"use strict";
const S = require("../../../Core/FunctionRegistry/Control/schema");
const text = { type: "string", minLength: 1, maxLength: 96 },
  positive = { type: "number", exclusiveMinimum: 0 };
const properties = {
  exchange: { enum: ["OKX"] },
  account: text,
  environment: { enum: ["DEMO", "LIVE"] },
  market: { enum: ["SPOT", "MARGIN", "FUTURES", "SWAP", "OPTION"] },
  asset: { type: "string", pattern: "^[A-Z0-9]{2,20}$" },
  quote: { type: "string", pattern: "^[A-Z0-9]{2,20}$" },
  instrument_candidate: { type: "string", pattern: "^[A-Z0-9-]{3,64}$" },
  amount: positive,
  amount_unit: { type: "string", pattern: "^[A-Z0-9]{2,20}$" },
  order_type: { enum: ["MARKET", "LIMIT", "POST_ONLY", "IOC", "FOK"] },
  limit_price: positive,
  trigger_price: positive,
  stop_loss: positive,
  take_profit: positive,
  order_id: text,
  position_id: text,
  position_side: { enum: ["LONG", "SHORT"] },
  close_fraction: { type: "number", exclusiveMinimum: 0, maximum: 1 },
  leverage: { type: "number", minimum: 1, maximum: 125 },
  timeframe: { enum: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] },
};
Object.assign(properties,{margin_currency:text,margin_mode:{enum:['cross','isolated']},side:{enum:['BUY','SELL']},algo_id:text,algo_type:{enum:['conditional','oco','trigger','move_order_stop']},callback_ratio:{type:'number',exclusiveMinimum:0,exclusiveMaximum:1},callback_spread:positive,activation_price:positive,trigger_price_type:{enum:['last','mark','index']},trigger_order_price:{type:'number'},take_profit_order_price:{type:'number'},stop_loss_order_price:{type:'number'},trade_quote_currency:text});
const childProperties={...properties};properties.steps={type:'array',minItems:1,maxItems:20,items:{type:'object',required:['intent_id','parameters','depends_on'],properties:{intent_id:{enum:['trading.buy','trading.sell','positions.open','positions.close','orders.cancel','orders.amend','algorithms.place','account.leverage']},parameters:{type:'object',properties:childProperties,additionalProperties:false},depends_on:{type:'array',maxItems:20,items:{type:'integer',minimum:0,maximum:19}}},additionalProperties:false}};
const parameters = { type: "object", properties, additionalProperties: false };
function validate(intent, catalog) {
  if (
    !intent ||
    typeof intent !== "object" ||
    Object.keys(intent).some(
      (k) => !["intent_id", "parameters", "reply"].includes(k),
    ) ||
    typeof intent.intent_id !== "string" ||
    (intent.intent_id !== "UNKNOWN" && !catalog.get(intent.intent_id))
  )
    throw Error("INTENT_UNKNOWN");
  const error = S.validate(intent.parameters || {}, parameters);
  if (error) throw Error("INTENT_PARAMETERS_INVALID");
  const p = intent.parameters || {},
    parts = p.instrument_candidate?.split("-");
  if (
    parts &&
    ((p.asset && p.asset !== parts[0]) || (p.quote && p.quote !== parts[1]))
  )
    throw Error("INTENT_INSTRUMENT_MISMATCH");
  if (
    intent.reply !== undefined &&
    (typeof intent.reply !== "string" || intent.reply.length > 3000)
  )
    throw Error("INTENT_REPLY_INVALID");
  return {
    intent_id: intent.intent_id,
    parameters: { ...(intent.parameters || {}) },
    reply: intent.reply || "",
  };
}
function settings(input) {
  const value = { mode: "HYBRID", autoFallback: false, ...input };
  if (
    S.validate(value, {
      type: "object",
      required: ["mode", "autoFallback"],
      properties: {
        mode: { enum: ["LOCAL", "HYBRID", "OPENAI"] },
        autoFallback: { type: "boolean" },
      },
      additionalProperties: false,
    })
  )
    throw Error("CHATBOT_SETTINGS_INVALID");
  return value;
}
function modelSchema() {
  return {
    type: "object",
    properties: {
      intent_id: { type: "string" },
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(properties).map(([k, v]) => [
            k,
            v.enum
              ? { ...v, type: ["string", "null"], enum: [...v.enum, null] }
              : { ...v, type: [v.type, "null"] },
          ]),
        ),
        required: Object.keys(properties),
        additionalProperties: false,
      },
      reply: { type: "string" },
    },
    required: ["intent_id", "parameters", "reply"],
    additionalProperties: false,
  };
}
function fromModel(value, catalog) {
  if (!value || !value.parameters || typeof value.parameters !== "object")
    throw Error("INTENT_PARAMETERS_INVALID");
  return validate(
    {
      ...value,
      parameters: Object.fromEntries(
        Object.entries(value.parameters).filter(([, v]) => v !== null),
      ),
    },
    catalog,
  );
}
module.exports = {
  parameters,
  properties,
  validate,
  settings,
  modelSchema,
  fromModel,
};
