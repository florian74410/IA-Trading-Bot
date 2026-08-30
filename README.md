# IA-Trading-Bot (IA-TB)

Application modulaire de trading crypto : CEX/DEX, Market Data, Chart Viewer, Indicator Engine, Strategy Engine, Fundamental Engine, gestion centralisée des API et Update Manager versionné.

<p align="center">
  <img src="docs/assets/architecture-overview.png" alt="IA-Trading-Bot architecture" width="100%" />
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

- [ ] **Blockchain.com — API** — intégration technique terminée, validation machine cible restante
  - [x] Provider `BLOCKCHAIN` ajouté au registre multi-provider.
  - [x] Flux public anonyme Blockchain.com Exchange utilisé via le canal WebSocket `prices`.
  - [x] Bougies OHLCV et volumes natifs conservés sans fabrication de données.
  - [x] Normalisation symbole / timeframe et provenance `BLOCKCHAIN.COM` explicite.
  - [x] Timeframes non supportés refusés explicitement au lieu d'être approximés.
  - [x] État, fraîcheur, connexion, dernière erreur et nombre de séries en cache exposés.
  - [x] Tests automatiques de normalisation, granularités et format OHLCV ajoutés.
  - [ ] Tests d'intégration et validation sur la machine cible.
  - [ ] Validation fonctionnelle finale Blockchain.com avant passage de la fonction principale à `[x]`.

- [ ] **DefiLlama — API**
  - Intégration comme source de données complémentaire DeFi.
  - Normalisation et provenance explicite des données.
  - État, fraîcheur et erreurs visibles.

> Ces sources API complètent les données de l'application. Elles ne doivent pas remplacer silencieusement les chandeliers ou volumes natifs des CEX/DEX.

## Validation v1.7.9

- [ ] Intégration fonctionnelle des éléments prévus.
- [ ] Tests automatiques réussis.
- [ ] Tests de fonctionnement sur la machine cible.
- [ ] Vérification consommation mémoire / stabilité.
- [ ] Wiki et documentation mis à jour.
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
- [Roadmap](ROADMAP.md)

## Versionnage

La branche de développement utilise les versions `v1.x`. Chaque changement publié incrémente la version. Le passage à `v2.x` correspondra à la phase suivant le développement/test.

Cycle officiel :

`Source GitHub N -> Développement N+1 -> Tests -> Patch -> CHANGELOG -> Commit source N+1 -> Updates/Patches -> Wiki`

Voir [Versionnage et releases](docs/wiki/Versioning-and-Releases.md) et le [protocole de mise à jour](docs/RELEASE_PROTOCOL.md).
