## IA-TB 2.4 — journalisation Trading V2 intégrée

Le prototype séparé du 20 octobre est repris sur `feature/v2.4-finance-calendar`.
Double écriture JSONL/SQLite WAL, reprise idempotente, masquage des secrets et
compatibilité historique : [détails et limites](Documentation/TRADING_LOGS_V2_INTEGRATION_2.4.md).
Le démarrage local sur localhost:8000 reste une étape de recette distincte.

> Livraison TEST 2.2.0 : comptes, sessions et isolation User Management V1.
> Recette GEN-1 et promotion stable en attente ; les restrictions fonctionnelles
> sont explicites dans [RELEASE_2.2.0](Documentation/RELEASE_2.2.0.md).

# 🗺️ ROADMAP — IA Trading Bot

## IA-TB v2.2.5 — Correctif unifié (PR #18 ; développement terminé, recette GEN-1 en attente)

**Branche de livraison :** `feature/v2.2.5-calendar-events-chart`. **Périmètre :** Vue d'ensemble Fundamental, globe compact réaliste et globe agrandi, événements économiques FED/CME, marqueurs sur Trading IA, paramètres de visibilité. `v2.2.4` reste déployée ; ni Trading Engine ni trading réel n'est activé.

- [x] Reprise de la maquette Vue d'ensemble Fundamental (radar compact, résumé du marché, KPIs réels sans déplacer le catalogue des news hors de « News & Événements »).
- [x] Globe miniature avec rendu WebGL Earth Blue Marble, navigation et pauses hors écran ; maintien du canvas fallback.
- [x] Partage des données réelles issues de `fundamental.news.search` entre le globe miniature et l'agrandi ; normalisation défensive, catégories, coordonnées et dates.
- [x] Globe agrandi 3 colonnes avec filtres catégorie / Jour-Semaine-Mois, marqueurs plus grands, liste / sélection d'événements, légende et zoom.
- [x] Calendrier FED/CME unifié ; drapeaux, prévision / réel / précédent si disponibles ; conservation des dates sans heure sans positionnement trompeur sur le graphique.
- [x] Marqueurs temporels du graphique Trading IA, activés par défaut, réglables dans Fundamental / paramètres utilisateur.
- [x] Vérification syntaxique Node et tests de contrats GitHub Actions : qualification v2.2.5 + Chart Workspace + Indicateurs.
- [ ] Recette Firefox/Linux **sur GEN-1 DEBUG** : comparer au visuel validé, vérifier les filtres avec événements réels, la réactivité du globe miniature, le chargement des textures, les marqueurs graphiques, les permissions Auth21, la performance WebGL et les différentes résolutions.
- [ ] Déploiement contrôlé sur GEN-1 DEBUG, puis promotion éventuelle après recette réussie. Production inchangée.

**Sécurité :** aucun nouvel appel d'exécution de trading ; conserver `IATB_TRADING_LIVE=0` et `IATB_TRADING_ENGINE_ENABLED=0` en DEBUG. Pas de publication stable avant recette en navigateur.



### Lot C — Actualisation manuelle News & Événements (demande validée)

- [ ] Rendre « Actualiser » accessible à tous les rôles authentifiés sans demander de mot de passe supplémentaire.
- [ ] Réutiliser les collecteurs existants pour récupérer les nouvelles news et événements manquants.
- [ ] Conserver les publications déjà enregistrées ; insérer de manière idempotente et enrichir sans écrasement les résultats réels/prévisions quand ils arrivent.
- [ ] Préserver Auth21/Router CP1, throttling, audit et permissions administratives sensibles.
- [ ] Afficher progression, dernière synchro, ajouts, mises à jour et erreurs partielles ; conserver la liste existante lors d'échecs.
- [ ] Tester tous les rôles, multiutilisateurs, doublons, rafraîchissements concurrents et régressions.

Référence : [spécification Lot C — Actualiser](Documentation/PATCH_2.2.5_MANUAL_NEWS_REFRESH.md).

## 🛠️ Correctif unifié IA-TB v2.2.5 — PR #18 (code candidat, pas encore déployé)

**Référence unique :** [PR #18](https://github.com/florian74410/IA-Trading-Bot/pull/18), branche `feature/v2.2.5-calendar-events-chart`. Ne pas fusionner tant que les recettes GEN-1 DEBUG/Firefox ne sont pas validées. Trading Engine désactivé, aucune opération live.

- [x] Reprise de la refonte de **Fundamental → Vue d'ensemble** (radar compact, état du marché, indicateurs réels) dans la PR unique, sans déplacer la consultation des news hors de News & Événements.
- [x] **Globe miniature réaliste WebGL** : réutilisation du rendu Earth/texture de la vue agrandie, miniature adaptative, rotation fluide, pause hors écran et secours Canvas.
- [x] Même flux de **vraies publications Fundamental** pour les deux globes ; géolocalisation explicite ou centroïde de région clairement inférée ; aucun point géographique aléatoire.
- [x] **Globe agrandi** : composant 3 colonnes existant PR #18 branché au bouton d'ouverture, rendu WebGL, marqueurs plus grands, clic point → fiche, zoom/recentrage, catégories et périodes réellement filtrées.
- [x] **Calendrier FED/CME unifié** en amont des vues détaillées préexistantes, filtres par source, dates, drapeaux, Prévu/Réel/Précédent si les données sont présentes.
- [x] **Événements sur le Trading IA** : adaptateur FED/CME réutilisé, marqueurs informatifs sur l'axe du graphique natif, aucune modification de stratégie, d'ordre ou de Trading Engine.
- [x] **Paramètres → Fundamental** : bascules affichage économique par défaut activé, FED/CME, drapeaux et valeurs ; préférences locales persistantes dans le navigateur.
- [x] Tests automatisés des contrats globe/calendrier/raccordements et syntaxe JS, workflow CI `v225-unified-qualification.yml` ajouté.
- [ ] **Recette Firefox / Linux GEN-1 DEBUG** : rendu miniature/plein écran, 1280×800, filtres/catégories, gé…11249 tokens truncated…elease.dat` et la version active passent à `1.8.2`.
  - [x] Contrôle SHA-256 et syntaxe JavaScript réussis sur le build installé de test.
  - [x] Le nom externe du fichier ZIP n'est pas utilisé comme source de vérité ; la compatibilité est déterminée par le manifeste interne.
  - [x] Installer le patch corrigé via l'Update Manager sur la machine cible.
  - [x] Confirmer que l'application affiche `1.8.2` après redémarrage.
  - [x] Publier/valider définitivement l'archive corrigée dans `updates/` sur GitHub.

---


## Market Data / Shadow Decision Engine

- [x] Ajouter un Shadow Decision Engine v1 relié à Policy, Passport, Broker et Budget.
- [x] Produire des décisions observationnelles : `ALLOW`, `DEDUP_CANDIDATE`, `DELAY`, `ALLOW_WITH_ADVISORY`, `FALLBACK_CANDIDATE`.
- [x] Garantir `executable:false`, `blocking:false` et `decisionEnforcement:false` en v1.
- [x] Conserver les quotas UNKNOWN en recommandation non bloquante.
- [x] Ajouter un contrat CI observation-only.
- [x] Valider le comportement Shadow sur un workload représentatif de 60 min : run `37712721434`, 12 cycles, 120/120 actions CP/1 réussies, 0 hard failure ; les limitations d'observabilité transport/microstructure sont acceptées pour V1 et reportées en V2.
- [x] Ajouter les alternates ordonnés par dataset sans scoring automatique, avec rang 1 = source préférée, saut des providers indisponibles et état terminal `NO_PROVIDER_AVAILABLE`.
- [x] Refuser tout fallback ambigu sur le dataset historique générique `ORDERBOOK`.
- [x] Distinguer explicitement `SPOT_ORDERBOOK` et `PERP_ORDERBOOK` dans les anciens chemins qui utilisaient `ORDERBOOK`, y compris Policy et profils de requêtes, avec contrat CI empêchant le retour d'un dataset générique.

## Market Data / Currency Registry

- [x] Fusionner la devise FIAT de référence et le mapping Stable Asset dans un **Currency Registry v1** unique.
- [x] Référencer les devises : `USD`, `EUR`, `GBP`, `JPY`, `CNY`, `CHF`, `CAD`.
- [x] Permettre une résolution unique : FIAT direct ou Stable Asset -> FIAT de référence.
- [x] Conserver les mappings initiaux : `USDT -> USD`, `USDC -> USD`, `DAI -> USD`, `EURC -> EUR`, `TGBP -> GBP`, `ZCHF -> CHF`, `QCAD -> CAD`, `JPYC -> JPY`.
- [x] Conserver la zone monétaire et les métadonnées FIAT sans stocker de taux de change temps réel dans le Registry.
- [x] Préserver un reçu de normalisation avec actif source, FIAT de référence, quantité source, prix USD observé et valeur USD normalisée.
- [x] Ajouter un contrat CI dédié au Currency Registry.
- [x] Brancher le Currency Registry à la normalisation Open Interest afin de conserver le détail d'origine de chaque contribution avant agrégation USD.
- [x] Ne jamais supposer `1 Stable Asset = 1 FIAT` : si le taux observé manque, exclure la contribution OI du total et marquer la couverture partielle.
- [ ] Ajouter d'autres Stable Assets uniquement lorsqu'ils sont réellement supportés/identifiés ; ne jamais inventer un mapping par défaut.

## Market Data / Data Trust Boundary

- [x] Auditer le chemin réel Provider -> Firewall -> Cache/Store.
- [x] Interdire le cache des réponses Provider brutes dans le proxy Orchestrator.
- [x] Conserver l'in-flight dedup avant Provider sans persistance de donnée brute.
- [x] Imposer `Data Firewall -> cache/stockage` comme frontière de confiance.
- [x] Ajouter un contrat CI : une donnée rejetée par le Firewall ne doit jamais entrer en cache ni être écrite en stockage.
- [ ] Toute future implémentation Cache First partagée devra consommer uniquement de la donnée déjà validée par le Firewall.

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


## Market Data / API Request Orchestrator V2 — backlog

La V1 Shadow est considérée comme validée pour le build `v2.0_DEBUG`. Les améliorations ci-dessous ne bloquent pas son intégration et seront traitées dans une V2 dédiée.

- [ ] Unifier la télémétrie de décision `START -> TRANSPORT -> END` pour les appels Provider classiques et microstructure.
- [ ] Exposer les décisions runtime `FALLBACK_CANDIDATE`, `AGGREGATE_PARTIAL` et `NO_PROVIDER_AVAILABLE` sur tous les transports.
- [ ] Étudier un mode Native progressif uniquement pour les Providers/Datasets dont le Passport est suffisamment fiable.
- [ ] Ajouter un Cache First partagé uniquement **après Data Firewall**, sans jamais réintroduire de cache Provider brut.
- [ ] Ajouter un Provider Health runtime : `HEALTHY`, `DEGRADED`, `RATE_LIMITED`, `REGION_BLOCKED`, `DOWN`.
- [ ] Rendre le routing sensible à la disponibilité réelle par région/datacenter.
- [ ] Enrichir les quotas dynamiques via headers, `Retry-After`, poids d'endpoints et historique observé.
- [ ] Étendre Policy/Budget/Telemetry aux streams : connexions, abonnements, heartbeat, erreurs et reconnexions.
- [ ] Améliorer le Long-Run Analyzer : fenêtre de mesure figée, schéma `minutes/cycles`, notes régionales et état booléen non sensible des clés API configurées.
- [ ] Exploiter les opportunités de réduction de trafic révélées par V1, en priorité sur les payloads DeFiLlama.

# 🔜 Après v1.8.2 — travaux futurs

Les éléments ci-dessous ne font pas partie de la v1.8.2 finalisée. Ils constituent la suite de la feuille de route.

## R&D — Low-Latency Execution Engine / Smart Execution Router (HyperTrading)

Statut : **idée d'architecture à étudier, non implémentée**. À examiner après migration VPS DEBUG, télémétrie REST/streams fiable et stabilisation du Trading Engine. Objectif : trading événementiel à faible latence sur VPS et API publiques, **sans prétention de HFT professionnel** ni promesse de 2 ms.

### Architecture proposée

- [ ] Étudier un nouveau composant **Low-Latency Execution Engine / Smart Execution Router**, distinct de l'API Request Orchestrator (collecte). Ne jamais contourner le Router CP/1, les protections d'ordres ou le Trading Firewall.
- [ ] Prévoir **HyperTrading** comme stratégie expérimentale du Strategy Engine, distincte du composant de routage. Activation explicite, simulation et environnement DEBUG avant tout ordre réel.
- [ ] Préparer les routes et connexions persistantes en amont lorsque supportées (WebSocket/FIX/REST keep-alive) ; carnets normalisés en mémoire, calculs préétablis et **aucun appel LLM bloquant** sur le chemin critique signal → ordre.
- [ ] Instrumenter séparément : établissement TCP/TLS ; latence REST par endpoint ; latence, fraîcheur et jitter des streams ; acceptation/rejet des ordres ; premier fill, dernier fill ; frais, slippage, disponibilité. Une connexion TCP rapide n'est ni une mesure pure du RTT ni une preuve de vitesse d'exécution.
- [ ] Historiser télémétrie par fournisseur, région, endpoint, protocole, paire et environnement avec médiane, P95/P99, taux d'erreur, jitter, état de santé, DNS et chemins IPv4/IPv6.

### Équation de routage — hypothèse de recherche

Minimiser sur les routes **éligibles** :

    Score(route, stratégie) = α × L_norm + β × C_norm + γ × S_norm + δ × R_norm

- **L_norm** : latence d'exécution attendue normalisée (pas simplement le TCP).
- **C_norm** : coûts d'exécution attendus normalisés (frais, gas/funding pertinents).
- **S_norm** : slippage / impact de marché estimé d'après liquidité, carnet et taille.
- **R_norm** : risque d'échec, rejet, indisponibilité ou données obsolètes.
- **α, β, γ, δ ≥ 0** : poids configurables par stratégie ; définir les unités, bornes et normalisations avant toute comparaison, puis calibrer les coefficients en simulation.

- [ ] Définir des **contraintes éliminatoires avant scoring** : paire disponible, soldes sur le bon exchange, permissions API, liquidité, fraîcheur, tailles minimales, politiques de risque et séparation DEBUG/RELEASE.
- [ ] Préserver les responsabilités existantes : Strategy propose ; Risk analyse ; Supervisor prend la décision finale selon le contrat CP/1 ; Trading Engine exécute sous protections du Trading Firewall. Aucun contournement des contrôles.
- [ ] Distinguer le routage entre endpoints d'un même exchange et le choix entre exchanges (non interchangeables : carnet, fonds, règles et frais).
- [ ] Prévoir fallback déterministe, circuit breaker, protection contre les doublons, réconciliation des ordres après timeout avant toute réémission ; ne jamais relancer un ordre aveuglément.
- [ ] Tester sur GEN-1 (6 vCPU / 12 Go) en simulation/paper trading ; comparer route statique et dynamique sur latence bout-en-bout, P95/P99, taux de remplissage, slippage, coûts et PnL net.

> **Décision :** conserver l'idée dans la ROADMAP en R&D. Aucun moteur, stratégie ou trading rapide réel n'est considéré livré à ce stade.

## Trade Cost Accounting — reçu détaillé par trade (backlog post-migration VPS)

Statut : **prévu**, à étudier et implémenter après stabilisation de l'environnement `DEBUG` sur le VPS. Intégration coordonnée entre Trading Engine, Portfolio Engine, AI Usage & Cost Tracker et, pour l'estimation avant ordre, Strategy/Risk.

- [ ] Produire une fiche de coûts assimilable à une **petite facture** pour chaque trade (`TRADE001`), consultable dans Portfolio : montant notionnel, devise de référence, frais ventilés, PnL brut et PnL net.
- [ ] Conserver les identifiants de traçabilité `trade_id`, `order_id`, `execution_id`, `analysis_id`, `request_id`, `provider/exchange`, `strategy_id`, `environment`, horodatages et statut ; prendre en charge plusieurs exécutions pour un ordre et plusieurs ordres pour un trade.
- [ ] Enregistrer séparément les **frais Maker/Taker réellement facturés** par exécution, à l'entrée comme à la sortie, avec montant et actif de paiement ; éviter les doubles comptages lors des imports ou resynchronisations.
- [ ] Mesurer le **coût IA OpenAI** par requête (modèle, tokens d'entrée/sortie, tarif applicable, coût estimé/constaté si disponible) et l'associer aux analyses, décisions, exécutions et trades ; ne jamais comptabiliser plusieurs fois une analyse partagée dans le coût total réellement payé.
- [ ] Enregistrer les **frais gas/réseau**, commissions annexes et **funding** des positions perpétuelles, avec provenance et caractère réel ou estimé.
- [ ] Quantifier le **slippage** à partir d'un prix de référence horodaté et du prix d'exécution, en le distinguant des commissions et en évitant de le soustraire deux fois si le PnL brut le reflète déjà.
- [ ] Conserver les frais dans leur **devise native** (BNB, ETH, USDT, etc.), ainsi que leur équivalent EUR, taux utilisé, source du taux et horodatage ; rendre visible toute conversion indisponible.
- [ ] Calculer les ratios de frais sur une base explicitement affichée (notionnel engagé, montant exécuté ou PnL) ; distinguer coût réel payé, coût imputé aux trades et estimations pré-trade.
- [ ] Prévoir un **AI Usage & Cost Tracker** transversal avec historique des dépenses, budget mensuel interne configurable, seuils d'alerte et ventilation par moteur, stratégie, analyse et trade ; distinguer estimation locale et solde officiel du fournisseur.
- [ ] Exposer une **estimation de coût avant exécution** pour Strategy/Risk, puis une régularisation après exécution dans Portfolio ; les limites budgétaires IA ne doivent jamais bloquer les actions critiques de protection de positions.
- [ ] Tester avec des trades multi-exécutions, frais en cryptoactifs, analyses mutualisées, positions perpétuelles, données manquantes et imports répétés ; vérifier la réconciliation entre frais agrégés et événements bruts.

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
- [x] Build complet v1.8 publié dans `Builds/v1.8/`.

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

### Règle UX transversale v2.2.5 — boutons Actualiser/Synchroniser

- [ ] Uniformiser tous les boutons Actualiser et Synchroniser dans les pages IA-TB : `Actualiser` → `Actualisation…` → `À jour` ou `Erreur`.
- [ ] Employer le composant partagé `App/Frontend/JS/sync_button_state_v2_2_5.js` ou son contrat sur les gestionnaires existants, avec tests et sans casser les demandes réseau.
- [ ] Aucun compteur d'événements/news ni message volumineux dans la barre du bouton ; détails éventuels uniquement dans diagnostics/logs.
- [ ] Conserver protections de session, permissions et anti-requêtes concurrentes, sans retirer l'autorisation spéciale d'actions administratives distinctes.
