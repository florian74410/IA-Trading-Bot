# IA-TB v1.11.7 — Fundamental Event Engine integration

Base: v1.11.6. Source patch: Le Geek patch originally prepared for v1.11.1.

Integration is selective and limited to Fundamental Engine + CP/1 Fundamental registry. No UI, Market Data, Chart, Admin health, Router implementation, or ProcessRegistry service topology is replaced.

Event Engine and Corroboration/Scoring are internal to Fundamental Engine on port 8015. No new port/service. Fundamental remains INFORMATION_ONLY.

Validated in integration environment: SHA source patch, Node syntax, Event Engine mock scoring, real CP/1 Router registration/request/event, legacy CP/1 command preservation, v1.11.3 exchange-switch regression, v1.11.4 data-pipeline regression, v1.11.5 native chart render regression, v1.11.6 timeframe/health regression, release version guard.

Full Fundamental service startup with better-sqlite3 cannot be executed on Linux because the shipped native addon is Mach-O x86_64 for macOS. This remains a target-Mac runtime validation item.
