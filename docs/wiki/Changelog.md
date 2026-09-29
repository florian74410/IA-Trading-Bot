# 🧾 Changelog fonctionnel du Wiki

> **🟢 En simple : cette page résume les évolutions visibles dans le code. Elle ne déclare pas V2.0 STABLE ; la branche documentée reste DEBUG.**

---

## V2.0 DEBUG — état analysé au 29 septembre 2026

**🟢 En simple : l’architecture est passée d’un ensemble de contrats préparés à un système où Strategy, Risk Gate, Portfolio et Supervisor possèdent réellement leur runtime.**

### 🏗️ Architecture
- UI Service séparé sur 8000 ;
- Core sur 8001 ;
- Router CP/1 sur 8021 ;
- Process Registry par manifests ;
- 14 services attendus au démarrage.

### 💧 Liquidity / Market Data V2.1
- un seul service Market Data 8013 ; microstructure rangée en Provider/Collectors/Storage ;
- OI couvert Binance Futures + OKX + Hyperliquid avec séparation CEX/DEX ;
- historique OI SQLite 30–90 jours ;
- Worker Threads de liquidations Binance Futures et OKX ;
- statut des streams exposé par CP/1 ;
- Liquidity Engine V2.0 devient **INTERNAL_ANALYSIS_ONLY** ;
- suppression des appels Internet actifs depuis Liquidity ;
- migration Binance Futures / Hyperliquid / Kraken L2 vers Market Data ;
- validation Data Firewall avant cache/SQL ;
- historique microstructure SQLite, rétention 30–90 jours ;
- calculs depth ±10/25/50/100 bps, execution impact, Liquidity Score et OI/depth ;
- ajout `liquidity.raw`, `liquidity.history` et `liquidity.context` ;
- Supervisor consomme le contexte Liquidity compact via CP/1.

### 📡 Market Data
- Market Data Collector V2.1 ;
- Candle registry : Kraken, Binance, OKX, GMX ;
- CoinGecko = token market / Market Registry / CeFi ;
- DeFiLlama = DeFi protocols / chains / DEX / stablecoins ;
- snapshots financiers contrôlés par Data Firewall ;
- historique financier hybride mémoire + JSONL ;
- données réutilisables par Indicator/Liquidity/Strategy/Portfolio/Supervisor/UI.

### 🧠 Strategy / Supervisor
- Strategy Engine v2 ACTIVE sur 8018 ;
- génération de signaux, `INTENTION_ONLY` ;
- IA Supervisor ACTIVE sur 3000 ;
- collecte de contexte CP/1 ;
- LLM configurable ;
- exécution Supervisor limitée à l’intention.

### 🛡️ Risk / Firewall / Trading
- Risk Gate `evaluate/verify` ;
- `risk_approval_id` requis ;
- Trading Firewall vérifie/consomme l’approval ;
- Trading Engine exige un forward Firewall signé ;
- Trading Live OFF au démarrage ;
- exécutions normalisées vers Portfolio.

### 📊 Portfolio
- moteur actif sur 8020 ;
- stockage SQLite ;
- positions, balances, trades, historique, statistiques ;
- resynchronisation depuis Trading history ;
- coûts IA via Usage Ledger.

### 🏦 Banque
- Wallet Service schéma v3 ;
- comptes EVM + Bitcoin + Solana ;
- secrets wallet AES-256-GCM ;
- transfert modulaire EVM/ERC20, BTC, SOL ;
- BTC/SOL en état SUBMITTED après broadcast ;
- Swap/Bridge EVM via 0x Cross-Chain ;
- OnChain Reader principalement EVM.

### 🖥️ UI
- navigation globale commune ;
- sidebars harmonisées Banque/Fundamental/Settings/Strategy/Statistiques ;
- sidebar Admin d’origine conservée ;
- Mes Clés : barre Ajouter/Exporter/Paramètres sous le tableau de clés ;
- Statistiques connectées au Financial Snapshot Market Data.

### 📚 Wiki
- réécriture du Wiki sur l’état runtime V2.0 DEBUG ;
- ajout des pages Strategy Engine, Supervisor, Trading Engine, Portfolio et Application UI ;
- ajout d’un état fonctionnel ACTIVE/PARTIAL/PLANNED ;
- suppression des anciennes affirmations Strategy/Supervisor `RESERVED`.

---

## Historique v1.x

**🟢 En simple : les versions v1.x ont construit progressivement les briques aujourd’hui réunies dans V2.0 DEBUG.**

Les étapes historiques importantes restent :
- v1.7.x : multi-provider, connecteurs et Market Data ;
- v1.8.11 : Console Admin / Debug Framework ;
- v1.8.12 : normalisation Router / CP1.

Pour le détail exact des anciens commits, utiliser l’historique Git et les anciens documents de release. La documentation fonctionnelle courante doit privilégier l’état V2.0 DEBUG.
