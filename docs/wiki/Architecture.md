# 🏗 Architecture générale — V2.0 DEBUG

## Vue débutant

**IA-TB fonctionne comme une équipe de spécialistes. Market Data observe le marché, les moteurs l'analysent, Strategy propose une lecture, Risk mesure et contrôle le risque, le Supervisor rassemble le tout pour le raisonnement IA, puis Firewall et Trading Engine forment la frontière d'exécution. Aucun de ces composants ne doit tout pouvoir faire seul.**

<small>🔧 Architecture multi-processus locale. Les échanges inter-moteurs passent par Router CP/1 :8021. Le Supervisor V2.0 est un service actif :3000 et utilise lui aussi CP/1 plutôt que des imports directs des Engines.</small>

```text
                           UI :8000
                              │
                         Core :8001
                              │
                      Router CP/1 :8021
     ┌─────────┬─────────┬──────────┬─────────┬──────────┬─────────┐
     ▼         ▼         ▼          ▼         ▼          ▼         ▼
Indicator   Market    Liquidity  Fundamental Strategy   Risk   Portfolio
 :8012      :8013      :8014      :8015      :8018    :8019    :8020
     └─────────┴─────────┴──────────┴─────────┴──────────┴─────────┘
                              │
                              ▼
                      Supervisor :3000
                       LLM / Extensions
                              │
                         TradeIntent
                              │
                              ▼
                        Risk Gate :8019
                              │
                              ▼
 Router ───────────────► Firewall :8017 ─────────► Trading :8016
                                                   │
                                             Exchange adapters
```

<details>
<summary><b>➕ En savoir plus — Supervisor V2.0</b></summary>

Le `context_orchestrator.js` lance en parallèle sept demandes CP/1 : candles Market Data, analyse Indicator, Fundamental, snapshot Liquidity, snapshot Portfolio, évaluation Strategy et snapshot Risk. Chaque demande est isolée : une source indisponible ajoute un warning et marque le contexte `degraded` au lieu de masquer l'erreur.

Le contexte normalisé `supervisor.autonomous-context/1.0` est ensuite transmis au LLM Manager. Les providers présents sont `OPENAI_API`, `REMOTE_LLM` compatible OpenAI et `MOCK`, avec fallback optionnel.

Le Supervisor reste `ORCHESTRATOR / INTENTION_ONLY`. Il n'importe aucun adapter Exchange.

</details>

<details>
<summary><b>➕ En savoir plus — chaîne d'exécution protégée</b></summary>

Une intention exécutable doit respecter la chaîne :

`Supervisor → TradeIntent → Router → Risk Gate → Firewall → Trading Engine → Exchange`.

Le Risk Gate lie une approbation temporaire au hash SHA-256 de l'intention normalisée. Le Firewall demande ensuite au Risk Gate de vérifier cette approbation et peut la consommer. Modifier l'intention après approbation provoque donc un mismatch.

Le Firewall conserve en plus authentification CP/1, signature, timestamp, whitelist de commandes/paires et protection anti-duplication.

</details>

<details>
<summary><b>➕ En savoir plus — Bank / Vaults</b></summary>

V2.0 introduit aussi une couche Bank/Vault. Le registre supporte Arbitrum, Avalanche, Ethereum, Polygon et Bitcoin avec actifs autorisés par réseau. Les Vaults créés par ADMIN commencent en `DRAFT` : créer leur configuration ne déploie pas un smart contract et ne déplace aucun fonds.

Voir [Bank & Vaults](Bank-Vaults.md).

</details>
