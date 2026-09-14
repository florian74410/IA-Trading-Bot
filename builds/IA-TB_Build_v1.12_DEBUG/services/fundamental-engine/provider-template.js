/**
 * Template for future Fundamental Engine providers.
 * Examples: news, macro, on-chain, tokenomics, ecosystem.
 */

"use strict";

class ProviderTemplate {
  constructor(options = {}) {
    this.options = options;
  }

  async collect(context) {
    // Return one signal or an array of normalized-compatible signals:
    // {
    //   category: "news" | "macro" | "onchain" | "token" | "ecosystem",
    //   score: -1..1,
    //   confidence: 0..1,
    //   timestamp: Date.now(),
    //   symbol: context.symbol,
    //   metadata: {}
    // }
    return [];
  }
}

module.exports = { ProviderTemplate };
