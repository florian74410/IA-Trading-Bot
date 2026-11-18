'use strict';
const C=require('../../../../Core/Execution/manual_contract'),{number}=require('./account-reader');
function multiplyDecimal(a,b){const x=units(a),y=units(b),v=x.n*y.n,d=x.d*y.d,scale=d.toString().length-1;return scale?`${v/d}.${(v%d).toString().padStart(scale,"0")}`:String(v);}
function units(v) {
  const s = C.decimal(v, { zero: true }),
    [a, b = ""] = s.split(".");
  return { n: BigInt(a + b), d: 10n ** BigInt(b.length) };
}
function multiple(v, step) {
  const x = units(v),
    y = units(step);
  return y.n > 0n && (x.n * y.d) % (y.n * x.d) === 0n;
}
function quoteToBase(amount, price, step) {
  const a = units(amount),
    p = units(price),
    s = units(step),
    ticks = (a.n * p.d * s.d) / (a.d * p.n * s.n),
    v = ticks * s.n,
    scale = s.d.toString().length - 1;
  return scale
    ? `${v / s.d}.${(v % s.d).toString().padStart(scale, "0")}`
    : String(v);
}
function build(p, id, pre) {
  if (
    !p ||
    p.environment !== "LIVE" ||
    (p.exchange && p.exchange !== "OKX") ||
    !p.account ||
    !C.MARKETS.includes(p.market) ||
    !p.instrument_candidate
  )
    throw Error("MANUAL_DEFINITION_REQUIRED");
  if (
    !pre?.ok ||
    pre.instrument?.instId !== p.instrument_candidate ||
    pre.instrument.instType !== p.market ||
    Date.now() - pre.observed_at > 10000
  )
    throw Error("MANUAL_PREFLIGHT_REQUIRED");
  if(p.operation==='orders.batch'){
    if(p.market!=='SPOT')throw Error('MANUAL_BATCH_SPOT_ONLY');
    if(!Array.isArray(p.steps)||p.steps.length<1||p.steps.length>20)throw Error('MANUAL_BATCH_INVALID');
    const orders=p.steps.map((s,i)=>{if(!['trading.buy','trading.sell'].includes(s.intent_id)||s.depends_on?.length||s.parameters.account!==p.account||s.parameters.market!==p.market||s.parameters.instrument_candidate!==p.instrument_candidate)throw Error('MANUAL_BATCH_SCOPE_INVALID');const child=build({...s.parameters,operation:s.intent_id},id.replace(/-/g,'').slice(0,24)+String(i).padStart(4,'0'),pre);if(child.kind!=='ORDER')throw Error('MANUAL_BATCH_SCOPE_INVALID');return child.body;});
    for(const side of ['buy','sell']){const ccy=side==='buy'?pre.instrument.quoteCcy:pre.instrument.baseCcy,avail=number(pre.balances?.[0]?.details?.find(x=>x.ccy===ccy)?.availBal);let total=0;for(const b of orders.filter(x=>x.side===side)){const px=number(b.px)||number(pre.ticker?.[0]?.last);if(px===null)throw Error('MANUAL_BATCH_PRICE_REQUIRED');total+=side==='buy'?(b.tgtCcy==='quote_ccy'?+b.sz:+b.sz*px):(b.tgtCcy==='quote_ccy'?+b.sz/px:+b.sz);}if(avail!==null&&total>avail)throw Error('AVAILABLE_BALANCE_INSUFFICIENT');}
    return C.validate({kind:'BATCH',market:p.market,body:{instId:p.instrument_candidate,orders}});
  }
  if(!['1','2','3','4'].includes(String(pre.configuration?.acctLv)))throw Error('MANUAL_ACCOUNT_MODE_UNQUALIFIED');
  if(p.market!=='SPOT'&&['3','4'].includes(String(pre.configuration.acctLv))&&p.margin_mode==='isolated')throw Error('MANUAL_ISOLATED_MODE_UNAVAILABLE');
  if(p.market==='MARGIN'&&String(pre.configuration.acctLv)!=='2')throw Error('MANUAL_MARGIN_ACCOUNT_MODE_UNQUALIFIED');
  const inst = pre.instrument,
    cfg = pre.configuration,
    derivative = ["SWAP", "FUTURES"].includes(p.market),
    client = "iatb" + id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 28),
    mode = p.market === "SPOT" ? "cash" : p.margin_mode;
  if (p.market !== "SPOT" && !["cross", "isolated"].includes(mode))
    throw Error("MANUAL_MARGIN_MODE_REQUIRED");
  if (derivative && !["net_mode", "long_short_mode"].includes(cfg.posMode))
    throw Error("MANUAL_POSITION_MODE_REQUIRED");
  let kind = "ORDER",
    body = { instId: p.instrument_candidate },
    position = null;
  const op = p.operation;
  if (
    op === "orders.cancel" ||
    op === "orders.amend" ||
    op === "algorithms.cancel" ||
    op === "algorithms.amend"
  ) {
    const algo = op.startsWith("algorithms.");
    kind = op.endsWith("cancel")
      ? algo
        ? "CANCEL_ALGO"
        : "CANCEL"
      : algo
        ? "AMEND_ALGO"
        : "AMEND";
    body[algo ? "algoId" : "ordId"] = algo ? p.algo_id : p.order_id;
    const old = pre.target;
    if (
      !old ||
      old.instId !== p.instrument_candidate ||
      (algo ? old.algoId !== p.algo_id : old.ordId !== p.order_id)
    )
      throw Error("MANUAL_TARGET_NOT_FOUND");
    if (!["live", "partially_filled", "effective", "pause"].includes(old.state))
      throw Error("MANUAL_TARGET_NOT_OPEN");
    if (
      kind === "AMEND_ALGO" &&
      !["conditional", "oco", "trigger"].includes(old.ordType)
    )
      throw Error("OKX_ALGO_AMEND_UNSUPPORTED");
    if (kind.startsWith("AMEND")) {
      body.cxlOnFail = false;
      if (p.amount != null) body.newSz = C.decimal(p.amount);
      if (p.limit_price != null) body.newPx = C.decimal(p.limit_price);
      if (algo) {
        delete body.newPx;
        if(p.trigger_price!=null)body.newTriggerPx=C.decimal(p.trigger_price);
        if(p.trigger_order_price!=null)body.newOrdPx=C.decimal(p.trigger_order_price,{market:true});
        for (const [key, target] of [
          ["take_profit", "Tp"],
          ["stop_loss", "Sl"],
        ])
          if (p[key] != null) {
            body["new" + target + "TriggerPx"] = C.decimal(p[key]);
            body["new" + target + "OrdPx"] = C.decimal(
              p[key + "_order_price"] ?? -1,
              { market: true },
            );
          }
      }
    }
  } else if (op === "account.leverage") {
    kind = "LEVERAGE";
    body = {
      instId: p.instrument_candidate,
      lever: C.decimal(p.leverage),
      mgnMode: mode,
    };
    if (number(inst.lever) === null || +body.lever > +inst.lever)
      throw Error("MANUAL_LEVERAGE_NOT_AUTHORIZED");
    if (
      derivative &&
      mode === "isolated" &&
      cfg.posMode === "long_short_mode"
    ) {
      if (!p.position_side) throw Error("MANUAL_POSITION_SIDE_REQUIRED");
      body.posSide = p.position_side.toLowerCase();
    }
  } else {
    body = {
      instId: p.instrument_candidate,
      tdMode: mode,
      side:
        op === "trading.sell"
          ? "sell"
          : op === "trading.buy"
            ? "buy"
            : p.position_side === "SHORT"
              ? "sell"
              : p.position_side === "LONG"
                ? "buy"
                : p.side?.toLowerCase(),
      ordType: (p.order_type || "").toLowerCase(),
      sz: null,
      clOrdId: client,
    };
    if (op === "positions.close" || p.position_id) {
      position = pre.positions?.find(
        (x) => x.posId === p.position_id && x.instId === p.instrument_candidate,
      );
      if (!position || number(position.pos) === null || +position.pos === 0)
        throw Error("MANUAL_POSITION_NOT_FOUND");
      if (
        p.position_side &&
        position.posSide !== "net" &&
        position.posSide !== p.position_side.toLowerCase()
      )
        throw Error("MANUAL_POSITION_SIDE_MISMATCH");
      if (op === "positions.close") {
        const qty = multiplyDecimal(String(position.pos).replace(/^-/,""),p.close_fraction??1);
        body.sz = C.decimal(qty);
        body.side =
          position.posSide === "long" ||
          (position.posSide === "net" && +position.pos > 0)
            ? "sell"
            : "buy";
        body.ordType = "market";
      } else
        body.side =
          position.posSide === "long" ||
          (position.posSide === "net" && +position.pos > 0)
            ? "sell"
            : "buy";
    }
    if (derivative) {
      if (cfg.posMode === "long_short_mode") {
        const side = position?.posSide || p.position_side?.toLowerCase();
        if (!["long", "short"].includes(side))
          throw Error("MANUAL_POSITION_SIDE_REQUIRED");
        body.posSide = side;
      } else {
        body.posSide = "net";
        if (op === "positions.close" || position) body.reduceOnly = true;
      }
    }
    if (!body.sz) {
      if (p.amount == null) throw Error("MANUAL_SIZE_REQUIRED");
      if (derivative) {
        if (p.amount_unit !== "CONTRACTS")
          throw Error("MANUAL_CONTRACT_UNIT_REQUIRED");
        body.sz = C.decimal(p.amount);
      } else if (p.amount_unit === inst.baseCcy) body.sz = C.decimal(p.amount);
      else if (p.amount_unit === inst.quoteCcy) {
        if (p.order_type === "MARKET" && p.market === "SPOT") {
          body.sz = C.decimal(p.amount);
          body.tgtCcy = "quote_ccy";
        } else if (p.limit_price) {
          body.sz = quoteToBase(p.amount, p.limit_price, inst.lotSz);
        } else throw Error("MANUAL_BASE_SIZE_REQUIRED");
      } else throw Error("MANUAL_UNIT_INVALID");
    }
    if (p.order_type === "MARKET" && p.market === "SPOT") {
      body.tgtCcy = body.tgtCcy || "base_ccy";
      body.banAmend = true;
    }
    if (body.ordType !== "market" && op !== "algorithms.place")
      body.px = C.decimal(p.limit_price);
    if (op === "algorithms.place") {
      kind = "ALGO";
      delete body.clOrdId;
      body.algoClOrdId = client;
      delete body.px;
      body.ordType = p.algo_type;
      if (body.ordType === "move_order_stop") {
        if (p.callback_ratio != null)
          body.callbackRatio = C.decimal(p.callback_ratio);
        if (p.callback_spread != null)
          body.callbackSpread = C.decimal(p.callback_spread);
        if (p.activation_price != null)
          body.activePx = C.decimal(p.activation_price);
      } else if (body.ordType === "trigger") {
        body.triggerPx = C.decimal(p.trigger_price);
        body.orderPx = C.decimal(p.trigger_order_price ?? -1, { market: true });
        body.triggerPxType = p.trigger_price_type || "last";
      } else
        for (const [key, prefix] of [
          ["take_profit", "tp"],
          ["stop_loss", "sl"],
        ])
          if (p[key] != null) {
            body[prefix + "TriggerPx"] = C.decimal(p[key]);
            body[prefix + "OrdPx"] = C.decimal(p[key + "_order_price"] ?? -1, {
              market: true,
            });
            body[prefix + "TriggerPxType"] = p.trigger_price_type || "last";
          }
    } else if (p.take_profit != null || p.stop_loss != null) {
      body.attachAlgoOrds = [{ attachAlgoClOrdId: "tp" + client.slice(0, 29) }];
      for (const [key, prefix] of [
        ["take_profit", "tp"],
        ["stop_loss", "sl"],
      ])
        if (p[key] != null) {
          body.attachAlgoOrds[0][prefix + "TriggerPx"] = C.decimal(p[key]);
          body.attachAlgoOrds[0][prefix + "OrdPx"] = C.decimal(
            p[key + "_order_price"] ?? -1,
            { market: true },
          );
        }
    }
    if (inst.tradeQuoteCcyList?.length) {
      if (
        !inst.tradeQuoteCcyList.includes(
          p.trade_quote_currency || inst.quoteCcy,
        )
      )
        throw Error("MANUAL_QUOTE_CURRENCY_REQUIRED");
      body.tradeQuoteCcy = p.trade_quote_currency || inst.quoteCcy;
    }
  }
  if(derivative&&(inst.ctType!=='linear'||inst.ctValCcy!==p.instrument_candidate.split('-')[0]))throw Error('MANUAL_INVERSE_CONTRACT_UNQUALIFIED');
  if(p.market==='MARGIN'&&['ORDER','ALGO'].includes(kind)){if(!p.margin_currency||![inst.baseCcy,inst.quoteCcy].includes(p.margin_currency))throw Error('MANUAL_MARGIN_CURRENCY_REQUIRED');body.ccy=p.margin_currency;if(position)body.reduceOnly=true;}
  if(derivative&&(!inst.ctVal||!inst.ctValCcy||!inst.ctType))throw Error('MANUAL_CONTRACT_MULTIPLIER_REQUIRED');
  if(op==='positions.close'&&(position.mgnMode!==mode||cfg.posMode==='long_short_mode'&&!['long','short'].includes(position.posSide)||cfg.posMode==='net_mode'&&position.posSide!=='net'))throw Error('MANUAL_POSITION_MODE_MISMATCH');
  if(op==='positions.open'&&p.leverage!=null&&!p._preparing_dependency){const v=pre.leverage?.filter(x=>x.instId===p.instrument_candidate&&x.mgnMode===mode&&(!body.posSide||body.posSide==='net'||x.posSide===body.posSide));if(v?.length!==1||Number(v[0].lever)!==p.leverage)throw Error('MANUAL_LEVERAGE_CONFIGURATION_REQUIRED');}
  if(p.market==='MARGIN'&&['1','3','4'].includes(String(cfg.acctLv))&&op==='account.leverage')throw Error('MANUAL_LEVERAGE_CURRENCY_SCOPE_UNQUALIFIED');
  if(kind==='ALGO'){delete body.tgtCcy;delete body.banAmend;if(p.market==='SPOT'&&body.side==='buy'&&body.ordType==='conditional')body.tgtCcy='base_ccy';}
  const spec = C.validate({
    kind,
    market: p.market,
    body,
    ...(position ? { position_id: p.position_id } : {}),
    ...(derivative?{valuation:{contract_value:C.decimal(inst.ctVal),contract_value_currency:inst.ctValCcy,contract_type:inst.ctType}}:{}),
  });
  if (
    body.sz &&
    body.tgtCcy !== "quote_ccy" &&
    (!multiple(body.sz, inst.lotSz) || +body.sz < +inst.minSz)
  )
    throw Error("MANUAL_LOT_SIZE_INVALID");
  if (
    body.newSz &&
    (!multiple(body.newSz, inst.lotSz) || +body.newSz < +inst.minSz)
  )
    throw Error("MANUAL_LOT_SIZE_INVALID");
  for (const key of [
    "px",
    "newPx",
    "tpTriggerPx",
    "slTriggerPx",
    "activePx",
    "triggerPx",
    "newTriggerPx",
    "callbackSpread",
    "orderPx",
    "newOrdPx",
    "tpOrdPx",
    "slOrdPx",
    "newTpTriggerPx",
    "newSlTriggerPx",
    "newTpOrdPx",
    "newSlOrdPx",
  ])
    if (body[key] != null && body[key]!=="-1"&&body[key]!=="0" && !multiple(body[key], inst.tickSz))
      throw Error("MANUAL_TICK_SIZE_INVALID");
  for(const a of body.attachAlgoOrds||[])for(const k of ['tpTriggerPx','slTriggerPx','tpOrdPx','slOrdPx'])if(a[k]!=null&&a[k]!=='-1'&&!multiple(a[k],inst.tickSz))throw Error('MANUAL_TICK_SIZE_INVALID');
  if(['ORDER','ALGO'].includes(kind)&&p.market==='SPOT'){
   const ccy=body.side==='buy'?inst.quoteCcy:inst.baseCcy,avail=number(pre.balances?.[0]?.details?.find(x=>x.ccy===ccy)?.availBal);
   const px=number(body.px)||number(pre.ticker?.[0]?.last),qty=number(body.sz),need=body.side==='buy'?(body.tgtCcy==='quote_ccy'?qty:px===null?null:qty*px):(body.tgtCcy==='quote_ccy'?(px===null?null:qty/px):qty);
   const fee=pre.fees?.[0],groups=fee?.feeGroup?.filter(x=>String(x.groupId)===String(inst.groupId)),rawFee=number(groups?.length===1?groups[0].taker:fee?.taker),reserve=body.side==='buy'&&rawFee!==null?Math.max(0,-rawFee)*need:0;
   if(avail!==null&&need!==null&&need+reserve>avail)throw Error('AVAILABLE_BALANCE_INSUFFICIENT');
  }
  return spec;
}

module.exports={build,multiple,quoteToBase};
