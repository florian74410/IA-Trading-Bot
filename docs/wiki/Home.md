# 📚 IA-TB — Manuel interactif V2.0 DEBUG

> **Documentation publiée sur `main`, basée sur le code de `builds/IA-TB_Build_v2.0_DEBUG/` de la branche `debug`.**

**🟦 Pour débuter : IA-TB V2.0 sépare la collecte des données, l'analyse, le raisonnement IA, le contrôle du risque et l'exécution. Le nouveau Supervisor agit comme orchestrateur : il rassemble le contexte produit par les moteurs, mais ne possède ni adapter Exchange ni droit d'exécution directe.**

<small>🔧 Référence technique : `VERSION=2.0.0`. Certains fichiers hérités (`manifest.json`, commentaires et assets) portent encore des numéros 1.x ; le Wiki privilégie le code runtime et les registries de V2.0 DEBUG.</small>

## 🗂️ Chapitres

| # | Chapitre | Pages |
|---:|---|---|
| 01 | Comprendre IA-TB | [Architecture](Architecture.md) · [Runtime](Runtime-Services.md) |
| 02 | Utiliser l'application | [Trading IA](Trading-IA.md) · [Interfaces](User-Interfaces.md) |
| 03 | Collecter | [Market Data](Market-Data.md) · [Financial Data](Financial-Data-Layer.md) |
| 04 | Analyser | [Indicators](Indicator-Engine.md) · [Liquidity](Liquidity-Engine.md) · [Fundamental](Fundamental-Engine.md) |
| 05 | Décider | [Strategy v2](Strategy-Engine.md) · [Risk](Risk-Engine.md) |
| 06 | Orchestrer avec l'IA | [Supervisor & Companion](AI-Companion.md) |
| 07 | Protéger et exécuter | [Firewall](Firewall-Module.md) · [Trading Engine](Trading-Engine.md) |
| 08 | Suivre le capital | [Portfolio](Portfolio-Engine.md) · [Bank & Vaults](Bank-Vaults.md) |
| 09 | Communiquer | [Router / CP1](Router-Protocol-CP1.md) |
| 10 | Exchanges | [CEX / DEX](Connectors-CEX-DEX.md) |
| 11 | Administrer | [Administration](Administration.md) · [Settings/API](Settings-API.md) · [Security](Security.md) |
| 12 | Maintenir | [Installation](Installation.md) · [Update Manager](Update-Manager.md) · [Dépannage](Troubleshooting.md) |

## 🧭 Flux V2.0 en lecture rapide

```text
Market Data ─────┐
Indicators ──────┤
Fundamental ─────┤
Liquidity ───────┼──► Supervisor :3000 ─► LLM
Portfolio ───────┤            │
Strategy ────────┤            └──► TradeIntent (préparation)
Risk snapshot ───┘                         │
                                          ▼
                                      Router CP/1
                                          │
                                          ▼
                                      Risk Gate
                                          │
                                  approval temporaire
                                          ▼
                                       Firewall
                                          │
                                          ▼
                                   Trading Engine
                                          │
                                          ▼
                                       Exchange
```

**Le point essentiel : une décision IA n'est pas un ordre. V2.0 impose plusieurs frontières entre le raisonnement et l'exécution.**

<details>
<summary><b>➕ En savoir plus — état réel de l'autonomie</b></summary>

Le Supervisor est **ACTIVE** dans ProtocolRegistry et ProcessRegistry, sur `127.0.0.1:3000`. Il expose notamment `supervisor.context`, `supervisor.analyze`, `supervisor.reason` et `supervisor.risk.evaluate`.

L'extension AutonomousTrading prévoit `OFF`, `ANALYZE`, `PAPER` et `LIVE_GUARDED`. Dans ce build DEBUG, `LIVE_GUARDED` est volontairement verrouillé et le Decision Engine retourne `executionAllowed:false`. PAPER demande une confirmation explicite.

</details>

## ⚙️ Carte runtime V2.0

| Service | Port | Rôle |
|---|---:|---|
| UI | 8000 | interface |
| Core | 8001 | fonctions applicatives |
| Indicator | 8012 | indicateurs |
| Market Data | 8013 | données marché |
| Liquidity | 8014 | liquidité |
| Fundamental | 8015 | fondamental |
| Trading Engine | 8016 | exécution |
| Firewall | 8017 | protection |
| Strategy v2 | 8018 | stratégie |
| Risk | 8019 | analyse + Risk Gate |
| Portfolio | 8020 | état financier |
| Router CP/1 | 8021 | bus interne |
| **Supervisor** | **3000** | **orchestration IA** |

## 📖 Comment lire ce Wiki

**Les paragraphes en gras expliquent le concept sans supposer de connaissances techniques.**

<small>Les lignes 🔧 donnent ensuite les détails d'implémentation : fichier, port, contrat, schéma ou comportement runtime.</small>

Les sections **➕ En savoir plus** contiennent l'analyse approfondie sans surcharger la première lecture.
