# IA-TB v2.0 DEBUG — Shadow Workload Optimization

- Added boot-inclusive representative MarketData workload telemetry.
- Financial refresh now acknowledges asynchronously over CP/1 instead of holding callers during provider collection.
- Added fast Financial lanes and deferred compact enrichment for heavy CoinGecko/DeFiLlama datasets.
- Added lightweight DeFiLlama DEX overview for the critical Financial path.
- Added Cache First reuse of fresh Financial CoinGecko USD prices for marketdata.asset.price.
- Separated Bybit access/region HTTP 403 from actual rate-limit signals; explicit 10006 still maps to RATE_LIMIT.
- Classified Binance HTTP 451 as GEO_RESTRICTED rather than quota exhaustion.
- Added explicit Binance stream ping/pong heartbeat and broader Bybit pong recognition.
- Added scoped budget peak reporting to workload telemetry.
- Final Shadow workload run 37488995763: PASS, 27/30 success, 3 regional soft failures, 0 hard failures.
- Final contract run 37488995915: PASS on Node 16.20.2.
- Final workload Financial refresh acknowledgement ~70 ms; first Financial snapshot ~22 ms; BTC USD cache-first reads 9 ms / 41 ms.
- Native enforcement remains disabled.

# IA-TB v2.0 DEBUG — Data Provider Phase 3 + Shadow Runtime Validation

- Added generic SAFE_PACE, ENDPOINT_WINDOW, DYNAMIC_WINDOW, MULTI_SCOPE and COOLDOWN semantics to Request Budget.
- Added Kraken public MarketData safe-pace profiles without inventing unsupported hard ceilings.
- Added OKX per-endpoint windows for candles/books; Open Interest remains observation-only until a reliable numerical limit is available.
- Added Bybit global IP budget plus endpoint-specific dynamic budgets learned from X-Bapi-Limit response headers.
- Added provider feedback handling for HTTP 429, Retry-After, OKX 50011, Bybit 10006 and Bybit rate-limit HTTP 403.
- Restored and contract-locked the HTTP Transport -> Orchestrator -> Request Budget bridge.
- Preserved all Phase 1 and Phase 2 profiles and Shadow invariants.
- Fixed Firewall runtime startup defect: BUILD.version referenced without build_info import.
- Hardened OKX USD -> USDT candle fallback discovered during live runtime testing.
- Updated runtime contract for Liquidity's current MARKET_DATA_VIA_ROUTER_CP1 provenance.
- Contract suite PASS: GitHub Actions run 37470187624 on Node 16.20.2.
- Full Shadow Runtime PASS: GitHub Actions run 37470187770 with Router + Firewall + MarketData + Indicator + Liquidity.
- GitHub US runner receives Binance HTTP 451; runtime suite records the regional restriction and validates live CEX OHLCV invariants through OKX fallback instead.
- Native request enforcement remains disabled.

# IA-TB v2.0 DEBUG — Data Provider Phase 2 Weighted Budget Shadow

- Added generic weighted budget scopes to Request Budget.
- Added independent Binance Spot and USD-M Futures request-weight scopes.
- Added Hyperliquid aggregate REST request-weight scope.
- Added request-cost resolver for the Binance/Hyperliquid endpoints currently used by IA-TB.
- Moved weighted quota observation to the real HTTP transport boundary so actual outbound consumption is measured.
- Added Phase 2 provider Policy classifications for Binance and Hyperliquid.
- Preserved all Phase 1 profiles and Shadow invariants.
- GitHub Actions checkpoint run 37464421103 passed on Node 16.20.2, including the Phase 2 weighted-budget contract and historical MarketData tests.

# IA-TB v2.0 DEBUG — Data Provider Phase 1 Shadow

- Added Phase 1 Policy/Budget profiles for CoinGecko, DeFiLlama Free, GMX and DexScreener.
- Added explicit UNKNOWN budget semantics: unknown limits are never replaced with invented hard caps.
- CoinGecko keeps short-term + monthly shadow budget with reserve.
- DexScreener uses documented 300 req/min shadow budget for current search/pair-liquidity route family.
- DeFiLlama Free and GMX remain optimization/telemetry-only until verified limits exist.
- Added logical shadow wrapping for DeFiLlama, DexScreener and GMX registry calls.
- Added quota-hint telemetry for Retry-After and known rate-limit headers.
- Preserved Shadow invariant: no provider call is blocked, delayed, deduplicated or cache-substituted yet.
- Added Phase 1 contract test and documentation.

# IA-TB v2.0 DEBUG — API Request Orchestrator + Data Source Policy v1 (Shadow)

- Validated R&D architecture D + E + H + G-lite.
- Added provider-agnostic API Request Orchestrator modules: Broker, Double Budget, Priority metadata, in-flight registry and shadow observation.
- Added Data Source Policy v1 with freshness, priority, criticality, retention and distribution metadata.
- Added CoinGecko policy and first live SHADOW integration without changing or blocking legacy provider calls.
- Added CoinGecko short/long budget telemetry with monthly reserve.
- Added duplicate in-flight and cache-opportunity telemetry.
- Added migration DEVMAP: SHADOW -> NATIVE; Proxy remains optional.
- Added contract test for Shadow Mode behavior.
- No Engine contract, Analytics Model Runtime logic or trading authority changed.

# IA-TB v2.0 DEBUG — DeFiLlama Public Data Surface Preparation

- Expanded the DeFiLlama Market Data provider to represent all 29 documented public/free non-Yield endpoints.
- Added public access surfaces for TVL/history, token prices, stablecoin detail/history, DEX volume, options volume, open interest, fees, revenue and holders revenue.
- Parameterized chain/protocol/token/history endpoints are available on demand for future IA-TB modules without forcing periodic collection.
- Yield remains explicitly outside this workstream and existing compatibility code is left untouched.
- Premium/pro-api endpoints are explicitly excluded: no API key dependency introduced.
- No Analytics Model Runtime calculation, scoring, state derivation or trading logic added.
- Added a contract test locking the 29-endpoint free/public surface and the Yield/Premium exclusions.

# IA-TB v1.11.7 — Fundamental Event Engine Integration

- Integrated Le Geek Fundamental Event/Scoring patch originally targeting v1.11.1 onto current v1.11.6 base.
- Fundamental Event Engine and Corroboration/Scoring remain internal subprocesses: no new service and no new port.
- Fundamental database schema migration v5 (additive).
- Extended Fundamental CP/1 commands/events while preserving historical commands.
- Fundamental remains INFORMATION_ONLY and has no trading authority.
- Preserves v1.11.2–v1.11.6 Trading-IA, Market Data, timeframe and health stabilization changes.

# v1.11.6 — Timeframe & Health Stabilization

- Force un rafraîchissement Market Data lors d’un changement de symbole/timeframe afin d’éviter toute réutilisation d’un snapshot précédent.
- Vérifie l’espacement réel des bougies contre le timeframe demandé côté Market Data Provider. Une réponse incohérente est refusée au lieu d’afficher silencieusement des bougies 1m sous 1h/4h.
- Le statut Trading IA affiche maintenant le timeframe demandé et reçu.
- Les labels temporels 1h/4h affichent date + heure afin de rendre le changement d’échelle visible.
- Stabilise les probes Admin: timeout porté à 2,6 s pour les Engines, 4 s pour l’UI et 4,2 s pour Core/Router, avec une seconde tentative sur timeout/reset.
- Un timeout de probe est marqué DEGRADED au lieu d’être présenté comme un arrêt certain.

# v1.11.5 — Native Chart Render Repair

- Répare la jonction directe Router/Market Data -> UI Trading-IA -> Moteur Graphique IA-TB.
- Corrige la panne racine du Canvas v1.1: perte du contexte `this` pendant le calcul de l’échelle des séries prix, qui levait une TypeError dès qu’une bougie devait être dessinée.
- Le graphique accepte et dessine désormais un snapshot d’une seule bougie au lieu de rester vide.
- Le polling réinjecte le lot complet de bougies reçu et peut donc reconstruire/backfiller l’historique après une réponse partielle.
- Normalisation OHLCV défensive côté UI sans ajouter de service, Engine ni port.
- Le changement de contexte efface les anciennes bougies afin d’éviter un affichage périmé.
- Ajoute un état de diagnostic de rendu: reçues, normalisées, acceptées et rendues.
- Le statut Market Data affiche le nombre réel de bougies reçues.
- Native Chart Engine passe en v1.2.0.
