"use strict";
const crypto = require("node:crypto"),
  C = require("../../../../Core/Execution/manual_contract"),
  { HOSTS, number } = require("./account-reader");
const READS = new Set([
  "/api/v5/account/instruments",
  "/api/v5/account/config",
  "/api/v5/account/balance",
  "/api/v5/account/positions",
  "/api/v5/account/trade-fee",
  "/api/v5/account/leverage-info",
  "/api/v5/account/max-avail-size",
  "/api/v5/market/ticker",
  "/api/v5/public/funding-rate",
  "/api/v5/trade/order",
  "/api/v5/trade/fills",
  "/api/v5/trade/orders-history",
  "/api/v5/trade/order-algo",
  "/api/v5/trade/orders-algo-history",
]);
async function client(ctx) {
  const s = await ctx.secretProvider.get("OKX"),
    key = s.api_key || s.apiKey,
    secret = s.api_secret || s.apiSecret || s.secret,
    host = HOSTS[s.apiRegion || "GLOBAL"];
  if (!key || !secret || !s.passphrase || !host)
    throw Error("TRADING_CREDENTIALS_INCOMPLETE");
  return async (method, path, body = null, params = {}) => {
    if (method === "GET" && !READS.has(path))
      throw Error("OKX_READ_PATH_DENIED");
    const query = new URLSearchParams(params).toString(),
      p = path + (query ? "?" + query : ""),
      raw = body === null ? "" : JSON.stringify(body),
      at = new Date().toISOString(),
      headers = {
        "OK-ACCESS-KEY": key,
        "OK-ACCESS-PASSPHRASE": s.passphrase,
        "OK-ACCESS-TIMESTAMP": at,
        "OK-ACCESS-SIGN": crypto
          .createHmac("sha256", secret)
          .update(at + method + p + raw)
          .digest("base64"),
      };
    if (s.demoMode || s.demo_mode) headers["x-simulated-trading"] = "1";
    await ctx.revalidate?.();
    const res = await ctx.transport({
      method,
      url: "https://" + host + p,
      headers,
      ...(body !== null ? { body: raw } : {}),
      timeoutMs: 4000,
      maxBytes: 2 * 1024 * 1024,
    });
    await ctx.revalidate?.();
    return res;
  };
}
function rows(r) {
  if (
    r?.statusCode < 200 ||
    r?.statusCode >= 300 ||
    String(r?.body?.code) !== "0" ||
    !Array.isArray(r.body.data)
  )
    throw Error("OKX_MANUAL_READ_UNAVAILABLE");
  return r.body.data;
}
async function inspect(input, ctx) {
  const q = input.query || {},
    get = await client(ctx),
    call = async (p, a = {}) => rows(await get("GET", p, null, a));
  if (
    q.kind === "ORDER" ||
    q.kind === "FILLS" ||
    q.kind === "ALGO" ||
    q.kind === "HISTORY"
  ) {
    const path = {
        ORDER: "/api/v5/trade/order",
        FILLS: "/api/v5/trade/fills",
        ALGO: "/api/v5/trade/order-algo",
        HISTORY: "/api/v5/trade/orders-history",
      }[q.kind],
      args =
        q.kind === "ALGO"
          ? {
              ...(q.algoId
                ? { algoId: q.algoId }
                : { algoClOrdId: q.client_id }),
            }
          : {
              instId: input.symbol,
              ...(q.order_id
                ? { ordId: q.order_id }
                : q.client_id
                  ? { clOrdId: q.client_id }
                  : {}),
            };
    if (q.kind !== "HISTORY" && !q.order_id && !q.client_id && !q.algoId)
      throw Error("MANUAL_TARGET_REQUIRED");
    if(["FILLS","HISTORY"].includes(q.kind)){args.instType=input.market_type;delete args.clOrdId;}
    return {
      ok: true,
      kind: q.kind,
      rows: await call(path, args),
      observed_at: Date.now(),
    };
  }
  if (q.kind !== "PREFLIGHT") throw Error("MANUAL_QUERY_INVALID");
  const [instruments, config] = await Promise.all([
    call("/api/v5/account/instruments", {
      instType: input.market_type,
      instId: input.symbol,
    }),
    call("/api/v5/account/config"),
  ]);
  const instrument = instruments.find(
    (i) =>
      i.instId === input.symbol &&
      i.instType === input.market_type &&
      i.state === "live",
  );
  if (!instrument || config.length !== 1)
    throw Error("OKX_ACCOUNT_INSTRUMENT_UNAVAILABLE");
  const warnings = [],
    optional = async (key, path, args = {}) => {
      try {
        return await call(path, args);
      } catch (_) {
        warnings.push(key);
        return null;
      }
    };
  const [balances, positions, fees, ticker, leverage, funding] =
    await Promise.all([
      optional("balance", "/api/v5/account/balance"),
      optional("positions", "/api/v5/account/positions", {
        instId: input.symbol,
      }),
      optional("fees", "/api/v5/account/trade-fee", {
        instType: input.market_type,
        ...(input.market_type === "SPOT" || input.market_type === "MARGIN"
          ? { instId: input.symbol }
          : { instFamily: instrument.instFamily }),
      }),
      optional("price", "/api/v5/market/ticker", { instId: input.symbol }),
      input.market_type === "SPOT"
        ? null
        : optional("leverage", "/api/v5/account/leverage-info", {
            instId: input.symbol,
            mgnMode: q.margin_mode || "cross",
          }),
      input.market_type === "SWAP"
        ? optional("funding", "/api/v5/public/funding-rate", {
            instId: input.symbol,
          })
        : null,
    ]);
  return {
    ok: true,
    kind: "PREFLIGHT",
    instrument,
    configuration: { acctLv: config[0].acctLv, posMode: config[0].posMode },
    balances,
    positions,
    fees,
    ticker,
    leverage,
    funding,
    missing: warnings,
    observed_at: Date.now(),
  };
}
async function execute(input, ctx) {
  if (!ctx.liveExecutionEnabled) throw Error("LIVE_EXECUTION_DISABLED");
  const spec = C.validate(input.spec),
    send = await client(ctx),
    body = spec.kind === "CANCEL_ALGO" ? [spec.body] : spec.kind==="BATCH"?spec.body.orders:spec.body;
  const r = await send("POST", C.endpoint(spec), body),
    a = r?.body?.data,
    first = Array.isArray(a) && a.length === 1 ? a[0] : null,
    http = r?.statusCode >= 200 && r?.statusCode < 300,
    code = String(r?.body?.code ?? ""),
    sc = first?.sCode == null ? null : String(first.sCode),
    id = first?.ordId || first?.algoId || null;
  if(spec.kind==='BATCH'){
   const items=Array.isArray(a)?a:[];const valid=http&&items.length===body.length&&items.every((x,i)=>x.clOrdId===body[i].clOrdId&&/^\d+$/.test(String(x.sCode)));
   const results=body.map((b,i)=>{const r=valid?items[i]:null,accepted=!!(r&&r.sCode==='0'&&r.ordId);return {client_order_id:b.clOrdId,order_id:r?.ordId||null,status:accepted?'ACKNOWLEDGED':r&&r.sCode!=='50004'?'REJECTED':'UNKNOWN_RECONCILIATION_REQUIRED',broker_code:r?.sCode||null};});
   return {ok:results.every(x=>x.status==='ACKNOWLEDGED'),status:results.some(x=>x.status==='UNKNOWN_RECONCILIATION_REQUIRED')?'UNKNOWN':results.some(x=>x.status==='REJECTED')?'BATCH_PARTIAL':'BATCH_ACKNOWLEDGED',items:results,exchange_order_id:null};
  }
  const definitive=code!=="0"&&code!=="50004"&&/^\d+$/.test(code)&&http;
  const ok = !!(
      http &&
      code === "0" &&
      first &&
      (spec.kind === "LEVERAGE" ? first.lever != null : sc === "0") &&
      (!["ORDER", "ALGO"].includes(spec.kind) || id)
    ),
    rejected = definitive || !!(
      http &&
      first &&
      sc &&
      sc !== "0" &&
      sc !== "50004" &&
      code !== "50004" &&
      !id
    );
  return {
    ok,
    status: ok
      ? spec.kind.startsWith("CANCEL")
        ? "CANCEL_REQUESTED"
        : spec.kind.startsWith("AMEND")
          ? "AMEND_REQUESTED"
          : spec.kind === "LEVERAGE"
            ? "LEVERAGE_ACKNOWLEDGED"
            : "ACKNOWLEDGED"
      : rejected
        ? "REJECTED"
        : "UNKNOWN",
    exchange_order_id: id,
    client_order_id: spec.body.clOrdId || spec.body.algoClOrdId || null,
    protection_active: false,
    verified_leverage: null,
    broker_code: sc || code,
    error: ok ? null : rejected ? "OKX_ORDER_REJECTED" : "OKX_RESULT_UNKNOWN",
    diagnostics: { code, s_code: sc },
    raw_result: ok ? first : null,
  };
}
module.exports = { client, inspect, execute, rows, number };
