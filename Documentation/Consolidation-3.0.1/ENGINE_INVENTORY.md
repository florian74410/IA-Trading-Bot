# Engines et services actifs

| Engine | Point d’entrée | Commandes | Qualifiées |
|---|---|---:|---:|
| trading | `App/Engines/Trading/trading_service.js` | 20 | 11 |
| firewall | `App/Engines/Firewall/firewall_service.js` | 3 | 1 |
| fundamental | `App/Engines/Fundamental/Engine/fundamental_service.js` | 63 | 2 |
| indicator | `App/Engines/Indicators/Engine/indicator_service.js` | 26 | 3 |
| liquidity | `App/Engines/Liquidity/Engine/liquidity_service.js` | 15 | 2 |
| marketdata | `App/Engines/MarketData/market_data_service.js` | 42 | 5 |
| portfolio | `App/Engines/Portfolio/Engine/portfolio_service.js` | 20 | 2 |
| risk | `App/Engines/Risk/Engine/risk_service.js` | 18 | 8 |
| strategy | `App/Engines/Strategy/Engine/strategy_service.js` | 13 | 3 |
| supervisor | `App/Engines/Supervisor/supervisor_service.js` | 38 | 14 |

Core/Auth21, Router CP1, Function Registry, UI/Frontend et AI Gateway restent transversaux. Bank et WalletConnector sont conservés ; aucune nouvelle implémentation concurrente n’est créée. Les manifestes Process Registry fixent ports, dépendances et scripts de lancement.

Le Supervisor regroupe ChatBot, Gateway, CognitiveRuntime, Memory, Soul et Engine. Les agents ne peuvent pas ouvrir une mutation financière. La matrice détaillée distingue les commandes qualifiées côté propriétaire de celles exposées aux agents.
