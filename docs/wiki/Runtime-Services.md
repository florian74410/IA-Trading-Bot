# ⚙️ Services, ports et runtime — V2.0 DEBUG

## Pour débuter

**Chaque grande fonction d'IA-TB tourne comme un service séparé. Si un moteur tombe, cela permet de savoir précisément lequel pose problème et évite de donner à un seul processus tous les pouvoirs.**

<small>🔧 Source : `Core/ProcessRegistry/manifests/*.json` du build V2.0 DEBUG.</small>

| Ordre | Service | Port | Dépendance principale |
|---:|---|---:|---|
| 10 | Core | 8001 | — |
| 15 | UI | 8000 | Core + Router |
| 20 | Router | 8021 | — |
| 40 | Indicator | 8012 | — |
| 50 | Market Data | 8013 | — |
| 60 | Liquidity | 8014 | — |
| 70 | Fundamental | 8015 | — |
| 80 | Trading | 8016 | — |
| 90 | Firewall | 8017 | Trading/Market Data |
| 100 | Strategy v2 | 8018 | Router |
| 110 | Risk | 8019 | Router |
| 115 | Portfolio | 8020 | Router/Trading optionnels |
| **120** | **Supervisor** | **3000** | **Router** |

<details>
<summary><b>➕ En savoir plus — Supervisor runtime</b></summary>

Le Supervisor est `defaultEnabled:true`, redémarrable et journalise dans `.runtime/logs/supervisor.log`. Market Data, Indicators, Fundamental, Liquidity, Portfolio, Strategy, Risk, Trading et Firewall sont des dépendances optionnelles : l'orchestrateur peut donc signaler un contexte dégradé plutôt que prétendre disposer de données absentes.

Il se réenregistre dynamiquement auprès du Router au démarrage puis périodiquement.

</details>

<details>
<summary><b>➕ En savoir plus — sécurité par défaut</b></summary>

Trading démarre avec `IATB_TRADING_LIVE=0`. Les réglages V2.0 ont également `autonomousTrading.masterEnabled=false`, mode `OFF`, `liveGuardedEnabled=false` et provider LLM `MOCK` par défaut.

</details>
