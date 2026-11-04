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

## Cognitive V1 (DEBUG, opt-in route)

- `Core/supervisor_core.js` mounts `CognitiveRuntime` lazily from the real Supervisor CP/1 service.
- `supervisor.cognitive.reason` uses private SQLite short memory, self/verified memory, compact Soul and read-only registries.
- `supervisor.cognitive.status` and `supervisor.llm.models` expose safe diagnostics and the model allowlist.
- `OPENAI_API` continues through the existing CP/1 AI Gateway and OpenAI Responses API; `MOCK` remains default for DEBUG.
- Long-memory suggestions remain pending and cannot change capabilities or execute commands.
- Full logs/health analysis, operator-identity binding and authenticated write-review are **not enabled** in this V1.

See `Documentation/wiki/Supervisor-IA.md` for contracts, configuration, and safety notes.
