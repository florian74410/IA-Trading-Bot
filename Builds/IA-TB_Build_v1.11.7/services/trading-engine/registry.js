
"use strict";

const { BinanceExecutor } = require("./exchange-adapters/binance/executor");
const { OkxExecutor } = require("./exchange-adapters/okx/executor");
const { KrakenExecutor } = require("./exchange-adapters/kraken/executor");
const { GmxExecutor } = require("./exchange-adapters/gmx/executor");

function registerDefaultExecutors(engine) {
  engine.registerExecutor("BINANCE", new BinanceExecutor());
  engine.registerExecutor("OKX", new OkxExecutor());
  engine.registerExecutor("KRAKEN", new KrakenExecutor());
  engine.registerExecutor("GMX", new GmxExecutor());
  return engine;
}

module.exports = { registerDefaultExecutors };
