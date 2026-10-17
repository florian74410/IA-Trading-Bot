# 📚 IA-TB — Wiki officiel | Guide v2.2.0

> 🧪 **Version 2.2.0 : préversion de recette.** La publication GitHub ne signifie pas que GEN-1 tourne déjà sur 2.2.0. La production stable antérieure est **v2.1.1**. Ce guide est basé sur la release [v2.2.0](https://github.com/florian74410/IA-Trading-Bot/releases/tag/v2.2.0).

## 🚀 Commencer ici

| Votre objectif | Page à lire |
|---|---|
| 👋 Découvrir l'application et se connecter | **[Guide de démarrage v2.2](V2.2-Guide-de-demarrage.md)** |
| 🔐 Comprendre les comptes ADMIN, USER, GUEST et les sessions | **[Auth21 et User Management](V2.2-Comptes-et-roles.md)** |
| 🏗️ Comprendre les 13 services et les Engines | **[Architecture et moteurs v2.2](V2.2-Architecture-et-moteurs.md)** |
| 🧪 Savoir ce qui marche, ce qui reste interdit et comment tester | **[Recette GEN-1 et limites](V2.2-Recette-et-limites.md)** |
| 🛠️ Procédure technique officielle pour la stack de test | [Recette GEN-1 v2.2.0](../GEN1_TEST_2.2.0.md) |

**Comment lire ce wiki ?** Chaque page commence par une explication simple et conserve les termes techniques avec leur définition. Les diagrammes Mermaid sont affichables par GitHub et les tableaux synthétisent les rôles et services.

### Autres chapitres existants

Les pages historiques ci-dessous documentent surtout les architectures **DEBUG v2.0 / v2.1**. Elles restent utiles pour comprendre les moteurs, mais leurs chemins, ports et comportements ne doivent pas être considérés comme les consignes de déploiement v2.2.0.

---

# 📜 Documentation historique — IA-TB V2.0 DEBUG

> **🟢 En simple : IA-TB est une application de trading crypto modulaire. Elle sépare la collecte des données, l’analyse technique, l’analyse fondamentale, les stratégies, le risque, l’exécution des ordres, le portefeuille et la Banque afin qu’un seul module ne puisse pas tout faire sans contrôle.**

Le build documenté ici est **`builds/IA-TB_Build_v2.0_DEBUG`** de la branche **`debug`**. Cette documentation décrit le fonctionnement observé dans le code, les manifests du Process Registry et les contrats CP/1 actuels.

---

## 🗺️ Vue générale

**🟢 En simple : l’interface parle au Core ou au Router. Le Router distribue ensuite les demandes aux bons moteurs. Les données financières passent par un Firewall de données et les ordres passent par le Risk Gate puis le Trading Firewall avant d’atteindre un exchange.**

```mermaid
flowchart LR
    U[👤 Utilisateur] --> UI[🖥️ UI Service :8000]
    UI --> CORE[🧩 Core Server :8001]
    UI -->|lecture contrôlée| R[🔀 Router CP/1 :8021]

    R <--> MD[📡 Market Data :8013]
    R <--> IND[📐 Indicator :8012]
    R <--> LIQ[💧 Liquidity :8014]
    R <--> FUND[🧭 Fundamental :8015]
    R <--> STRAT[🧠 Strategy v2 :8018]
    R <--> RISK[🛡️ Risk :8019]
    R <--> PORT[📊 Portfolio :8020]
    R <--> SUP[🤖 Supervisor :3000]

    MD --> DFW[🧱 Data Firewall :8017]
    DFW --> R

    SUP -->|intention| RISK
    RISK -->|risk_approval_id| FW[🔥 Trading Firewall :8017]
    FW --> TR[⚡ Trading Engine :8016]
    TR --> EX[🏦 Binance / OKX / Kraken / GMX]
    TR -->|événement d'exécution| R
    R --> PORT
```

> Le **Firewall** utilise le même service sur le port `8017`, avec des workers séparés pour la protection Trading et Market Data.

---

## 🚦 Services principaux

**🟢 En simple : chaque moteur a un rôle précis et tourne comme un service séparé. Cela permet de le diagnostiquer, le redémarrer et le faire évoluer sans transformer toute l’application en un seul bloc.**

| Service | Port | Rôle actuel |
|---|---:|---|
| 🖥️ UI Service | 8000 | pages web et passerelle UI |
| 🧩 Core Server | 8001 | API applicative, Banque, Settings, sécurité, administration |
| 🐙 Kraken Add-On | 8011 | connecteur Kraken historique |
| 📐 Indicator Engine | 8012 | indicateurs techniques et langage IIL |
| 📡 Market Data Collector V2.0 | 8013 | données marché + données financières CeFi/DeFi |
| 💧 Liquidity Engine | 8014 | liquidité, zones, liquidations, contexte financier |
| 🧭 Fundamental Engine V3 | 8015 | news, événements, synthèses, mémoire temporelle |
| ⚡ Trading Engine | 8016 | exécution technique autorisée |
| 🔥 Firewall | 8017 | protection Trading + Market Data |
| 🧠 Strategy Engine v2 | 8018 | évaluation de stratégies, signaux, aucune exécution |
| 🛡️ Risk Engine | 8019 | analyse risque + Risk Gate |
| 📊 Portfolio Engine | 8020 | positions, événements, balances, PnL, historique |
| 🔀 Communication Router | 8021 | routage CP/1 et registre runtime |
| 🤖 IA Supervisor | 3000 | orchestration du contexte et raisonnement IA |

---

## 📚 Lire le Wiki par fonction

### 🏗️ Architecture et communication
- [🚦 État fonctionnel V2.0 DEBUG](Etat-V2.0-DEBUG.md)
- [🏗️ Architecture complète](Architecture.md)
- [🔀 Router Protocol / CP/1](Router-Protocol-CP1.md)
- [🖥️ Interface et pages de l’application](Application-UI.md)

### 📡 Données et analyse
- [📡 Market Data Collector V2.0](Market-Data.md)
- [📐 Indicator Engine](Indicator-Engine.md)
- [💧 Liquidity Engine](Liquidity-Engine.md)
- [🧭 Fundamental Engine V3](Fundamental-Engine.md)
- [📈 Chart Viewer](Chart-Viewer.md)

### 🧠 Décision, risque et exécution
- [🤖 IA Supervisor](Supervisor-IA.md)
- [🧠 Strategy Engine v2](Strategy-Engine.md)
- [🛡️ Risk Engine](Risk-Engine.md)
- [🔥 Firewall](Firewall-Module.md)
- [⚡ Trading Engine](Trading-Engine.md)
- [📊 Portfolio Engine](Portfolio.md)

### 🏦 Banque et sécurité
- [🏦 Banque IA-TB](Bank.md)
- [🔐 Sécurité](Security.md)
- [🔑 Settings / API](Settings-API.md)

### 🛠️ Exploitation
- [🛠️ Administration](Administration.md)
- [📦 Installation](Installation.md)
- [⬆️ Update Manager](Update-Manager.md)
- [🏷️ Versionnage et releases](Versioning-and-Releases.md)
- [🩺 Dépannage](Troubleshooting.md)
- [🗺️ Roadmap](Roadmap.md)
- [🧾 Changelog fonctionnel](Changelog.md)

---

## 🧭 Les pages de l’application

**🟢 En simple : toutes les fonctions importantes sont accessibles depuis une interface web locale, mais les pages n’accèdent pas librement aux moteurs internes. Le service UI applique des routes et des permissions précises.**

| Page | Fonction |
|---|---|
| Trading IA | graphique natif, marché de référence, modules temps réel |
| Chart Viewer | vue graphique indépendante |
| Portfolio | positions, trades, PnL, historique |
| Banque | wallets, clés, transferts, Swap/Bridge, coffres |
| Fondamental | news, événements, sources, synthèses IA |
| Paramètres | IA, API, moteurs, providers, risque, notifications |
| Stratégies | catalogue et état Strategy Engine v2, UI de consultation |
| Statistiques | snapshots financiers CeFi / DeFi |
| Admin | services, logs, Firewall, diagnostics, mises à jour |

---

## 🔐 Règles de sécurité à retenir

**🟢 En simple : une IA, une stratégie ou une page web ne doit jamais pouvoir envoyer directement un ordre à un exchange en contournant les contrôles.**

Le chemin d’exécution protégé est :

```text
Intention
  → Risk Gate
  → risk_approval_id
  → Router / CP/1
  → Trading Firewall
  → Trading Engine
  → Exchange
  → événement Portfolio
```

Les données de marché financières utilisent un autre chemin :

```text
CoinGecko / DeFiLlama / Providers
  → Market Data Collector
  → Data Firewall
  → stockage validé
  → Router / CP/1
  → Engines / UI en lecture
```

---

## ⚠️ État DEBUG

**🟢 En simple : le code possède déjà beaucoup de fonctions réelles, mais “présent dans le code” ne veut pas dire “validé avec de l’argent réel”.**

- le Trading Engine démarre par défaut avec **LIVE désactivé** ;
- le Supervisor est **INTENTION_ONLY** ;
- Strategy Engine v2 est **INTENTION_ONLY** ;
- Fundamental reste **INFORMATION_ONLY** ;
- les transferts BTC/SOL sont soumis au réseau puis doivent encore être suivis jusqu’à confirmation ;
- l’OnChain Reader actuel est surtout EVM ;
- certaines cartes visuelles de Statistiques contiennent encore des valeurs de présentation lorsqu’aucune métrique runtime correspondante n’est disponible.

Le Wiki doit conserver cette distinction entre **fonction intégrée**, **fonction partielle** et **fonction prévue**.
