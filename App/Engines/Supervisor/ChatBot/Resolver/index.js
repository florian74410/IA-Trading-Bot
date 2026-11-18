"use strict";
const { normalize } = require("../catalog"),
  Contracts = require("../Contracts");
const aliases = {
  bitcoin: "BTC",
  btc: "BTC",
  ethereum: "ETH",
  ether: "ETH",
  eth: "ETH",
  solana: "SOL",
  sol: "SOL",
  dogecoin: "DOGE",
  doge: "DOGE",
};
function parameters(text, accounts = []) {
  const n = normalize(text),
    upper = text.toUpperCase(),
    p = {};
  if (/(?:^|\s)-\d+(?:[.,]\d+)?(?:\s|$)/.test(n))
    throw Error("INTENT_PARAMETERS_INVALID");
  if (/\bokx\b/.test(n)) p.exchange = "OKX";
  if (/\b(demo|simulation|paper)\b/.test(n)) p.environment = "DEMO";
  if (/\b(live|reel|real)\b/.test(n)) p.environment = "LIVE";
  for (const [word, value] of [
    ["spot", "SPOT"],
    ["margin", "MARGIN"],
    ["marge", "MARGIN"],
    ["futures", "FUTURES"],
    ["swap", "SWAP"],
    ["perpetuel", "SWAP"],
    ["option", "OPTION"],
  ])
    if (new RegExp("\\b" + word + "\\b").test(n)) p.market = value;
  if (/\b(limit|limite)\b/.test(n)) p.order_type = "LIMIT";
  if (/\b(market|au marche)\b/.test(n)) p.order_type = "MARKET";
  if (/\blong\b/.test(n)) p.position_side = "LONG";
  if (/\bshort\b/.test(n)) p.position_side = "SHORT";
  let m = upper.match(
    /\b([A-Z0-9]{2,12})\s*[-\/]\s*(USDT|USDC|USD|EUR|BTC|ETH)(?:-(SWAP|\d{6}(?:-\d+(?:\.\d+)?-[CP])?))?\b/,
  );
  if (m) {
    p.asset = m[1];
    p.quote = m[2];
    p.instrument_candidate = m[1] + "-" + m[2] + (m[3] ? "-" + m[3] : "");
  }
  if (!p.asset) {
    const compact = upper.match(/\b([A-Z0-9]{2,12})(USDT|USDC|USD|EUR)\b/);
    if (compact) {
      p.asset = compact[1];
      p.quote = compact[2];
      p.instrument_candidate = compact[1] + "-" + compact[2];
    }
  }
  for (const [word, value] of Object.entries(aliases))
    if (new RegExp("\\b" + word + "\\b").test(n) && !p.asset) p.asset = value;
  if (!p.asset) {
    const candidates = (text.match(/\b[A-Z][A-Z0-9]{1,9}\b/g) || []).filter(
      (x) =>
        ![
          "OKX",
          "USDT",
          "USDC",
          "USD",
          "EUR",
          "SPOT",
          "LONG",
          "SHORT",
          "DEMO",
          "LIVE",
          "MARKET",
          "LIMIT",
          "SWAP",
          "FUTURES",
          "OPTION",
          "BUY",
          "SELL",
          "DE",
          "DU",
          "SUR",
          "MON",
          "MA",
          "LES",
          "MES",
          "ACHETE",
          "VENDS",
        ].includes(x),
    );
    if (candidates.length === 1) p.asset = candidates[0];
  }
  m = [
    ...upper.matchAll(
      /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(USDT|USDC|USD|EUR|BTC|ETH|SOL|DOGE)\b/g,
    ),
  ].find(
    (x) =>
      !/(?:prix(?: limite)?(?: de| a)?|price|limit(?:e)?|trigger|declencheur|stop.loss|take.profit|levier|leverage|at|a)\s*$/.test(
        normalize(text.slice(Math.max(0, x.index - 35), x.index)),
      ),
  );
  if (m) {
    p.amount = Number(m[1].replace(",", "."));
    p.amount_unit = m[2];
    if (["USDT", "USDC", "USD", "EUR"].includes(m[2]) && !p.quote)
      p.quote = m[2];
  }
  m = n.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) p.close_fraction = Number(m[1].replace(",", ".")) / 100;
  m = n.match(
    /(?:prix(?: limite)?|price|a)\s+(?:(?:de|a)\s+)?(\d+(?:[.,]\d+)?)/,
  );
  if (m) p.limit_price = Number(m[1].replace(",", "."));
  m = n.match(/(?:declencheur|trigger)\s+(\d+(?:[.,]\d+)?)/);
  if (m) p.trigger_price = Number(m[1].replace(",", "."));
  m = n.match(/(?:stop.loss|stop loss)\s*(?:a|de)?\s*(\d+(?:[.,]\d+)?)/);
  if (m) p.stop_loss = Number(m[1].replace(",", "."));
  m = n.match(/(?:take.profit|take profit)\s*(?:a|de)?\s*(\d+(?:[.,]\d+)?)/);
  if (m) p.take_profit = Number(m[1].replace(",", "."));
  m = n.match(/(?:levier|leverage)\s*(?:a|de|x)?\s*(\d+(?:[.,]\d+)?)/);
  if (m) p.leverage = Number(m[1].replace(",", "."));
  m = n.match(/\b(1m|5m|15m|30m|1h|4h|1d)\b/);
  if (m) p.timeframe = m[1];
  m = n.match(/(?:ordre|order)(?:\s+(?:id|numero|n))?\s+#?([0-9]{3,64})\b/);
  if (m) p.order_id = m[1];
  m = n.match(/(?:position)(?:\s+(?:id|numero|n))?\s+#?([0-9]{3,64})\b/);
  if (m) p.position_id = m[1];
  const a = accounts.filter((a) => n.includes(normalize(a.id)));
  if (a.length === 1) p.account = a[0].id;
  if (p.asset && p.quote && !p.instrument_candidate)
    p.instrument_candidate = p.asset + "-" + p.quote;
  return require("./advanced").extend(text,p);
}
class Resolver {
  constructor(catalog) {
    this.catalog = catalog;
  }
  resolve(text, { pending = null, accounts = [] } = {}) {
    const n = normalize(text);
    const [analysis, proposal] = n.split(/\s+puis propose(?:r)?\s+/);
    if (proposal && this.catalog.get("market.cross_analysis")?.matchers.some(r => r.test(analysis))) {
      return {...Contracts.validate({intent_id:"market.cross_analysis",parameters:parameters(text,accounts)},this.catalog),status:"RECOGNIZED"};
    }
    if(/\b(puis|ensuite|independamment)\b/.test(n)){
     const parts=text.split(/\b(puis|ensuite|indépendamment|independamment)\b/i),steps=[];
     for(let i=0;i<parts.length;i+=2){const r=this.resolve(parts[i],{accounts});if(!require('../procedures').financial.has(r.intent_id)||r.intent_id==='plans.execute')return {intent_id:'UNKNOWN',parameters:{},status:'AMBIGUOUS'};steps.push({intent_id:r.intent_id,parameters:r.parameters,depends_on:i&& !/ind.pendamment/i.test(parts[i-1])?[steps.length-1]:[]});}
     const shared=parameters(text,accounts),first=steps[0].parameters,batch=/\b(batch|groupe|lot)\b/.test(n),parametersOut={steps,...(shared.account?{account:shared.account}:{}),...(shared.environment?{environment:shared.environment}:{}),...(batch&&first.market?{market:first.market,instrument_candidate:first.instrument_candidate}:{})};return Contracts.validate({intent_id:batch?'orders.batch':'plans.execute',parameters:parametersOut},this.catalog);
    }
    if (
      (/\blong\b/.test(n) && /\bshort\b/.test(n)) ||
      (/\bspot\b/.test(n) && /\b(swap|futures|perpetuel)\b/.test(n))
    )
      return { intent_id: "UNKNOWN", parameters: {}, status: "AMBIGUOUS" };
    if (
      /\b(demo|simulation|paper)\b/.test(
        accounts.reduce((v, a) => v.replace(normalize(a.id), ""), n),
      ) &&
      /\b(live|reel|real)\b/.test(n)
    )
      return { intent_id: "UNKNOWN", parameters: {}, status: "AMBIGUOUS" };
    const actions = [
      /\b(achete|acheter|buy|purchase)\b/,
      /\b(vends|vendre|sell)\b/,
      /\b(annule|annuler|cancel)\b/,
      /\b(modifie|modifier|amend)\b/,
    ].filter((r) => r.test(n));
    if (actions.length > 1)
      return { intent_id: "UNKNOWN", parameters: {}, status: "AMBIGUOUS" };
    const advanced=require("./advanced").special(n);
    if(advanced)return {...Contracts.validate({intent_id:advanced,parameters:parameters(text,accounts)},this.catalog),status:"RECOGNIZED"};
    const exact = this.catalog.exactOperation(text);
    if (exact)
      return { intent_id: exact.id, parameters: {}, status: "RECOGNIZED" };
    if (/\b(ne |n'|do not |don't ).*\b(pas|buy|sell|acheter|vendre)\b/.test(n))
      return { intent_id: "UNKNOWN", parameters: {}, status: "AMBIGUOUS" };
    let matches = this.catalog.common.filter((i) =>
      i.matchers.some((r) => r.test(n)),
    );
    const ids = matches.map((i) => i.id);
    if (ids.includes("market.cross_analysis") && !actions.length)
      matches = matches.filter((i) => i.id === "market.cross_analysis");
    else if (ids.includes("positions.open"))
      matches = matches.filter((i) => i.id === "positions.open");
    else if (ids.includes("positions.close"))
      matches = matches.filter((i) => i.id === "positions.close");
    else if (ids.some((id) => ["orders.cancel", "orders.amend"].includes(id)))
      matches = matches.filter((i) =>
        ["orders.cancel", "orders.amend"].includes(i.id),
      );
    else if (ids.includes("risk.evaluate"))
      matches = matches.filter((i) => i.id === "risk.evaluate");
    else if (ids.includes("market.book"))
      matches = matches.filter((i) => i.id === "market.book");
    else if (ids.includes("account.fees"))
      matches = matches.filter((i) => i.id === "account.fees");
    const financial = matches.filter((i) =>
      ["trading.buy", "trading.sell"].includes(i.id),
    );
    if (financial.length === 1) matches = financial;
    if (matches.length > 1)
      return { intent_id: "UNKNOWN", parameters: {}, status: "AMBIGUOUS" };
    const extracted = parameters(text, accounts);
    if (!matches.length && pending && Object.keys(extracted).length) {
      const merged = { ...pending.parameters, ...extracted };
      if (extracted.asset && extracted.asset !== pending.parameters.asset) {
        if (!extracted.instrument_candidate) {
          delete merged.instrument_candidate;
          if (merged.market === "SPOT" && merged.quote)
            merged.instrument_candidate = extracted.asset + "-" + merged.quote;
        }
        for (const k of [
          "limit_price",
          "trigger_price",
          "stop_loss",
          "take_profit",
        ])
          if (extracted[k] === undefined) delete merged[k];
        if (
          pending.parameters.amount_unit === pending.parameters.asset &&
          extracted.amount === undefined
        ) {
          delete merged.amount;
          delete merged.amount_unit;
        }
      }
      return {
        ...Contracts.validate(
          { intent_id: pending.intent_id, parameters: merged },
          this.catalog,
        ),
        status: "FOLLOW_UP",
      };
    }
    if (!matches.length)
      return { intent_id: "UNKNOWN", parameters: {}, status: "UNKNOWN" };
    return {
      ...Contracts.validate(
        { intent_id: matches[0].id, parameters: extracted },
        this.catalog,
      ),
      status: "RECOGNIZED",
    };
  }
}
module.exports = { Resolver, parameters };
