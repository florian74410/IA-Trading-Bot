# Data Provider Phase 1 — Shadow Integration

Status: IMPLEMENTED ON FEATURE BRANCH
Branch: feature/data-policy-orchestrator-v1

## Providers

### CoinGecko
Budget model: SHORT_AND_MONTHLY
- short window: 60 sec
- short limit: 100 cost units
- long window: 30 days
- long limit: 10,000 cost units
- reserve: 2,000 cost units
- enforcement: SHADOW ONLY

### DeFiLlama Free
Budget model: UNKNOWN
- no fabricated hard limit
- Broker optimization enabled
- Policy priority/freshness/criticality enabled
- raw REST telemetry enabled
- quota hints/429 telemetry enabled
- enforcement: NONE in Shadow

### GMX
Budget model: UNKNOWN
- no fabricated hard limit
- Broker optimization enabled where logical calls are classified
- raw REST telemetry enabled for all shared HTTP calls
- quota hints/429 telemetry enabled
- enforcement: NONE in Shadow

### DexScreener
Budget model: RPM
- /latest/dex/search family: 300 requests/minute
- no known monthly hard limit configured
- Broker optimization enabled
- Policy priority/freshness/criticality enabled
- enforcement: SHADOW ONLY

## Important semantics

UNKNOWN != UNLIMITED.

UNKNOWN means IA-TB has no verified numerical hard limit to enforce. The provider still receives:
- cache-first policy
- in-flight deduplication observation
- priority classification
- freshness classification
- criticality classification
- request telemetry
- 429/error observation
- Retry-After / known quota-header capture
- retry/backoff hooks

## Consumption truth

Logical Orchestrator events describe consumer intent.
Raw HTTP telemetry describes actual outbound request consumption.

This distinction matters for providers such as DexScreener where one logical request may fan out into several HTTP requests.

## Phase status

[x] CoinGecko profile
[x] DeFiLlama Free profile
[x] GMX profile
[x] DexScreener profile
[x] UNKNOWN hard-limit semantics
[x] quota hint telemetry
[x] Shadow integration
[x] static syntax validation
[ ] execute runtime test suite on IA-TB Node runtime
[ ] observe normal workload telemetry
[ ] Phase 2 weighted-budget design (Binance / Hyperliquid)
