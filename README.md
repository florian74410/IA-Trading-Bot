# IA-Trading-Bot (IA-TB)

Application modulaire de trading crypto : CEX/DEX, Market Data, Chart Viewer, Indicator Engine, Strategy Engine, Fundamental Engine, gestion centralisée des API et Update Manager versionné.

<p align="center">
  <img src="docs/assets/architecture-overview.svg" alt="IA-Trading-Bot architecture" width="100%" />
</p>

## Architecture générale

Le système repose sur un **Router central** qui assure la communication entre les modules. Les canaux bidirectionnels utilisent une flèche par sens et conservent la couleur du module d'origine ; les données binaires représentées entre les flux restent blanches.

- `Supervisor <-> Router`
- `Market Data <-> Router`
- `Chart Viewer <-> Router`
- `Portfolio <-> Router`
- `Risk Manager <-> Router`
- `Strategy Engine <-> Router`
- `Trading Engine <-> Router`
- `Indicator Engine <-> Router`
- `Fundamental Engine <-> Router`
- `Trading Engine <-> Firewall <-> Exchanges`

Le **Firewall** représente la couche de contrôle placée sur le canal d'exécution entre le Trading Engine et les Exchanges.

# 🗺️ Roadmap

<!-- ROADMAP:START -->
Cette feuille de route est la référence officielle du développement du projet.

## Règles de suivi

- La dernière version validée et stabilisée est considérée comme figée.
- La version suivante est préparée ici avant le début de son développement.
- `[ ]` = fonctionnalité prévue / non terminée.
- `[x]` = fonctionnalité conçue, intégrée et suffisamment vérifiée.
- Une fonctionnalité n'est pas cochée uniquement parce que du code existe.
- Une version ne devient **STABLE** qu'après validation de ses fonctions, tests, documentation et packaging.
- `ROADMAP.md` décrit le travail prévu ou en cours ; `CHANGELOG.md` décrit le travail réellement livré.

---

## ✅ Dernière version stabilisée

### v1.7.8 — STABLE

Principales évolutions clôturées :

- [x] Architecture Market Data multi-provider.
- [x] Nouveau type de provider `SOCKET`.
- [x] Hyperliquid comme premier provider `SOCKET`.
- [x] OHLCV historique Hyperliquid.
- [x] Flux WebSocket temps réel Hyperliquid.
- [x] Trades et carnet `l2Book` Hyperliquid.
- [x] Provenance des données et volumes conservée.
- [x] Cache Market Data borné et séparé par provider / symbole / timeframe.
- [x] Diagnostics et gestion des providers Market Data.
- [x] Dépendance WebSocket `ws` intégrée au runtime.
- [x] Documentation/Wiki mise à jour.
- [x] Build complet v1.7.8 généré et archivé.

---

# 🚧 v1.7.9 — EN DÉVELOPPEMENT

**Progression fonctionnelle validée : 0 / 3**

## Flux de données prévus

- [ ] **CoinGecko — API** — intégration technique terminée, validation machine cible restante
  - [x] Socle du provider `COINGECKO` programmé.
  - [x] Enregistrement dans le registre multi-provider programmé.
  - [x] Provenance CoinGecko explicite et séparation des données CEX/DEX natives.
  - [x] Aucun volume d'exchange artificiel : volume indisponible déclaré explicitement.
  - [x] État interne : dernière réussite, dernière erreur et état d'authentification.
  - [x] Configuration complète depuis `Settings > API` avec stockage de la clé dans le coffre RSA existant.
  - [x] Transmission de la clé à Market Data uniquement en mémoire via canal interne authentifié.
  - [x] Tests automatiques du provider, de la provenance, du volume et du pont de sécurité ajoutés.
  - [ ] Tests d'intégration et validation sur la machine cible.
  - [ ] Validation fonctionnelle finale CoinGecko avant passage de la fonction principale à `[x]`.

- [ ] **Blockchain.com — API** — intégration technique terminée, spécialisation finale et validation machine cible restantes
  - [x] Provider `BLOCKCHAIN` ajouté au registre multi-provider.
  - [x] Flux public anonyme Blockchain.com Exchange utilisé via le canal WebSocket `prices` dans l'implémentation actuelle.
  - [x] Bougies OHLCV et volumes natifs conservés sans fabrication de données.
  - [x] Normalisation symbole / timeframe et provenance `BLOCKCHAIN.COM` explicite.
  - [x] Timeframes non supportés refusés explicitement au lieu d'être approximés.
  - [x] État, fraîcheur, connexion, dernière erreur et nombre de séries en cache exposés.
  - [x] Tests automatiques de normalisation, granularités et format OHLCV ajoutés.
  - [ ] Recentrer Blockchain.com sur le rôle Bitcoin / on-chain retenu afin d'éviter un doublon inutile de source Exchange.
  - [ ] Tests d'intégration et validation sur la machine cible.
  - [ ] Validation fonctionnelle finale Blockchain.com avant passage de la fonction principale à `[x]`.

- [ ] **DefiLlama — API** — intégration technique terminée, validation machine cible restante
  - [x] Provider complémentaire `DEFILLAMA` ajouté au registre multi-provider.
  - [x] DefiLlama déclaré `candleCapable:false` afin de ne jamais remplacer silencieusement les OHLCV natifs CEX/DEX.
  - [x] TVL protocoles et chaînes intégrés.
  - [x] Prix tokens actuels, historiques, chart et variations intégrés.
  - [x] Données stablecoins intégrées.
  - [x] Pools de rendement et historiques APY/TVL intégrés.
  - [x] Volumes DEX et options, open interest, fees et revenue intégrés.
  - [x] Provenance `DEFILLAMA_PUBLIC_API`, fraîcheur, dernière commande et dernière erreur exposées.
  - [x] Tests automatiques du provider et de son catalogue de commandes ajoutés.
  - [ ] Tests d'intégration et validation sur la machine cible.
  - [ ] Validation fonctionnelle finale DefiLlama avant passage de la fonction principale à `[x]`.

## Market Data Collector / prix consensus

- [x] Kraken est une source explicite du Market Data Collector pour OHLCV et prix live.
- [x] GMX est intégré comme source explicite du Market Data Collector pour OHLC et prix Oracle ; aucun volume GMX n'est fabriqué.
- [x] Endpoint `GET /price/consensus` ajouté ; sources par défaut : Kraken + GMX.
- [x] Prix consensus calculé par moyenne des sources valides avec filtre d'outliers autour de la médiane à partir de 3 sources.
- [x] La réponse conserve les prix individuels, la provenance, le nombre de sources et le spread entre sources.
- [x] Test automatisé du calcul de consensus ajouté.
- [ ] Affichage UI détaillé du prix consensus et des prix sources à intégrer/valider.
- [ ] Validation réseau et machine cible Kraken + GMX.

## Market Data Collector / ƒx OHLCV synthétique

- [x] Source virtuelle `FX` / `ƒx Consensus` intégrée directement au Market Data Collector, sans nouveau service ni nouvelle couche réseau.
- [x] Endpoint `GET /candles/consensus` ajouté pour produire les bougies synthétiques à la demande.
- [x] `Open`, `High`, `Low` et `Close` sont calculés par moyenne arithmétique des bougies sources valides et alignées.
- [x] `Volume` est calculé par somme des volumes natifs comparables disponibles ; aucune donnée manquante n'est fabriquée.
- [x] Correspondance stricte de la paire canonique : une donnée `BTC/USD` ne peut pas participer à un consensus `BTC/EUR`.
- [x] Alignement des timestamps par bucket de timeframe avant agrégation.
- [x] Provenance conservée : sources prix, sources volume, volume par source, sources exclues et motifs d'exclusion.
- [x] Proxy Core `GET /api/market/fx-klines` ajouté pour que le navigateur reste sur le canal local existant.
- [x] Le sélecteur Exchange du graphique Trading IA propose `ƒx` en plus des sources natives.
- [x] En mode `ƒx`, le graphique affiche les OHLC synthétiques et le volume total en unité de l'actif de base lorsqu'il est disponible.
- [x] Rafraîchissement `ƒx` léger à 15 secondes ; aucun historique consensus supplémentaire n'est conservé en mémoire.
- [x] Test dédié `test_fx_consensus_v1.7.9.js` ajouté ; le calcul pur moyenne OHLC + somme des volumes a été vérifié localement.
- [ ] Validation end-to-end avec les flux réels sur la machine cible.
- [ ] Vérifier le comportement `ƒx` à mesure que Binance, Coinbase, OKX et d'autres connecteurs sont migrés dans le registre courant du Collector.

## Catalogue des commandes Market Data

- [x] Catalogue central créé pour GMX, Kraken/Reference, Hyperliquid, CoinGecko, Blockchain.com et DefiLlama, avec visibilité des connecteurs historiques Binance/Coinbase/OKX.
- [x] Chaque commande indique si elle est `IMPLEMENTED`, `LEGACY_IMPLEMENTED` ou seulement `UPSTREAM_AVAILABLE`.
- [x] `GET /capabilities` expose la liste complète au runtime.
- [x] `GET /capabilities?provider=...` expose la liste d'un provider précis.
- [x] `POST /command` permet l'exécution des commandes analytiques génériques actuellement branchées, notamment DefiLlama.
- [x] Les commandes privées de compte/trading/retrait restent séparées du catalogue Market Data.
- [x] Documentation du catalogue et de la source virtuelle `ƒx` ajoutée dans `Update/v1.7.9/MarketData/API_COMMANDS.md`.

> Ces sources API complètent les données de l'application. Elles ne doivent pas remplacer silencieusement les chandeliers ou volumes natifs des CEX/DEX.

## Validation v1.7.9

- [ ] Intégration fonctionnelle des éléments prévus.
- [ ] Tests automatiques réussis.
- [ ] Tests de fonctionnement sur la machine cible.
- [ ] Vérification consommation mémoire / stabilité.
- [x] Wiki et documentation mis à jour.
- [ ] `CHANGELOG.md` mis à jour.
- [ ] `VERSION` mis à jour.
- [ ] Patch `.zip` directement compatible UpdateManager publié dans `updates/`.
- [ ] Build complet publié dans `builds/v1.7.9/`.
- [ ] Archive complète publiée dans `archives/`.
- [ ] Vérification finale puis déclaration **v1.7.9 STABLE**.

---

## 📌 Convention de reprise du développement

Au début d'une session de développement :

1. Lire `ROADMAP.md` depuis GitHub.
2. Identifier la dernière version **STABLE**.
3. Reprendre la première tâche non cochée de la version en cours.
4. Après intégration et vérification, passer la tâche de `[ ]` à `[x]`.
5. Reporter les changements réellement livrés dans `CHANGELOG.md`.
6. Ne clôturer la version qu'une fois toute la section de validation terminée.

Ainsi, GitHub reste la source de vérité permettant de reprendre le développement sans perdre l'état d'avancement du projet.
<!-- ROADMAP:END -->

---

## Rôle du dépôt

Ce dépôt est la **source de vérité du code source courant de IA-TB**.

- `main` = code source complet de la dernière version validée.
- `Updates/Patches/` = archives de mise à jour installables entre deux versions.
- L'historique Git conserve les anciennes versions du code ; il n'est pas nécessaire de dupliquer le projet dans des dossiers `v1.x`.
- Chaque nouvelle mise à jour repart de la dernière source validée présente sur GitHub, puis remplace/actualise cette source une fois les tests terminés.
- Les secrets, coffres, clés privées, tokens, logs, bases locales et données utilisateur ne doivent jamais être commités.

## Documentation

La documentation officielle est versionnée dans [`docs/wiki`](docs/wiki/Home.md).

- [Accueil documentation](docs/wiki/Home.md)
- [Installation](docs/wiki/Installation.md)
- [Architecture](docs/wiki/Architecture.md)
- [Connecteurs CEX / DEX](docs/wiki/Connectors-CEX-DEX.md)
- [Market Data](docs/wiki/Market-Data.md)
- [Chart Viewer](docs/wiki/Chart-Viewer.md)
- [Indicator Engine](docs/wiki/Indicator-Engine.md)
- [Settings / API](docs/wiki/Settings-API.md)
- [Update Manager](docs/wiki/Update-Manager.md)
- [Sécurité](docs/wiki/Security.md)
- [Roadmap](docs/wiki/Roadmap.md)

## Versionnage

La branche de développement utilise les versions `v1.x`. Chaque changement publié incrémente la version. Le passage à `v2.x` correspondra à la phase suivant le développement/test.

Cycle officiel :

`Source GitHub N -> Développement N+1 -> Tests -> Patch -> CHANGELOG -> Commit source N+1 -> Updates/Patches -> Wiki`

Voir [Versionnage et releases](docs/wiki/Versioning-and-Releases.md) et le [protocole de mise à jour](docs/RELEASE_PROTOCOL.md).
