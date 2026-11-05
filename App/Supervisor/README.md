# IA-TB Supervisor Runtime

Runtime service: `Supervisor/supervisor_service.js` on **127.0.0.1:3000**.

Responsibilities:
- load the selected LLM through `Supervisor/LLM/llm_manager.js`;
- discover Supervisor extensions through the Extension Manager;
- expose health/status/reasoning through authenticated CP/1;
- dynamically register with Router and retry while Router starts;
- remain an **orchestrator / intention-only** component.

Security invariant:
```
Supervisor -> TradeIntent -> Router -> Risk -> Firewall -> Trading Engine -> Exchange
```
The Supervisor must never import an exchange adapter, hold exchange credentials, or execute an order directly.

Current runtime stage:
- Supervisor service: active
- LLM Manager: active (MOCK/OpenAI/remote OpenAI-compatible VPS)
- AutonomousTrading extension discovery: active
- Trade execution from Supervisor: intentionally locked until the Risk approval contract and Firewall-to-Trading path are implemented and tested.

## Cognitive V1.1 — DEBUG (Auth21 owner-only)

The actual `supervisor_service.js` and `Core/supervisor_core.js` mount a compact
`CognitiveRuntime` with Soul, bounded working RAM, persistent short and verified
long memory, review-only proposals, protocol discovery, private backups and health.

**The cognitive conversation is never a direct CP/1 action.** A logged-in client
sends `supervisor.cognitive.reason` to Core's owner bridge; Core authorizes the
current session, signs the exact owner request and delegates any personal OpenAI
API use. The Supervisor receives it as `supervisor.user.request`, verifies the
owner proof, and scopes memory by a hash of the verified `clientId`. The
`supervisor.cognitive.reason` protocol entry uses `transport:OWNER`, and the
Function Registry marks it `hard_deny` for generic agents.

Read-only CP/1 actions:
- `supervisor.cognitive.status` — Soul/SQLite/Registry/Router/LLM readiness.
- `supervisor.llm.models` — configured provider, selected and allowed models.

Owner-verified operations:
- `supervisor.cognitive.reason` — conversation with up to two safe read-only queries.
- `supervisor.llm.select` — ADMIN only, persists allowed provider/model in Settings.

`OPENAI_API` uses the existing `LLMManager`, Auth21 delegated Core AI
Gateway and OpenAI Responses API. DEBUG CI uses MOCK only. No trading, mutation
tool calls, permission changes or cross-owner conversation reads are permitted.

SQLite location: `<IATB_RUNTIME_ROOT>/cognitive/` (private), 24-hour/40-message
retention by default. Long-memory proposals await review; no autonomous promotion.
Context is limited using a UTF-8 byte-based token **estimate**, not an exact
tokenizer. Incomplete or invalid LLM results are handled without loss of user
turns. Trusted runtime housekeeping includes `maintenance()` and `backup()`.

Sources and verification: `Documentation/wiki/Supervisor-IA.md` and
`.github/workflows/cp1-registry-integration.yml` (real Router/Supervisor,
stubbed Auth21 Core TLS and mocked LLM in DEBUG). No live OpenAI test or VPS
deployment has been performed.

## Companion Blob cockpit V1.2 (DEBUG)
The existing `Frontend/JS/companion_v1.0.js` is now a functional owner-facing control surface:
- **Supervisor** conversations use Core's Auth21 owner bridge, persistent `companion-default` short-term memory, and `GET /api/companion/history` for authorized message restoration after reload.
- **UI Actions** retain the previous command/graph logic without silently converting chat text into Engine mutations.
- **Engines** use existing Core `/communication/v1/ui/read` and `/communication/v1/ui/write` routes. The initial curated set covers health/status and two explicit owner-scoped Strategy pause/resume controls, requiring confirmation and a positive Core result.
- No unverified owner identity, LLM-generated mutation dispatch, direct exchange calls, or production release change is allowed.

See `Documentation/wiki/Supervisor-IA.md` for the full event path and verification scope.
