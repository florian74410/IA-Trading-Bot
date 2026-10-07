# 🗺️ ROADMAP — IA Trading Bot

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

# ✅ v1.7.9 — PATCH / BUILD / ARCHIVE FINALISÉS

**État de packaging : FINALISÉ.**  
**État fonctionnel machine cible : validation finale encore requise avant de remplacer v1.7.8 comme dernière version STABLE.**

Le patch v1.7.9, son test d'installation, le build complet et l'archive complète sont présents dans le dépôt. La v1.7.9 constitue également la source officielle utilisée par l'UpdateManager pour produire et valider la v1.8.

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
- [x] Documentation du catalogue et de la source virtuelle `ƒx` ajoutée dans `updates/v1.7.9/MarketData/API_COMMANDS.md`.

> Ces sources API complètent les données de l'application. Elles ne doivent pas remplacer silencieusement les chandeliers ou volumes natifs des CEX/DEX.

## Authentification / inscription

- [ ] **Écran d'authentification unifié** — intégré, validation complète machine cible restante
  - [x] Le formulaire affiché par défaut reste toujours le formulaire de connexion, y compris lorsque la base utilisateur ne contient encore aucun compte.
  - [x] Ajout d'un libellé/lien cliquable `S'inscrire` depuis le formulaire de connexion.
  - [x] Bascule dans le même panneau entre les modes `Connexion` et `Inscription`, sans page d'authentification séparée.
  - [x] Ajout du lien inverse `Déjà un compte ? Se connecter` en mode inscription.
  - [x] Le backend conserve la règle actuelle : une installation locale ne crée pas un second compte si un compte local existe déjà.
  - [ ] Vérifier visuellement le formulaire sur macOS High Sierra / Firefox cible.
  - [ ] Tester connexion, première inscription, refus d'une seconde inscription et récupération de mot de passe.
  - [ ] Validation fonctionnelle finale avant passage de la fonction principale à `[x]`.

## Validation v1.7.9

- [x] Packaging du patch v1.7.9 finalisé dans `updates/v1.7.9/` avec ZIP et SHA-256.
- [x] Test d'installation du patch documenté dans `updates/v1.7.9/INSTALL_TEST_RESULT.md`.
- [x] Build complet publié dans `builds/v1.7.9/`.
- [x] Archive complète publiée dans `archives/IA-Trading-Bot_V1.7.9.zip` avec SHA-256.
- [x] `CHANGELOG.md` et `VERSION` disponibles dans le code livré.
- [x] La v1.7.9 a servi de source officielle vérifiée pour le passage UpdateManager vers v1.8.0.
- [ ] Validation end-to-end de toutes les fonctions prévues sur la machine cible.
- [ ] Vérification consommation mémoire / stabilité sur la machine cible.
- [ ] Vérification finale puis déclaration **v1.7.9 STABLE** au sens fonctionnel complet.

---

# ✅ v1.8.2 — FINALISÉE

Le packaging v1.8 est maintenant reproductible : la version est produite depuis l'archive officielle v1.7.9 au moyen d'un patch UpdateManager `1.7.9 -> 1.8.0`. Le patch a été accepté et installé par le vrai UpdateManager de la v1.7.9 sous Node.js 16.20.2, puis le résultat a été comparé au build `builds/v1.8`.

**État packaging : PASS.**  
**État v1.8.2 : FINALISÉ. Les développements suivants commencent après cette version.**

## v1.8.1 — Liquidity Engine

- [x] **Upgrade Liquidity Engine intégré au build v1.8.1.**
  - [x] Conservation du calcul de zones OHLCV `ESTIMATED` comme fallback léger.
  - [x] Ajout du calcul Open Interest avec valeur native, mark price et notionnel lorsque disponible.
  - [x] Ajout du carnet d'ordres avec best bid/ask, spread, VWAP et profondeurs bid/ask.
  - [x] Ajout du calcul `Bid/Ask imbalance`, ratio bid/ask et côté dominant.
  - [x] Ajout des statistiques de liquidations à partir d'événements explicites disponibles ; aucune liquidation n'est fabriquée depuis OHLCV/trades.
  - [x] Ajout du provider temps réel léger Hyperliquid / Binance Futures / Kraken avec mode `AUTO`.
  - [x] Ajout des endpoints `/realtime`, `/snapshot`, `/liquidations` et `/liquidations/event`.
  - [x] Cache temps réel borné et buffer de liquidations borné.
  - [x] Tests unitaires Liquidity et contrôles de syntaxe JavaScript réussis dans l'environnement de build.
  - [x] Validation réseau temps réel avec les providers réels sur la machine cible.
  - [x] Validation consommation mémoire / stabilité Liquidity sur macOS High Sierra.

## v1.8.2 — Admin UI / UpdateManager

- [x] **Nouvelle interface Admin programmée.**
  - [x] Barre latérale gauche avec labels cliquables et icônes/miniatures.
  - [x] Navigation par ancres vers Console, Firewall, Processus, Engines & Services, Maintenance, Logs, Diagnostics et Mises à jour.
  - [x] Défilement fluide et mise en évidence de la section active.
  - [x] Palette et contours harmonisés avec les autres pages de l'application.
  - [x] Réutilisation du logo IA-TB déjà présent dans l'application.
  - [x] Fonctions Admin existantes conservées derrière la nouvelle présentation.
  - [x] Validation visuelle et fonctionnelle sur macOS High Sierra / Firefox cible.

- [x] **UpdateManager v1.8.2 — finalisé.**
  - [x] Cause du rejet identifiée : version installée détectée `1.8.0` alors que le premier patch ciblait `1.8.1`.
  - [x] Patch cumulatif corrigé pour `1.8.0 -> 1.8.2`.
  - [x] Le patch cumulatif inclut les changements Liquidity v1.8.1 et Admin v1.8.2 nécessaires au résultat final.
  - [x] Installation réussie sur une copie du build v1.8.0 dans l'environnement de test.
  - [x] Après installation de test, `current_release.dat` et la version active passent à `1.8.2`.
  - [x] Contrôle SHA-256 et syntaxe JavaScript réussis sur le build installé de test.
  - [x] Le nom externe du fichier ZIP n'est pas utilisé comme source de vérité ; la compatibilité est déterminée par le manifeste interne.
  - [x] Installer le patch corrigé via l'Update Manager sur la machine cible.
  - [x] Confirmer que l'application affiche `1.8.2` après redémarrage.
  - [x] Publier/valider définitivement l'archive corrigée dans `updates/` sur GitHub.

---


## Market Data / Provider Passport

- [x] Créer un **Provider Passport v1** commun à tous les providers Market Data actuels.
- [x] Classer chaque provider en `READY` / `PARTIAL` / `UNKNOWN` selon la qualité réelle de son profil.
- [x] Conserver explicitement les limites inconnues en `UNKNOWN` au lieu d'inventer un quota.
- [x] Ajouter un contrat CI vérifiant qu'aucun provider suivi par l'Orchestrator ne manque de Passport.
- [x] Compléter les Passports documentés exploitables : Binance, Hyperliquid, DexScreener et Bybit ; conserver les limites dynamiques Bybit depuis les headers officiels.
- [x] Garantir que les quotas `UNKNOWN` restent `OBSERVE_ONLY_NON_BLOCKING` et ne puissent pas bloquer les processus IA-TB.
- [ ] Revenir plus tard sur les Passports encore partiels : CoinGecko anonyme, DeFiLlama, GMX, Kraken et OKX Open Interest.
- [ ] Ne considérer un futur provider comme **intégré** qu'après : connexion API, Passport, Policy/TTL, priorité/criticalité, quota/provenance, erreurs spécifiques, télémétrie, tests et mise à jour de la ROADMAP.

> Règle de développement : **« Ajouter l'API » n'est pas égal à « Provider intégré ».** Le Passport fait partie de la Definition of Done du provider.

# 🔜 Après v1.8.2 — travaux futurs

Les éléments ci-dessous ne font pas partie de la v1.8.2 finalisée. Ils constituent la suite de la feuille de route.

## Portfolio Module

- [ ] **Portfolio Module — mémoire financière et source de vérité du portefeuille**
  - [ ] Intégrer un service `portfolio` autonome relié au Router en CP/1.
  - [ ] Utiliser une base SQLite persistante hors du dépôt Git afin qu'un nouveau `git clone` ne supprime jamais l'historique utilisateur.
  - [ ] Ajouter un `Event Ledger` normalisé et dédupliqué pour conserver BUY, SELL, OPEN, INCREASE, REDUCE, CLOSE, DEPOSIT, WITHDRAWAL, TRANSFER, FEE, FUNDING, LIQUIDATION, SWAP et autres événements utiles.
  - [ ] Ajouter un `Position Builder` capable de reconstruire les positions ouvertes, prix d'entrée moyen, quantités, levier, marge, PnL, frais, funding, SL/TP et provenance.
  - [ ] Ajouter les balances consolidées Wallet / CEX / DEX avec provenance et horodatage.
  - [ ] Ajouter les snapshots historiques pour conserver l'évolution de l'equity, de la valeur du portefeuille, de l'exposition, de la marge et du PnL.
  - [ ] Ajouter les statistiques de trading : PnL réalisé/latent, frais, funding, win rate, profit factor, moyennes et historique exploitable pour les graphiques.
  - [ ] Préparer les commandes CP/1 `portfolio.snapshot`, `portfolio.positions`, `portfolio.history`, `portfolio.statistics`, `portfolio.events`, `portfolio.event.record`, `portfolio.events.import`, `portfolio.sync` et `portfolio.health`.
  - [ ] Communication Market Data exclusivement via `Portfolio -> Router -> Market Data Collector` pour récupérer les mark prices et valoriser positions/balances.
  - [ ] Communication Trading exclusivement via le Router : réception des exécutions et ajout d'une capacité de resynchronisation historique côté Trading Engine.
  - [ ] Communication Supervisor exclusivement via le Router ; aucune connexion directe Supervisor ↔ Portfolio hors CP/1.
  - [ ] Préparer l'accès du futur Risk Engine aux snapshots/positions du Portfolio via le Router.
  - [ ] Adapter la page web Portfolio afin qu'elle affiche les données calculées par Portfolio Module plutôt que de reconstruire elle-même l'état depuis Trust Wallet/GMX.
  - [ ] Ajouter un graphique d'equity basé sur les snapshots SQLite.
  - [ ] Valider la présence et le comportement de `sqlite3` sur macOS High Sierra / Node.js 16 et prévoir le comportement VPS.
  - [ ] Tester reconstruction, déduplication, reprise après arrêt, synchronisation et cohérence des calculs.

## Trading Firewall Module

- [x] **Implémentation du Firewall Module** — couche de sécurité du canal `Trading Engine -> Exchanges` conçue et intégrée.
  - [x] Paramétrage `Settings > Trading Firewall` défini.
  - [x] Modes `Protection` et `Observation` définis.
  - [x] Vérification authentification CP, signatures et âge maximal des messages prévue.
  - [x] Command Whitelist définie pour `trading.execute`, `trading.cancel`, `trading.close_position` et `trading.health`.
  - [x] Trading Pair Whitelist intégrée au modèle de configuration.
  - [x] Duplicate Protection avec fenêtre configurable définie.
  - [ ] Validation end-to-end du Firewall sur la machine cible avec les connecteurs réels.

## Risk Engine

- [x] **Implémentation du Risk Engine** — moteur analytique de représentation du risque intégré ; validation runtime CP/1 end-to-end restante
  - [x] Prototype Risk Engine intégré comme Engine autonome prévu pour l'enregistrement auprès du Router en CP/1.
  - [x] Rôle strictement analytique conservé : aucun `APPROVE`, `MODIFY`, `REJECT` et aucune exécution d'ordre dans le Risk Engine.
  - [x] Requêtes de données Market Data conçues exclusivement via le Router.
  - [x] Requêtes d'indicateurs conçues exclusivement via le Router.
  - [x] Requêtes Portfolio conçues exclusivement via le Router.
  - [x] Calculs de position, exposition, levier, marge, drawdown, volatilité, VaR historique et Expected Shortfall intégrés.
  - [x] Tests purs du Risk Engine réussis sous Node.js 16.20.2 pendant la validation UpdateManager.
  - [ ] Vérifier l'enregistrement réel du service Risk auprès du Router sur la machine cible.
  - [ ] Fournir et valider les analyses Risk au Supervisor via CP/1 en conditions runtime.
  - [ ] Ajouter/valider les scénarios de stress avancés.
  - [ ] Valider que le Supervisor reste seul responsable de la décision finale de stratégie / action dans le flux end-to-end.

## Trading Engine / historique Portfolio

- [ ] Ajouter une sortie d'événement d'exécution normalisée vers `portfolio.event.record` via Router après chaque résultat d'exécution utile.
- [ ] Ajouter une capacité READ-ONLY `trading.history` ou équivalent pour permettre au Portfolio de reconstruire/rattraper les événements après une interruption.
- [ ] Garantir l'idempotence des imports afin qu'une resynchronisation ne crée jamais de transaction en double.

## Interface Portfolio v1.8

- [ ] Remplacer progressivement la vue Portfolio actuelle centrée Wallet/GMX par la vue consolidée du Portfolio Module.
- [ ] Afficher : balances, positions ouvertes, prix d'entrée moyen, quantités, levier, marge utilisée, PnL latent/réalisé, SL/TP connus, exchange/source d'origine, mark price, frais, funding, liquidation et date d'ouverture lorsque disponibles.
- [ ] Afficher les statistiques calculées par le module et l'equity curve depuis les snapshots.
- [ ] Le navigateur accède au Portfolio Module via des routes proxy Core authentifiées ; aucun accès navigateur direct au port interne Portfolio.

## Packaging / UpdateManager v1.8

- [x] Archive source officielle v1.7.9 contrôlée par SHA-256 avant génération.
- [x] Patch `1.7.9 -> 1.8.0` généré au format officiel UpdateManager.
- [x] Manifeste couvrant exactement les 61 fichiers du payload avec SHA-256.
- [x] Entrypoint officiel `Core/Server/server_v1.8.js`.
- [x] Patch accepté par le vrai `Core/Updates/update_manager_v1.0.js` de la v1.7.9.
- [x] Installation du patch réussie sur une copie propre de la v1.7.9.
- [x] Version obtenue après installation : `1.8.0`.
- [x] Résultat installé comparé au build cible : `installedBuildMatchesTarget = true`.
- [x] ZIP final vérifié sans erreur.
- [x] Rapport `updates/Patch_v1.7.9_to_v1.8.0/VALIDATION_REPORT.json` publié avec `status = PASS`.
- [x] Patch, SHA-256, manifeste et informations de build publiés dans `main`.
- [x] Build complet v1.8 publié dans `builds/v1.8/`.

## Validation v1.8.x

- [x] Packaging v1.8.0 validé par UpdateManager à partir de la v1.7.9 officielle.
- [x] Test pur Risk Engine réussi sous Node.js 16.20.2.
- [x] Upgrade Liquidity v1.8.1 intégré et testé dans l'environnement de build.
- [x] Nouvelle interface Admin v1.8.2 programmée.
- [x] Patch cumulatif `1.8.0 -> 1.8.2` validé sur copie du build v1.8.0.
- [x] Installation et validation du patch v1.8.2 sur la machine cible.
- [ ] Intégration Portfolio Module complète.
- [ ] Tests CP/1 Router ↔ Portfolio ↔ Market Data ↔ Trading Engine ↔ Supervisor.
- [ ] Tests CP/1 Router ↔ Risk Engine ↔ Market Data / Indicators / Portfolio / Supervisor sur la machine cible.
- [ ] Tests SQLite et persistance après redémarrage / mise à jour / nouveau clone Git.
- [ ] Tests UI Portfolio sur macOS High Sierra / Firefox cible.
- [ ] Vérification consommation mémoire / CPU sur MacBook Pro 2011.
- [ ] Documentation et Wiki finalisés pour toutes les fonctions effectivement validées.
- [ ] Vérification finale avant déclaration **v1.8.x STABLE**.

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
