# IA-TB — Wiki complet

> **Référence technique : build `IA-TB_Build_v1.12_DEBUG` de la branche `debug`.**  
> Le Wiki est publié sur `main`. Il décrit le comportement du build DEBUG 1.12 ; lorsqu'un ancien document embarqué contredit le code, les manifestes runtime et ProtocolRegistry les plus récents font foi.

IA-TB est une architecture locale modulaire de trading et d'analyse crypto. Elle sépare **collecte**, **analyse**, **stratégie**, **risque**, **exécution**, **sécurité**, **portefeuille**, **IA** et **interface** afin qu'aucun composant n'ait à lui seul tous les pouvoirs.

## 🧭 Comprendre IA-TB en 5 minutes

```text
Exchanges / RPC / sources fondamentales
              │
              ▼
 Market Data + Fundamental
        │          │
        ├──► Indicator
        ├──► Liquidity
        │
        ▼
      Router CP/1 ◄──────── UI / Chat IA
        │
        ├──► Strategy v2 ──► signal/intention
        ├──► Risk ─────────► analyse de risque
        ├──► Portfolio ────► état/exécutions/coûts
        │
        ▼
 Firewall 8017 ──► Trading Engine 8016 ──► Exchange
```

Le **Router** transporte les messages ; il ne prend pas de décision métier. **Strategy** fabrique des intentions, **Risk** mesure le risque, le **Firewall** inspecte les flux sensibles et **Trading Engine** traduit une commande autorisée vers l'adapter de l'exchange. Le **Supervisor IA** est encore un contrat réservé : il n'existe pas encore comme service autonome.

## 🧩 Rubriques

### Utilisation
- [Trading IA](Trading-IA.md) — espace marché, graphique natif, indicateurs et mosaïque.
- [Fondamental](Fundamental-Engine.md) — collecte, événements, corroboration, mémoire temporelle et synthèse IA.
- [Portfolio](Portfolio-Engine.md) — positions, balances, historique, coûts et connexion wallet.
- [Assistant IA / Companion](AI-Companion.md) — Chat IA, OpenAI, commandes déclaratives et limites.
- [Interfaces et navigation](User-Interfaces.md) — pages Trading, Fundamental, Strategy, Portfolio, Admin et Settings.

### Données et analyse
- [Market Data Collector](Market-Data.md)
- [Financial Data Layer](Financial-Data-Layer.md)
- [Indicator Engine](Indicator-Engine.md)
- [Liquidity Engine](Liquidity-Engine.md)
- [Strategy Engine v2](Strategy-Engine.md)
- [Risk Engine](Risk-Engine.md)

### Exécution et sécurité
- [Trading Engine](Trading-Engine.md)
- [CEX / DEX et adapters](Connectors-CEX-DEX.md)
- [Firewall](Firewall-Module.md)
- [Router & protocole CP/1](Router-Protocol-CP1.md)
- [Sécurité](Security.md)

### Architecture et exploitation
- [Architecture générale](Architecture.md)
- [Services, ports et runtime](Runtime-Services.md)
- [Administration](Administration.md)
- [Settings / API](Settings-API.md)
- [Update Manager](Update-Manager.md)
- [Installation](Installation.md)
- [Dépannage](Troubleshooting.md)
- [Roadmap](Roadmap.md)

## 🔐 Principe de sécurité

Les services métier sont liés à `127.0.0.1`. CP/1 utilise un secret local, une signature HMAC-SHA256, des identifiants de requête et une protection anti-rejeu. Les secrets Exchange/OpenAI restent hors des messages métier. Le Chat/Companion n'obtient pas de privilèges ADMIN.

## 📌 État DEBUG 1.12

| Composant | Port | État |
|---|---:|---|
| UI | 8000 | actif |
| Core | 8001 | actif |
| Indicator | 8012 | actif |
| Market Data | 8013 | actif |
| Liquidity | 8014 | actif |
| Fundamental | 8015 | actif |
| Trading Engine | 8016 | actif, LIVE désactivé par défaut |
| Firewall | 8017 | actif |
| Strategy v2 | 8018 | actif |
| Risk | 8019 | actif |
| Portfolio | 8020 | actif |
| Router CP/1 | 8021 | actif |
| Supervisor IA autonome | — | réservé |

> **Note de version :** le dossier DEBUG porte le nom v1.12, mais certains fichiers `VERSION/manifest` hérités affichent encore 1.11.7. Le Wiki décrit donc explicitement le **build DEBUG 1.12**, pas une promesse de release stable.
