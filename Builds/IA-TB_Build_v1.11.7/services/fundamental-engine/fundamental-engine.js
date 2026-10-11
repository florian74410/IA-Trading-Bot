/**
 * IA-Trading-Bot — Fundamental Engine v1.0
 * Target integration: IA-TB v1.7.5
 *
 * Normalized contract:
 * Router <-> Fundamental Engine
 *
 * The engine is deliberately exchange-agnostic. It never executes orders.
 * It receives a normalized context and returns a normalized fundamental snapshot.
 */

"use strict";

const ENGINE_NAME = "fundamental-engine";
const ENGINE_VERSION = "1.0.0";
const CONTRACT_VERSION = 1;

const DEFAULT_WEIGHTS = Object.freeze({
  news: 0.30,
  macro: 0.20,
  onchain: 0.25,
  token: 0.15,
  ecosystem: 0.10
});

function clamp(v, min = -1, max = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function normalizeSignal(signal = {}) {
  return {
    source: String(signal.source || "unknown"),
    category: String(signal.category || "unknown"),
    score: clamp(signal.score),
    confidence: Math.max(0, Math.min(1, Number(signal.confidence) || 0)),
    timestamp: Number(signal.timestamp) || Date.now(),
    symbol: signal.symbol ? String(signal.symbol).toUpperCase() : null,
    asset: signal.asset ? String(signal.asset).toUpperCase() : null,
    metadata: signal.metadata && typeof signal.metadata === "object"
      ? signal.metadata
      : {}
  };
}

function weightedScore(signals, weights = DEFAULT_WEIGHTS) {
  if (!signals.length) return { score: 0, confidence: 0 };

  let weighted = 0;
  let totalWeight = 0;
  let confidenceTotal = 0;

  for (const s of signals) {
    const categoryWeight = Number(weights[s.category]) || 0.05;
    const effectiveWeight = categoryWeight * Math.max(s.confidence, 0.05);
    weighted += s.score * effectiveWeight;
    totalWeight += effectiveWeight;
    confidenceTotal += s.confidence;
  }

  return {
    score: totalWeight ? clamp(weighted / totalWeight) : 0,
    confidence: Math.max(0, Math.min(1, confidenceTotal / signals.length))
  };
}

function classify(score) {
  if (score >= 0.55) return "STRONGLY_BULLISH";
  if (score >= 0.20) return "BULLISH";
  if (score <= -0.55) return "STRONGLY_BEARISH";
  if (score <= -0.20) return "BEARISH";
  return "NEUTRAL";
}

class FundamentalEngine {
  constructor(options = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
    this.providers = new Map();
    this.lastSnapshot = null;
  }

  registerProvider(name, provider) {
    if (!name || !provider || typeof provider.collect !== "function") {
      throw new Error("Provider must expose collect(context)");
    }
    this.providers.set(String(name), provider);
  }

  async collect(context = {}) {
    const batches = [];

    for (const [name, provider] of this.providers.entries()) {
      try {
        const out = await provider.collect(context);
        const rows = Array.isArray(out) ? out : (out ? [out] : []);
        batches.push(...rows.map(row => normalizeSignal({
          ...row,
          source: row.source || name
        })));
      } catch (error) {
        batches.push(normalizeSignal({
          source: name,
          category: "provider_error",
          score: 0,
          confidence: 0,
          metadata: { error: String(error && error.message || error) }
        }));
      }
    }

    return batches;
  }

  async analyze(request = {}) {
    const context = {
      request_id: request.request_id || null,
      exchange: request.exchange || null,
      symbol: request.symbol || null,
      asset: request.asset || null,
      timeframe: request.timeframe || null,
      timestamp: request.timestamp || Date.now(),
      market: request.market || null
    };

    const suppliedSignals = Array.isArray(request.signals)
      ? request.signals.map(normalizeSignal)
      : [];

    const providerSignals = await this.collect(context);
    const usable = [...suppliedSignals, ...providerSignals]
      .filter(s => s.category !== "provider_error");

    const aggregate = weightedScore(usable, this.weights);

    const snapshot = {
      contract_version: CONTRACT_VERSION,
      engine: ENGINE_NAME,
      engine_version: ENGINE_VERSION,
      request_id: context.request_id,
      timestamp: Date.now(),
      exchange: context.exchange,
      symbol: context.symbol,
      asset: context.asset,
      timeframe: context.timeframe,
      score: aggregate.score,
      confidence: aggregate.confidence,
      bias: classify(aggregate.score),
      signals: usable,
      diagnostics: {
        registered_providers: [...this.providers.keys()],
        signal_count: usable.length,
        provider_errors: [...suppliedSignals, ...providerSignals]
          .filter(s => s.category === "provider_error")
      }
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  health() {
    return {
      ok: true,
      engine: ENGINE_NAME,
      engine_version: ENGINE_VERSION,
      contract_version: CONTRACT_VERSION,
      providers: [...this.providers.keys()],
      ready: true,
      timestamp: Date.now()
    };
  }
}

module.exports = {
  FundamentalEngine,
  ENGINE_NAME,
  ENGINE_VERSION,
  CONTRACT_VERSION,
  DEFAULT_WEIGHTS,
  normalizeSignal,
  weightedScore,
  classify
};
