'use strict';
// Provisional operator policy, not a statistical calibration. Never accepted from CP/1 arguments.
const DEFAULT=Object.freeze({marketMaxAgeMs:120000,portfolioMaxAgeMs:15000,bookMaxAgeMs:5000,maxSkewMs:15000,ttlMs:3000,
 maxExposure:1,maxPosition:.1,maxPositions:10,maxDailyLoss:.03,maxLeverage:2,maxSpread:.002,maxSlippage:.003,minDepthQuote:10000,maxStopRisk:.05,
 workerWorkThreshold:10000,maxCorrelationAssets:8,maxSnapshotConcurrency:4,ioTimeoutMs:2500,maxStored:64,criticalScore:90,reviewScore:60,
 volatilityScale:1,tailScale:.05,drawdownScale:.2,weights:{market:1,portfolio:1,volatility:1,liquidity:1,execution:1,concentration:1}});
function policy(overrides={}){const out=JSON.parse(JSON.stringify(DEFAULT));for(const [k,v] of Object.entries(overrides)){if(k==='weights'){for(const [n,w] of Object.entries(v||{})){if(!(n in out.weights)||!Number.isFinite(w)||w<=0||w>100)throw Error('RISK_POLICY_INVALID');out.weights[n]=w;}}else{if(!(k in out)||typeof v!=='number'||!Number.isFinite(v)||v<=0)throw Error('RISK_POLICY_INVALID');out[k]=v;}}
 for(const k of ['maxSnapshotConcurrency','maxStored','maxPositions'])if(!Number.isInteger(out[k])||out[k]>256)throw Error('RISK_POLICY_INVALID');
 if(out.ttlMs>out.bookMaxAgeMs||out.ioTimeoutMs>5000||out.criticalScore>100||out.reviewScore>=out.criticalScore)throw Error('RISK_POLICY_INVALID');return out;}
const score=(v,scale)=>Number.isFinite(v)?Math.round(Math.min(100,Math.max(0,v/scale*100))):null;
function aggregate(metrics,p){const {market:m,portfolio:f,execution:e}=metrics;
 const scores={market:m.available?Math.max(score(m.cvar_95,p.tailScale),score(m.max_drawdown,p.drawdownScale)):null,
  portfolio:f.available?Math.max(score(f.gross_exposure,p.maxExposure),score(f.combined_stop_risk,p.maxStopRisk)):null,
  volatility:m.available?score(m.annualized_volatility,p.volatilityScale):null,
  liquidity:e.available?score(p.minDepthQuote/e.depth_quote,1):null,
  execution:e.available&&e.fee_rate!==null?Math.max(score(e.spread,p.maxSpread),score(e.slippage+e.fee_rate,p.maxSlippage)):null,
  concentration:f.available?score(f.concentration,p.maxExposure):null};
 const values=Object.entries(scores),available=values.filter(([,v])=>v!==null);
 scores.overall=available.length===values.length?Math.round(available.reduce((s,[k,v])=>s+v*p.weights[k],0)/available.reduce((s,[k])=>s+p.weights[k],0)):null;
 return scores;
}
module.exports={policy,DEFAULT,aggregate};
