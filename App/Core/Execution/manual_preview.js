"use strict";
const C = require("./manual_contract"),
  {
    number,
  } = require("../../Engines/Trading/exchange-adapters/okx/account-reader");
const {build,multiple,quoteToBase}=require("../../Engines/Trading/exchange-adapters/okx/order-model");
function preview(spec, pre, risk) {
  const b = spec.body,
    price = number(pre.ticker?.[0]?.last),
    fee = pre.fees?.[0],
    groups = fee?.feeGroup?.filter(
      (x) => String(x.groupId) === String(pre.instrument.groupId),
    ),
    rate = number(groups?.length === 1 ? groups[0].taker : fee?.taker),
    feeRate = rate === null ? null : Math.max(0, -rate),
    baseSize =
      b.tgtCcy === "quote_ccy" ? (price ? +b.sz / price : null) : number(b.sz),
    limit = number(b.px),
    notional =
      spec.market === "SPOT" || spec.market === "MARGIN"
        ? b.tgtCcy === "quote_ccy"
          ? +b.sz
          : baseSize !== null && (limit ?? price) !== null
            ? baseSize * (limit ?? price)
            : null
        : null,
    estimatedFees =
      notional !== null && feeRate !== null ? notional * feeRate : null,
    available = pre.balances?.[0]?.details?.find(
      (x) => x.ccy === pre.instrument.quoteCcy,
    ),
    position = pre.positions?.find((x) => x.posId === spec.position_id);
  const missing = [
    ...(pre.missing || []),
    ...(!risk ? ["risk"] : []),
    ...(price === null ? ["price"] : []),
    ...(feeRate === null ? ["fee_rate"] : []),
  ];
  return {
    contract_value:number(pre.instrument.ctVal),contract_value_currency:pre.instrument.ctValCcy||null,
    current_price: price,
    limit_price: limit,
    quantity: number(b.sz),
    quantity_unit: ["SWAP", "FUTURES"].includes(spec.market)
      ? "CONTRACTS"
      : b.tgtCcy === "quote_ccy"
        ? pre.instrument.quoteCcy
        : pre.instrument.baseCcy,
    notional,
    estimated_fees: estimatedFees,
    fee_rate: feeRate,
    fee_currency: pre.instrument.quoteCcy || null,
    estimated_total:
      spec.kind==='ORDER'&&spec.market==='SPOT'&&notional !== null && estimatedFees !== null
        ? b.side==='sell'?notional-estimatedFees:notional+estimatedFees
        : null,
    available_balance: number(available?.availBal),
    requested_leverage: number(b.lever),
    verified_leverage: number(pre.leverage?.[0]?.lever),
    margin_required: null,
    margin_available: number(available?.availEq),
    liquidation_price: number(position?.liqPx),
    funding_rate: number(pre.funding?.[0]?.fundingRate),
    risk_scores: risk?.scores ?? null,
    risk_decision: risk?.decision ?? null,
    missing_information: [...new Set(missing)],
    warnings: [
      ...(["SWAP","FUTURES","MARGIN"].includes(spec.market)?["LIQUIDATION_RISK","LOSS_MAY_EXCEED_INITIAL_MARGIN_WHEN_APPLICABLE"]:[]),
      ...(risk?.reasons || []),
      ...(risk?.warnings || []),
      "ESTIMATES_NOT_GUARANTEED",
    ],
    sources: [
      { engine: "trading", observed_at: pre.observed_at },
      { engine: "risk", snapshot_id: risk?.snapshot_id ?? null },
    ],
    protection_active: false,
  };
}
module.exports = { build, preview, multiple, quoteToBase };
