# IA-TB — Supervisor Engine 3.0-dev.1 (foundation)

Base: `feature/iatb-2.6.0-dev.7-order-scenarios-verified`.
Feature branch: `feature/iatb-3.0.0-dev.1-supervisor-foundation`.
The application release identifiers remain on 2.6.0-dev.7 until the 3.0 integration is qualified.

## Scope

The first iteration does **not** introduce another Supervisor service.
It attaches to the existing `supervisor.user.request` authenticated CP1 owner path
and the existing `AgentEngineGateway`.

- `App/Supervisor/Engine/working-memory.js`: SQLite WAL, owner/session/room
  scoping, durable objective, revision and bounded verified CP1 observations.
- `App/Supervisor/Engine/supervisor-engine.js`: owner-verified context,
  objective changes, permitted discovery and allowlisted observations.
- `App/Supervisor/Core/supervisor_core.js`: lazily instantiated Engine attached
  to the existing Supervisor lifecycle, no duplicate service.
- `App/Supervisor/CognitiveRuntime/index.js`: loads the same working-memory
  snapshot into the LLM reasoning context; does not move memory into a provider.
- `App/Core/Clients/UserManagement/owner_policy.js` and `cp_bridge.js`:
  Auth21 owner-only entry points and delegation of an existing agent session.

## Owner-scoped API through the existing CP1 bridge

Authenticated owner requests (not public CP1 commands):

| Action | Input | Meaning |
| --- | --- | --- |
| `supervisor.engine.objective` | `{room?, objective}` | Persist/replace a working objective |
| `supervisor.engine.context` | `{room?}` | Load memory, verified facts summary and short conversation |
| `supervisor.engine.discover` | `{room?}` | Load context and discover available agent commands |
| `supervisor.engine.observe` | `{room?, engine, command}` | Invoke one permitted, read-only CP1 Engine command and store its observation |

All four actions travel inside the existing `supervisor.user.request` envelope.
Core verifies the Auth21 session, role and owner proof. The Supervisor verifies
the owner proof again at its ingress. `engine.observe` requires a valid
owner-bound Gateway session and effective Function Registry grant. A distinct `supervisor_engine` agent identity is registered for this purpose, separate from the ChatBot's `chatbot` identity. Existing gateway token caching has been scoped by both owner session and agent ID. The implementation does not create grants.

Examples of the **inner request** (for a caller already using Core's authenticated
bridge):

```json
{"target":"supervisor","action":"supervisor.engine.objective","arguments":{"room":"btc_analysis","objective":"Examiner les risques de marché de BTC-USDT"}}
```

```json
{"target":"supervisor","action":"supervisor.engine.discover","arguments":{"room":"btc_analysis"}}
```

```json
{"target":"supervisor","action":"supervisor.engine.observe","arguments":{"room":"btc_analysis","engine":"risk","command":"risk.status"}}
```

The gateway still checks per-agent permission, live Engine publication, contract
qualification and argument schemas. Observation is restricted to a small hard-coded
read-only command allowlist. No arbitrary command, shell, account mutation,
order execution or autonomously created sub-agent is available.

## Memory semantics

The working DB lives under `IATB_RUNTIME_ROOT/supervisor-engine/working.sqlite`
(or `App/.runtime/supervisor-engine/working.sqlite` when no override is set),
with directory mode 0700 and DB mode 0600.

Scope is the verified Auth21 owner, active session hash, and a bounded room ID.
An objective change invalidates observations from the previous objective.
Up to 48 observations are retained per working session; the context returns
the 12 most recent. Each observation includes its command, timestamp, status
and optional contract hash. Failed readings are recorded as unavailable/denied
instead of being synthesized as real observations.

`CognitiveRuntime.reason` continues to load the existing short and long memory,
and now additionally supplies a compact snapshot of the current working objective
and up to four observations to the model, using the current authenticated session
and `sessionId` matching the engine room. Memory is application-owned and is
independent of the OpenAI or remote provider chosen by `LLMManager`.

Stored observations are untrusted data, not instructions. This first iteration
does not treat them as live truth indefinitely; callers must refresh values
through CP1 when their validity matters.

## Limitations / next iterations

1. Full context recovery after restarts, including outstanding task ledger.
2. Stable task lifecycle, dependency graph and parent/child sub-agent hierarchy.
3. Explicit observation freshness policies and schema migration.
4. Correlated messages and completion receipts between agents.
5. Wider qualified read commands and adaptive discovery by schema.
6. Independent Supervisor Engine 3.0 tests, chaos scenarios and controlled
   deployment qualification.

## Development status

**Source implementation only.** This branch has not passed the integration
suite, CI qualification, real VPS validation, or any financial execution test.
Do not merge into `main` or deploy as a 3.0 release until validated.
