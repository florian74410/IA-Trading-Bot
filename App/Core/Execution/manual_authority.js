"use strict";
const CP = require("../Communication/communication_protocol_v1"),
  C = require("./manual_contract");
function binding(a) {
  if(!/^CL[A-Za-z0-9_-]{1,64}$/.test(a.owner||"")||!/^[-A-Za-z0-9_]{1,96}$/.test(a.plan_id||"")||![a.confirmation_digest,a.diagnostic_digest].every(v=>/^[a-f0-9]{64}$/.test(v||"")))throw Error("MANUAL_CONFIRMATION_BINDING_INVALID");
  return { ...C.canonical(a), owner: a.owner, plan_id: a.plan_id, confirmation_digest:a.confirmation_digest, diagnostic_digest:a.diagnostic_digest };
}
function issue(codec, principal, args) {
  if (
    principal.clientId !== args.owner ||
    !["USER", "ADMIN"].includes(principal.role)
  )
    throw Error("MANUAL_OWNER_REQUIRED");
  return codec.issue({
    principal,
    audience: "trading",
    operation: "manual.confirmed",
    method: "POST",
    ownerClientId: args.owner,
    action: C.actionFor(args.spec),
    bodyDigest: CP.hashData(binding(args)),
  });
}
function verify(codec, args) {
  const p = codec.verify(args.proof, {
    audience: "trading",
    operation: "manual.confirmed",
    method: "POST",
    ownerClientId: args.owner,
    action: C.actionFor(args.spec),
    bodyDigest: CP.hashData(binding(args)),
  });
  return !!(
    p &&
    p.clientId === args.owner &&
    ["ADMIN", "USER"].includes(p.role)
  );
}
function query(a) {
  const q = a.query;
  if (
    a.exchange !== "OKX" ||
    !C.MARKETS.includes(a.market_type) ||
    !/^[-A-Z0-9]{3,64}$/.test(a.symbol || "") ||
    !q ||
    !["PREFLIGHT", "ORDER", "FILLS", "ALGO", "HISTORY"].includes(q.kind) ||
    Object.keys(q).some(
      (k) =>
        !["kind", "order_id", "client_id", "algoId", "margin_mode","plan_id"].includes(k),
    )
  )
    throw Error("MANUAL_QUERY_INVALID");
  if(q.plan_id&&!/^[-A-Za-z0-9_]{1,96}$/.test(q.plan_id))throw Error("MANUAL_QUERY_INVALID");
  for (const k of ["order_id", "algoId"])
    if (q[k] && !/^[0-9]{1,64}$/.test(q[k]))
      throw Error("MANUAL_QUERY_INVALID");
  if (q.client_id && !/^[A-Za-z0-9]{1,32}$/.test(q.client_id))
    throw Error("MANUAL_QUERY_INVALID");
  return {
    exchange: a.exchange,
    account: a.account,
    market_type: a.market_type,
    symbol: a.symbol,
    query: q,
  };
}
module.exports = { binding, issue, verify, query };
