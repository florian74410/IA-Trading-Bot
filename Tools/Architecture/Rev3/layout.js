"use strict";
// Migration metadata only. Runtime code must never import this historical map.
module.exports = {
  trading: ["services/trading-engine", "Engines/Trading"],
  firewall: ["Core/Firewall", "Engines/Firewall"],
  fundamental: ["Fundamental", "Engines/Fundamental"],
  indicator: ["Indicators", "Engines/Indicators"],
  liquidity: ["Liquidity", "Engines/Liquidity"],
  marketdata: ["MarketData", "Engines/MarketData"],
  portfolio: ["Portfolio", "Engines/Portfolio"],
  risk: ["Risk", "Engines/Risk"],
  strategy: ["Strategy", "Engines/Strategy"],
  supervisor: ["Supervisor", "Engines/Supervisor"],
};
