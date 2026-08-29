
"use strict";
const { ensureLive, statusFromHttp, asError } = require("../../executor-utils");

function chainHost(chain) {
  const c = chain || "arbitrum";
  return `https://${c}.gmxapi.io/v1`;
}

class GmxExecutor {
  capabilities() { return require("./capabilities.json"); }

  async execute(order, ctx) {
    ensureLive(ctx);
    const chain = order.chain || "arbitrum";
    const base = chainHost(chain);

    if (!ctx.walletSigner || typeof ctx.walletSigner.signGmxPreparedOrder !== "function") {
      return {
        ok:false,
        status:"SIGNATURE_REQUIRED",
        error:"GMX requires a wallet/EIP-712 signer for live order submission",
        diagnostics:{ chain, required:"walletSigner.signGmxPreparedOrder" }
      };
    }

    // GMX request schemas are richer than CEX order schemas.
    // Exchange-specific values remain in metadata to avoid polluting the common protocol.
    const prepareBody = {
      account: order.account || order.metadata.account,
      market: order.metadata.market,
      initialCollateralToken: order.metadata.initial_collateral_token,
      initialCollateralDeltaAmount: order.metadata.initial_collateral_delta_amount,
      sizeDeltaUsd: order.metadata.size_delta_usd,
      acceptablePrice: order.metadata.acceptable_price,
      triggerPrice: order.metadata.trigger_price || "0",
      isLong: order.side === "BUY",
      orderType: order.metadata.gmx_order_type,
      decreasePositionSwapType: order.metadata.decrease_position_swap_type,
      receiver: order.metadata.receiver || order.account,
      callbackContract: order.metadata.callback_contract,
      uiFeeReceiver: order.metadata.ui_fee_receiver,
      referralCode: order.metadata.referral_code
    };
    Object.keys(prepareBody).forEach(k => prepareBody[k] === undefined || prepareBody[k] === null ? delete prepareBody[k] : 0);

    const prep = await ctx.transport({
      method:"POST",
      url:`${base}/orders/txns/prepare`,
      body: prepareBody
    });

    if (!statusFromHttp(prep.statusCode)) {
      return { ok:false, status:"REJECTED", error:asError(prep.body, `HTTP ${prep.statusCode}`), diagnostics:{phase:"prepare", chain} };
    }

    const signed = await ctx.walletSigner.signGmxPreparedOrder(prep.body, { order, chain });
    const submit = await ctx.transport({
      method:"POST",
      url:`${base}/orders/txns/submit`,
      body: signed
    });

    const ok = statusFromHttp(submit.statusCode);
    return {
      ok,
      status: ok ? "SUBMITTED" : "REJECTED",
      exchange_order_id: submit.body && (submit.body.requestId || submit.body.taskId) || null,
      raw_status: submit.body && submit.body.status || null,
      error: ok ? null : asError(submit.body, `HTTP ${submit.statusCode}`),
      diagnostics:{phase:"submit", chain, eventual_consistency:true}
    };
  }
}
module.exports = { GmxExecutor };
