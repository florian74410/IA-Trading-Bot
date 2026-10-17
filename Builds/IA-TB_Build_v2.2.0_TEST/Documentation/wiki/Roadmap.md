# 🗺️ Roadmap — lecture V2.0 DEBUG

> **🟢 En simple : la branche `debug` a dépassé plusieurs étapes encore décrites comme futures dans l’ancien Wiki. Strategy Engine v2 et IA Supervisor sont maintenant actifs ; Market Data V2 centralise CoinGecko/DeFiLlama ; la Banque est multi-chain. Cette page décrit les prochains écarts techniques observés sans remplacer le `ROADMAP.md` racine comme registre officiel de planification.**

---

## ✅ Acquis visibles dans V2.0 DEBUG

**🟢 En simple : ces briques ont désormais un runtime ou une intégration réelle dans le build analysé.**

- [x] UI Service séparé du Core.
- [x] Communication Router / CP1.
- [x] Market Data Collector V2.
- [x] Firewall Trading + Data.
- [x] Indicator Engine + langage IIL.
- [x] Liquidity Engine CP1.
- [x] Fundamental Engine V3 INFORMATION_ONLY.
- [x] Strategy Engine v2 ACTIVE / INTENTION_ONLY.
- [x] Risk Engine + Risk Gate.
- [x] Trading Engine avec Firewall forward obligatoire.
- [x] Portfolio Engine + SQLite.
- [x] IA Supervisor ACTIVE / INTENTION_ONLY.
- [x] CoinGecko intégré au Market Data financier/Registry.
- [x] DeFiLlama intégré au Market Data financier.
- [x] Statistiques connectées aux snapshots CeFi/DeFi.
- [x] Wallet multi-chain EVM + Bitcoin + Solana.
- [x] Router de transferts ERC20/EVM + BTC + SOL.
- [x] Swap/Bridge EVM via 0x Cross-Chain.

---

## 🟡 Travaux techniques encore incomplets observés

### Confirmation multi-chain Banque

**🟢 En simple : BTC et SOL savent être signés et diffusés, mais l’application doit encore suivre leur confirmation comme elle le fait plus naturellement sur EVM.**

- [ ] watcher BTC `SUBMITTED → CONFIRMED/FAILED` ;
- [ ] watcher Solana `SUBMITTED → CONFIRMED/FAILED` ;
- [ ] intégration cohérente à l’historique/notifications.

### OnChain Reader multi-chain

**🟢 En simple : le wallet est multi-chain, le lecteur ne l’est pas encore complètement.**

- [ ] solde/transaction Bitcoin ;
- [ ] solde/transaction Solana ;
- [ ] indexer externe optionnel pour historique complet.

### Protocol Registry

**🟢 En simple : les fichiers machine-readable doivent refléter exactement le runtime.**

- [ ] corriger l’endpoint Trading `8017 → 8016` dans le registry concerné ;
- [ ] vérifier régulièrement Process Registry vs Protocol Registry vs runtime.

### Health global

**🟢 En simple : un seul endpoint de santé devrait pouvoir résumer les 14 services sans ambiguïté.**

- [ ] inclure Risk/Supervisor/Firewall dans une vue globale cohérente ;
- [ ] distinguer installed/enabled/registered/online.

### UI Statistiques

**🟢 En simple : remplacer les derniers indicateurs visuels simulés par de vraies métriques runtime.**

- [ ] latences services réelles ;
- [ ] uptime réel par service/provider ;
- [ ] état des oracles réellement connectés.

### Production / VPS

**🟢 En simple : le build DEBUG local utilise un bypass Admin ; le déploiement serveur devra fermer cette facilité.**

- [ ] auth forte UI ;
- [ ] TLS / reverse proxy ;
- [ ] permissions minimales ;
- [ ] séparation données/secrets ;
- [ ] supervision services ;
- [ ] choix datacenter en tenant compte des latences exchanges/OpenAI.

---

## 🔬 R&D séparée

**🟢 En simple : les idées R&D ne sont pas des fonctions promises de la V2.0 actuelle.**

Les concepts comme pool de liquidité propriétaire, vente crypto ou prêts restent de la **R&D** tant qu’ils ne sont pas transformés en chantier validé dans la Roadmap officielle.

---

## ✅ Règle de clôture

**🟢 En simple : “du code existe” n’est pas égal à “fonction stable”.**

Une fonction devient livrée lorsque :
- code ;
- intégration ;
- sécurité ;
- tests ;
- documentation ;
- packaging

sont cohérents et validés.
