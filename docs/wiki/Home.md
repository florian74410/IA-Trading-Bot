# 📚 IA-TB — Manuel interactif

> **Documentation publiée sur `main`, basée sur `IA-TB_Build_v1.12_DEBUG` de la branche `debug`.**

<p align="center">
  <img src="../../assets/app_architecture.jpg" alt="Architecture IA-Trading-Bot" width="100%" />
</p>

IA-TB est une application modulaire de trading et d'analyse crypto. Cette documentation est conçue pour être comprise **par couches** : l'essentiel est visible immédiatement ; les détails sont repliés sous **➕ En savoir plus**.

## 🗂️ Sommaire par chapitres

| Chapitre | Sujet | Commencer ici |
|---|---|---|
| **01** | Découvrir IA-TB | [Architecture générale](Architecture.md) |
| **02** | Utiliser l'application | [Interfaces](User-Interfaces.md) · [Trading IA](Trading-IA.md) |
| **03** | Collecter les données | [Market Data](Market-Data.md) · [Financial Data](Financial-Data-Layer.md) |
| **04** | Analyser | [Indicators](Indicator-Engine.md) · [Liquidity](Liquidity-Engine.md) · [Fundamental](Fundamental-Engine.md) |
| **05** | Décider | [Strategy v2](Strategy-Engine.md) · [Risk](Risk-Engine.md) |
| **06** | Exécuter et protéger | [Firewall](Firewall-Module.md) · [Trading Engine](Trading-Engine.md) |
| **07** | Mémoriser le portefeuille | [Portfolio](Portfolio-Engine.md) |
| **08** | Faire communiquer le système | [Router / CP1](Router-Protocol-CP1.md) · [Companion IA](AI-Companion.md) |
| **09** | Connecter les marchés | [CEX / DEX](Connectors-CEX-DEX.md) |
| **10** | Administrer IA-TB | [Runtime](Runtime-Services.md) · [Administration](Administration.md) |
| **11** | Sécurité et configuration | [Security](Security.md) · [Settings/API](Settings-API.md) |
| **12** | Installer et maintenir | [Installation](Installation.md) · [Update Manager](Update-Manager.md) · [Dépannage](Troubleshooting.md) |

## 🧭 IA-TB en une image mentale

```text
DONNÉES                    ANALYSE / DÉCISION                 EXÉCUTION
────────                   ─────────────────                 ─────────
CEX / DEX ─┐
RPC / DeFi ├─► Market Data ─► Indicators ─┐
News/Web ──┘               └► Liquidity ───┼─► Strategy ─► Risk
                    Fundamental ────────────┘             │
                                                          ▼
UI / Companion IA ◄──────────── Router CP/1 ─────────► Firewall
                         ▲                                │
                         └──────── Portfolio ◄──── Trading Engine
                                                          │
                                                          ▼
                                                       Exchange
```

**À retenir :** le Router transporte, les Engines analysent, Strategy propose, Risk mesure, le Firewall contrôle, Trading exécute et Portfolio mémorise.

<details>
<summary><b>➕ En savoir plus — pourquoi autant de modules ?</b></summary>

La séparation réduit les pouvoirs de chaque composant. Market Data peut lire le marché mais pas passer d'ordre. Strategy peut produire une intention mais ne possède pas d'adapter Exchange. Trading sait exécuter mais reçoit les commandes par le chemin protégé. L'IA n'obtient pas automatiquement de droits ADMIN.

Cette architecture facilite aussi le diagnostic : lorsqu'une donnée ou une décision paraît incorrecte, on peut identifier précisément la couche qui l'a produite.

</details>

## 🎯 Parcours conseillé

**Nouveau lecteur :** Architecture → Trading IA → Market Data → Strategy → Firewall → Trading Engine.

**Développeur :** Architecture → Runtime → Router/CP1 → ProtocolRegistry → Engines → Administration.

**Pour comprendre l'IA :** Companion IA → Fundamental → Strategy → futur Supervisor.

<details>
<summary><b>➕ En savoir plus — état des composants DEBUG 1.12</b></summary>

| Composant | Port | État |
|---|---:|---|
| UI | 8000 | actif |
| Core | 8001 | actif |
| Indicator | 8012 | actif |
| Market Data | 8013 | actif |
| Liquidity | 8014 | actif |
| Fundamental | 8015 | actif |
| Trading Engine | 8016 | actif, LIVE OFF par défaut |
| Firewall | 8017 | actif |
| Strategy v2 | 8018 | actif |
| Risk | 8019 | actif |
| Portfolio | 8020 | actif |
| Router CP/1 | 8021 | actif |
| Supervisor IA autonome | — | réservé |

</details>

## 🔎 Convention de lecture

Les liens **IA-TB** renvoient vers une autre page de ce Wiki. Les termes généraux complexes peuvent renvoyer vers une ressource encyclopédique. Les blocs **➕ En savoir plus** contiennent les détails techniques, contrats, commandes et exceptions sans alourdir la lecture principale.

> ℹ️ Certains fichiers `VERSION/manifest` hérités du build DEBUG portent encore une ancienne version. Pour cette documentation, le dossier **IA-TB_Build_v1.12_DEBUG** est la référence fonctionnelle analysée.
