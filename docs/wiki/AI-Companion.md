# 🤖 Supervisor, LLM et Companion — V2.0 DEBUG

## Pour débuter

**Le Supervisor est désormais un vrai service d'IA-TB. Son rôle est de demander aux différents moteurs ce qu'ils savent, de réunir ces informations dans un contexte commun, puis de confier le raisonnement au modèle IA choisi. Il reste un orchestrateur : il ne possède pas les clés Exchange et n'exécute pas directement les ordres.**

<small>🔧 `Supervisor/supervisor_service.js` écoute sur :3000. ProtocolRegistry le marque `ACTIVE`, transport `CP1`, avec enregistrement dynamique.</small>

## Le pipeline

```text
MarketData ───┐
Indicators ───┤
Fundamental ──┤
Liquidity ────┼─► Context Orchestrator ─► LLM Manager ─► raisonnement
Portfolio ────┤
Strategy ─────┤
Risk ─────────┘
```

<details>
<summary><b>➕ En savoir plus — collecte du contexte</b></summary>

`context_orchestrator.js` lance les demandes en parallèle via `cp1_client.js`. Les cibles sont Market Data, Indicator, Fundamental, Liquidity, Portfolio, Strategy et Risk.

Chaque résultat possède un état de disponibilité. Une panne partielle ajoute un warning et `degraded:true`. Le transport déclaré dans le contexte est explicitement `CP/1 Router only`.

</details>

<details>
<summary><b>➕ En savoir plus — LLM Manager</b></summary>

Trois providers existent :
- `OPENAI_API` utilisant l'API Responses ;
- `REMOTE_LLM` utilisant une API `/chat/completions` compatible ;
- `MOCK` pour tests.

Le provider principal et le fallback sont configurables. Le défaut V2.0 est MOCK, fallback désactivé. Le Supervisor conserve provider, modèle, latence et éventuel fallback dans son état de raisonnement.

</details>

<details>
<summary><b>➕ En savoir plus — AutonomousTrading</b></summary>

L'extension découvre quatre modes : OFF, ANALYZE, PAPER et LIVE_GUARDED. PAPER demande une confirmation. LIVE_GUARDED retourne actuellement `LIVE_RUNTIME_NOT_ENABLED`.

Le `DecisionEngine` normalise une décision en `cp1.trade-intent/1.0`, mais retourne `executionAllowed:false` et rappelle que le Risk Gate doit approuver avant toute exécution.

</details>

## Companion

**Le Companion reste l'assistant visuel de l'interface ; il ne doit pas être confondu avec le Supervisor runtime.** Le Companion aide l'utilisateur dans l'UI, tandis que le Supervisor V2.0 orchestre les Engines et les providers LLM.
