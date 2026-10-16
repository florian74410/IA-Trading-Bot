# IA-TB v2.0.4 DEBUG — Indicateurs Trading IA

- Rétablit le dock réellement présent dans la page et supprime les coupures de hauteur ; corrige l’exception `this.series` du renderer natif et le bouton Restaurer.
- Un seul lecteur des panneaux JSON, batch appliqué une fois ; oscillateurs synchronisés aux timestamps/fenêtres des bougies, histogramme MACD et superpositions de prix sans faux zéros de chauffe.
- Contexte exchange/paire/timeframe, réponses tardives écartées, demandes concurrentes regroupées et sélection retirée respectée ; pas de calcul technique dans le navigateur.
- Métadonnées applicatives alignées sur 2.0.4 ; correctifs CeFi/DeFi déjà publiés conservés. Tests et procédure manuelle GEN-1 : `Documentation/INDICATORS_DEBUG_2.0.4.md`. Aucun déploiement automatique ni démarrage Trading.

# IA-TB v2.0.2.1 DEBUG — Hotfix volume mondial CoinGecko

- Anomalie confirmée à la source : CoinGecko /global a retourné total_volume.usd ≈ 1e21 USD pour une capitalisation ≈ 2.8e12 USD.
- Garde conservatrice ciblée : si le volume mondial 24 h dépasse 1000 fois la capitalisation, la métrique est déclarée indisponible avant le Data Firewall et le nouveau stockage. Les autres données CeFi sont préservées.
- Interface : N/D explicite pour la valeur courante, filtrage des anciennes observations incohérentes pour la variation, sans suppression historique.
- Aucun changement de quotas/réessais, de Router, de liquidations ou du Trading Engine. Validation GEN-1 requise avant déclaration stable.

# IA-TB v2.0.2 DEBUG — Gel des correctifs CeFi / DeFi

- Périmètre figé : autorisations de lecture et affichage Statistiques, DexScreener → Data Firewall → cache/SQLite, classements Top Pools, estimations d'exécution explicitement non exécutables, historiques CeFi/DeFi et rafraîchissement asynchrone.
- CoinGecko : déduplication des requêtes, budget persistant, réduction de cadence et pause après HTTP 429 avec conservation des dernières données CeFi validées.
- Liquidations CeFi : normalisation par type de contrat, conversion USD contrôlée, reçus Firewall, déduplication, agrégation SQLite 24 h et affichage des montants observés partiels sans valorisation fictive des événements historiques.
- Validation réelle GEN-1 : affichage de nouveaux événements valorisés observé ; test rapide et observation CoinGecko sur 65 min à clôturer avant toute qualification de stabilité générale.
- Reporté à v2.0.3 : tracé des indicateurs sur le graphique Trading IA, données Bridges DeFi (provider non connecté).
- Trois échecs de tests historiques documentés et non traités : test_risk_gate_boundary, test_client_action_ack_v1, test_router_normalization_v1.8.12.
- Branche : debug-v2.01 ; aucun déploiement GEN-1 ni démarrage du Trading Engine dans ce commit de gel.

# IA-TB v2.0.1 DEBUG — Étape 4/4 : CoinGecko et liquidations CeFi

- CoinGecko : fréquences réduites, déduplication des appels, budget SQLite persistant et pause 429/Retry-After ; dernières statistiques CeFi validées conservées en cas d’erreur.
- Liquidations : unités et prix explicites, contrats OKX via métadonnées validées, conversion observée USDT/USDC vers USD sans parité fictive, reçus et décision Firewall avant stockage ; replays dédupliqués.
- Agrégation de toute la fenêtre SQLite 24 h, montants partiels/N/D, comptes et sources affichés ; anciens événements sans preuve conservés mais non valorisés comme USD fiables.
- Tests locaux et procédure manuelle GEN-1 dans `Documentation/FINAL_STEP4_DEBUG_2.0.1.md`. Aucun déploiement ; version applicative 2.0.1 maintenue, validation Overflow attendue.

# IA-TB v2.0.1 DEBUG — Étape 3/4 : interface Statistiques

- Top Pools lisibles et adaptables dans DeFi, métriques manquantes explicites et sources distinctes ; estimation d’exécution sans faux total fiable.
- Historiques strictement bornés, unités/provenance et variations nettes des stablecoins clarifiées ; OI/liquidations via leurs actions existantes désormais ouvertes en lecture limitée.
- Rendu indépendant des sources, absence de refresh initial forcé, déduplication, chargement par onglet ; lecture optionnelle du dernier snapshot validé pendant son actualisation asynchrone.
- Validation locale : Firefox headless 153.0, Node 22.23.3 ; suites et procédure manuelle GEN-1 détaillées dans `Documentation/STATISTICS_STEP3_DEBUG_2.0.1.md`. Aucun déploiement ; validation visuelle/fonctionnelle Overflow attendue avant étape 4.

# IA-TB v2.0.1 DEBUG — Étape 2/4 : Firewall, cache et persistance DexScreener

- Les pools et leurs sommes traversent désormais le Data Firewall ; décision explicite exigée avant SQLite et cache, refus du bypass et des erreurs de validation.
- Cache partagé entre les écritures équivalentes ETHUSDC/ETH/USDC, copies indépendantes des snapshots ; TTL et intervalle SQL existants conservés.
- Quote réelle conservée dans l’historique ; erreurs fournisseur, réponse vide et échec SQLite explicites. Compteurs de persistance exposés dans le statut DEX.
- Validation locale sous Node 22.23.3 : 9/9 scénarios DEX, 13/16 scripts de régression ; trois échecs reproduits sur le commit initial, détaillés dans `Documentation/DEXSCREENER_STEP2_DEBUG_2.0.1.md`.
- Script de validation réelle GEN-1 fourni, non exécuté ici. Aucun déploiement ; étape 2 en attente de validation Overflow sur GEN-1, étapes 3/4 non commencées.

# IA-TB v2.0.1 DEBUG — Étape 1/4 : lecture DexScreener

- Autorise `marketdata.dex.liquidity.snapshot` dans le canal UI READ_ONLY du Router, avec uniquement `symbol` et `force`, conformément au registre CP/1.
- Conserve la collecte et le contrôle Data Firewall existants ; aucune route directe fournisseur ni activation Trading.
- Aligne les métadonnées du runtime App sur la version de travail 2.0.1 (elles indiquaient encore 2.0.0). Les builds historiques restent inchangés.
- Validation locale sous Node.js 24.19.0 : 8/10 tests passent (Communication, contrat UI, lecture Strategy, pipeline liquidité, frontière cache/Firewall). Les échecs `test_client_action_ack_v1.js` (chart.add_indicator absent) et `test_router_normalization_v1.8.12.js` (Supervisor ACTIVE au lieu de RESERVED) sont reproduits à l’identique sur le commit initial `63812c7c` ; ils sont préexistants et hors du correctif DexScreener.
- Test HTTP local dédié : routage CP/1 signé, réponse de liquidité, refus des arguments/actions non autorisés et propagation du rejet Firewall. Validation GEN-1 à effectuer après reconstruction de l’image ; les données du test sont des fixtures locales.

# IA-TB v2.0 DEBUG — Local UI / Market Data validation fixes

- Large dynamic symbol catalogues are now validated by the Data Firewall in bounded chunks instead of being rejected by the global 512 KiB payload ceiling; Trading IA can therefore consume the full provider market list instead of falling back to BTC/ETH/SOL.
- Market Registry timestamps are rendered in the browser local timezone instead of raw UTC ISO format.
- Manual Market Registry refresh no longer surfaces provider/busy failures as opaque `CP_ENGINE_HTTP_500`; the last valid Registry snapshot remains visible with a degraded synchronization message.
- Trading IA adds a chart bootstrap/recovery path on page show so returning through the global navigation reloads Market Data automatically without requiring a manual exchange click.
- MarketData Shadow Contract Tests remain green on `debug`.

# IA-TB v2.0 DEBUG — Dynamic Trading market catalogue

- Trading IA market selector now consumes each Market Data provider's real dynamic symbol catalogue instead of falling back to BTC/ETH/SOL only.
- Added dynamic symbol discovery for Binance Spot, Kraken Spot, OKX Spot, Bybit Linear Perpetuals and Hyperliquid Perpetuals; GMX already exposed its dynamic pairs catalogue.
- Provider adapters keep a runtime symbol-to-provider-instrument mapping so catalogue entries remain usable for OHLCV requests, including non-default quote currencies.
- Market symbol catalogues now pass through the Data Firewall before Router/UI distribution.
- Added the `MARKET_SYMBOLS` Firewall data type and advertised the `symbols` capability in the provider catalogue.
- Added CI contract `Dynamic Symbol Catalog` and enabled MarketData contract CI on the `debug` branch.

# IA-TB v2.0 DEBUG — Local startup migration fix

- Restored `Core/Services/fundamental_ai_synthesis_v3.js`, required by Fundamental Engine AI synthesis.
- Restored `Core/Services/usage_ledger_v1.js`, shared by Fundamental and Portfolio Engines.
- Fixes local startup failures `MODULE_NOT_FOUND` on ports 8015 and 8020 after the v2.0 DEBUG migration.

# IA-TB v2.0 DEBUG — API Request Orchestrator V1 validated

- Orchestrator V1 Shadow accepted for integration in `v2.0_DEBUG`.
- Final 60-minute Shadow Long Run: GitHub Actions `37712721434`.
- Representative workload completed 12 cycles / 120 CP/1 actions with 120 successes, 0 soft failures and 0 hard failures.
- Confirmed resilience when individual providers are unavailable or region-limited; Open Interest remains usable with partial compatible-provider coverage rather than invented data.
- Provider fallbacks remain observation-only in V1; no Native decision enforcement is enabled.
- Explicit `SPOT_ORDERBOOK` / `PERP_ORDERBOOK` datasets prevent semantic fallback ambiguity.
- Currency Registry v1 is integrated into Open Interest normalization; stable assets are normalized with observed USD prices and are excluded from totals if conversion is unavailable.
- Trust boundary remains `Provider -> Data Firewall -> cache/storage`; raw Provider caching is forbidden.
- Known V1 limitations are accepted and moved to Orchestrator V2 backlog: unified microstructure decision telemetry, richer runtime health/routing and Long-Run Analyzer improvements.
- Run observations retained for future optimization: Bybit HTTP 403 from the GitHub runner environment, CoinGecko rate-limit signals, and DeFiLlama as the dominant network-traffic source.

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
