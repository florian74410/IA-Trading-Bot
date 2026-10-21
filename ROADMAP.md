## Candidate 2.4.1 DEV — recette locale

Branche `feature/v2.4.1-bank-calendar-cp1` : calendrier responsive et traits
d’événements, alignement Bank, fonctions Bank suspendues, données collectées
accessibles à Supervisor via Router CP/1.
[Portée et limites](Documentation/RELEASE_2.4.1_DEV.md). Pas de promotion stable
ni de déploiement GEN-1 ; recette locale à suivre.

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
- [ ] **Recette Firefox / Linux GEN-1 DEBUG** : rendu miniature/plein écran, 1280×800, filtres/catégories, géolocalisation, performances WebGL et fallback, marqueurs sur différentes unités de temps et conservation d'Auth21.
- [ ] **Promotion et déploiement** seulement après validation sur TEST isolé avec `IATB_TRADING_LIVE=0`, `IATB_TRADING_ENGINE_ENABLED=0` et sauvegardes préservées.

**Hors de ce correctif :** l'enrichissement IA des news par classement/déduplication/scoring reste un chantier de ROADMAP distinct, pour ne pas déstabiliser Fundamental et Supervisor.



## 🔜 Fundamental Engine — pipeline News structuré avant Supervisor (R&D / version ultérieure)

**Statut : conception à valider ; aucun remplacement des flux actifs dans v2.2.4.**
Faire tourner ce pipeline **en parallèle** de la collecte existante (shadow mode), mesurer la concordance et la qualité, puis brancher progressivement le Supervisor uniquement après validation. Le contrat historique et les catégories consommées actuellement restent inchangés.

- [ ] **1. Normalisation à l’ingestion :** produire un événement canonique `id, source, title, summary, url, published_at, symbols, geography, language, raw_category, confidence`, conserver un pointeur vers l’original ; prendre en compte dates manquantes et fuseaux.
- [ ] **2. Déduplication et regroupement :** URL canonique, hash titre/résumé, similarité textuelle légère et fenêtre temporelle ; constituer un *news cluster* avec article leader et sources secondaires, sans perdre les sources.
- [ ] **3. Catégorisation multithème :** `MACRO, CRYPTO, DEFI, REGULATION, SECURITY, MARKET_STRUCTURE, ADOPTION, PROJECT, EXCHANGE`. Attribution multi-étiquette, preuves/règles et catégorie `UNCLASSIFIED` si confiance insuffisante.
- [ ] **4. Scoring transparent :** impact marché, confiance, portée géographique, horizon `INTRADAY/SHORT/MEDIUM`, urgence `LOW/MEDIUM/HIGH/CRITICAL`, portée `ASSET/SECTOR/GLOBAL` ; neutralité par défaut, aucune inférence de direction de prix sans justification.
- [ ] **5. Contrat Supervisor versionné :** `fundamental_event` + `cluster_summary` + `category` + `impact_score` + `watchlist_targets` + `risk_flags`, schéma validé, compatibilité descendante et journal d’explicabilité.
- [ ] **6. Déploiement progressif sans LLM lourd :** niveau 1 règles par source/mots-clés/tags/symboles/pays ; niveau 2 score/confiance/regroupement/extraction ; niveau 3 export structuré vers Supervisor sous feature flag, désactivé tant que non validé.
- [ ] **7. Validation :** corpus de news labellisées, taux de faux regroupements, précision/rappel par catégorie, couverture des sources et latence/coût CPU ; comparaison en shadow mode et rollback immédiat.

### Globe Fundamental — suivi v2.2.4

- [ ] Recette du globe compact léger (continents stylisés, rotation fluide, filtres Jour/Semaine/Mois, exclusion des événements sans timestamp fiable, réglage suivant préférences d’animation).
- [ ] Vérifier rendu par rapport au globe plein écran, consommation CPU, responsive, interaction et non-régression des autres composants Fundamental.
- [ ] Amélioration graphique future optionnelle : pays / côtes plus détaillés avec données géographiques locales simplifiées, sans texture lourde ni dépendance réseau obligatoire.



Cette feuille de route est la référence officielle du développement du projet.

## Règles de suivi

- La dernière version validée et stabilisée est considérée comme figée.
- La version suivante est préparée ici avant le début de son développement.
- `[ ]` = fonctionnalité prévue / non terminée.
- `[x]` = fonctionnalité conçue, intégrée et suffisamment vérifiée.
- Une fonctionnalité n'est pas cochée uniquement parce que du code existe.
- Une version ne devient **STABLE** qu'après validation de ses fonctions, tests, documentation et packaging.
- `ROADMAP.md` décrit le travail prévu ou en cours ; `CHANGELOG.md` décrit le travail réellement livré.

## 🔐 IA-TB DEBUG 2.1 — Authentification native multiutilisateur (CONCEPTION EN COURS)

**Fiche de travail officielle et cases de validation :** [AUTH_DEBUG_2.1_WORKPLAN.md](Documentation/Architecture/AUTH_DEBUG_2.1_WORKPLAN.md). Cette fiche est l'unique source de vérité pour cocher les tâches ; les lots ci-dessous restent un résumé de référence.


**Décision validée :** Modèle A (Core Auth + UI Gateway + RBAC + SQLite), trois rôles ADMIN / USER / GUEST, CLI natif sur GEN-1 réutilisé à distance par IA-TB CLI. Première étape de conception documentée dans [AUTH_DEBUG_2.1_DESIGN.md](Documentation/Architecture/AUTH_DEBUG_2.1_DESIGN.md). **Version 2.1 cible, non livrée ; pas de changement au VPS à ce stade.**

### Lot 1 — Contrat et état initial
- [x] Recenser les composants existants (Core Clients, ancien login, SQLite, UI Gateway, permissions et lien wallet/clientId).
- [x] Décider séparation DEBUG / RELEASE et persistance des comptes à travers les mises à jour.
- [ ] Auditer les routes publiques, sous-routes, accès directs Core/Router, en-têtes de rôle, protections interservices et écran de login ; cartographier la surface d'attaque.
- [ ] Définir et tester la matrice de permissions serveur (refus par défaut) et l'isolation par propriétaire.
- [ ] Définir les formats versionnés : auth_schema_version, auth_protocol_version, permissions_version ; migration uniquement explicite/contrôlée.

### Lot 2 — Stockage et comptes
- [ ] Conserver SQLite et les volumes persistants existants ; sauvegarde cohérente de clients.sqlite **et** des clés séparées avant toute migration.
- [ ] Migrer les tables par scripts versionnés ; vérifier intégrité, permissions, absence d'auto-génération dangereuse de nouvelle clé si une ancienne base existe.
- [ ] Implémenter hash de mot de passe Argon2id (Node 22 : dépendance compatible et contrôlée à valider), compatibilité PBKDF2 temporaire, politique de mot de passe et anti-brute-force.
- [ ] Préparer la remise à zéro **des seuls comptes de connexion existants** après inventaire/sauvegarde et approbation ; ne pas effacer clients, associations, wallets, secrets ou clés par effet de bord.
- [ ] Préserver un ADMIN actif pendant la migration ; premier compte ADMIN créé depuis CLI natif en canal SSH ; garder une procédure de récupération hors Web.

### Lot 3 — Auth, verrouillage et privilèges
- [ ] Neutraliser le bypass local pour tout mode exposé ; supprimer inscription/recovery publique ancienne ou l'isoler strictement ; /api/bootstrap ne doit plus toujours répondre authenticated=true.
- [ ] Authentification via compte actif et mot de passe valide ; sessions serveur à durée limitée, cookies HttpOnly/Secure/SameSite sous HTTPS, régénération d'ID, révocation et CSRF.
- [ ] AutoLock après **5 minutes d'inactivité réelle**, vérifié côté serveur ; le polling des données n'entretient pas la session déverrouillée ; mot de passe obligatoire au déverrouillage, sans perte du contexte de la page.
- [ ] Associer chaque requête autorisée à l'identité vérifiée et aux permissions; protections appliquées dans UI Gateway **et** aux frontières métier Core/Router ; refuser en-têtes de rôle fournis par un navigateur.
- [ ] ADMIN : application complète, sans privilèges shell/root ; USER : application hors Admin ; GUEST : lecture seule, modifications visuelles locales seulement, jamais d'écriture/passage d'ordres.
- [ ] Séparer stratégies, préférences, wallets, portefeuilles, événements privés par clientId et confirmer le refus d'accès cross-user (IDOR).
- [ ] Journalisation de sécurité sans secrets, sessions expirées, comptes désactivés, audit des opérations ; tests de contournement automatisés.

### Lot 4 — Administration et CLI
- [ ] Implémenter le programme d'administration **dans IA-TB** (list/create/role/enable/disable/reset-password/delete/audit) utilisable depuis SSH sur GEN-1, saisie du mot de passe masquée et aucun secret en argument.
- [ ] Appeler les **mêmes commandes natives** via iatb users ... sur Macro, avec droits OS strictement nécessaires ; ne pas donner d'accès Docker ni sudo générique au navigateur.
- [ ] Empêcher suppression/rétrogradation du dernier ADMIN, journaliser les changements et invalider les sessions concernées.
- [ ] Prévoir export/import chiffré, versionné et **volontaire** de comptes entre DEBUG/RELEASE ; ne pas transférer sessions ni clés de wallets ; confirmation des rôles à l'import.

### Lot 5 — Intégration et déploiement contrôlé
- [ ] Intégrer ou adapter le formulaire de connexion existant, sans inscription ; tests des routes et de l'interface.
- [ ] Tests de sécurité et non-régression de Core/UI/Router/Engines ; livraison en image DEBUG 2.1 versionnée, rollback et volume persistants garantis.
- [ ] Déployer d'abord en environnement isolé puis sur GEN-1 **sans publier de port** ; tester HTTP privé via tunnel SSH/VPN uniquement.
- [ ] Créer l'ADMIN depuis CLI et vérifier ADMIN/USER/GUEST, AutoLock, sessions et revocation.
- [ ] Pour ouverture à tous sur Internet, placer uniquement le Gateway derrière **HTTPS** (certificat ACME gratuit et renouvellement automatique possible avant le gestionnaire Admin), filtrer les autres ports et bloquer si une protection échoue.
- [ ] Ne pas activer le Trading Engine LIVE et conserver l'état MarketData/collecte fonctionnel.

### Hors périmètre prioritaire DEBUG 2.1
- **Wallets :** ne modifier ni remplacer les clés persistantes ni la logique de chiffrement pendant ce chantier. Le lien wallet/clientId existe déjà mais le serveur possède la clé maître ; ne pas prétendre que l'admin VPS ne peut accéder aux secrets. Audit futur **après Supervisor Engine**, étude watch-only et connecteurs externes (WalletConnect/extensions/hardware wallets), sans logiciel IA-TB obligatoire à télécharger. Aucun wallet réel pour les tests DEBUG.
- **TLS Manager Admin :** fonctionnalités détaillées plus bas ; non requis pour coder/tester l'auth en HTTP privé.

**Critères bloquants :** aucun login public sur HTTP non chiffré, aucune route sensible accessible sans authentification et privilèges serveur, migration réversible, zéro secret dans Git, vérifications négatives et restauration ADMIN testées.

---

## 🔐 GEN-1 — Gestionnaire de certificats TLS/HTTPS depuis Admin (ROADMAP FUTURE)

**Idée validée, développement différé.** Objectif : suivre les certificats du Gateway depuis la page Admin sans intervention manuelle récurrente ; le renouvellement peut être automatisé auparavant par un reverse proxy/ACME (Caddy ou Certbot) sans attendre cette UI.

- [ ] Lister domaines et éventuellement IP couverts, émetteur, chaîne, numéro de série abrégé, dates de validité, jours restants, statut HTTPS et prochain contrôle.
- [ ] Surveillance quotidienne et alertes progressives (renouvellement proche, échec, expiration, perte du service), horodatées et auditables.
- [ ] Utiliser ACME et les informations de renouvellement de l'autorité (ARI quand disponible) ; ne **pas** supposer que tous les certificats durent 6 jours. En octobre 2026 : Let's Encrypt standard 90 j ; profil 6 j facultatif ; durée par défaut appelée à évoluer.
- [ ] Renouveler automatiquement avant expiration avec tentatives espacées, tests de chaîne/nom de domaine, activation atomique et retour arrière sans coupure.
- [ ] Ajouter/importer un certificat existant, vérifier le couple certificat/clé privée, afficher son état et retirer uniquement un certificat non actif après confirmation.
- [ ] Séparer clés privées et certificats, permissions système restrictives, stockage persistant hors Git ; aucune clé privée, contenu sensible ou commande shell arbitraire dans le navigateur/API.
- [ ] UI Admin **statut et actions bornées** ; un agent système dédié à privilèges minimaux exécute la rotation. Ne pas donner l'accès root/SSH/Docker via la page Admin.
- [ ] Tests de renouvellement en staging ACME, test d'expiration simulée, rollback et restauration documentés.

**Statut :** R&D planifiée après la sécurisation de l'accès ; ne pas confondre interface de gestion TLS future et nécessité de TLS pour un login public.

---

## 🧪 GEN-1 DEBUG — Audit fonctionnel UI / MarketData (12 octobre 2026)

**Statut :** audit utilisateur en cours, aucune correction de code lancée. Déploiement actuel à préserver : image `iatb:debug-aac8341`, 13 services DEBUG, Trading Engine désactivé ; graphiques réactifs. Ne pas modifier le circuit de collecte MarketData opérationnel, le mode HTTP `maxBytes`, ni activer le Trading Live. Tests HTTP externes temporaires : fermer Socat et retirer la règle Contabo après la séance. Authentification avant HTTPS lors d'une séance ultérieure.

### Étape C1 — Statistiques : Top Pools et coût d'exécution (PHOTO 1 — VALIDÉE)

- [ ] Reproduire les quatre tableaux vides « Top Pools » : TVL, volume 24 h, APR/APY, liquidité ; relever les endpoints appelés, leurs réponses et leurs éventuelles erreurs, sans inventer de données.
- [ ] Vérifier les acquisitions DeFiLlama (TVL/protocoles, volumes DEX et autres datasets réellement disponibles) et DexScreener (paires/pools, liquidité), les formats attendus et les sources propres à chaque métrique ; documenter les métriques non exposées par les API.
- [ ] Suivre les données depuis MarketData vers Firewall, Router/Core puis composants Statistiques : propagation, normalisation, filtres, critères de classement, unités, fraîcheur et erreurs.
- [ ] Corriger uniquement le maillon manquant, afficher les cinq meilleurs résultats réels par métrique quand disponibles et un motif clair lorsqu'ils sont indisponibles ; ne pas assimiler APR/APY à TVL/liquidité ni fabriquer des rendements.
- [ ] Pour « Coût total d'exécution », vérifier le couple de tokens, la chaîne, le pool DexScreener exploitable, la liquidité et les entrées du simulateur ; calculer gas/frais DEX/slippage uniquement si les données suffisantes existent ; sinon afficher « estimation indisponible » et raison.
- [ ] Corriger le statut LIVE pour qu'il exprime une donnée effectivement récente, et non seulement un service joignable ; ajouter tests intégration et non-régression.

### Étape C2 — Fundamental : erreurs de collecte RSS/Atom (PHOTO 2 — VALIDÉE)

- [ ] Inspecter les erreurs `feed.collect.error` observées sur THEBLOCK, FT, BLOOMBERG et REUTERS ; vérifier logs, statut HTTP, URL, timeout, parsing et éventuel blocage par source.
- [ ] Distinguer source temporairement indisponible, limitation/anti-bot, flux non conforme et défaut de configuration ; conserver les sources valides sans ralentir la collecte globale.
- [ ] Mettre en place un diagnostic et un statut propres à chaque flux, avec reprise/retry raisonnable et tests de collecte sans appels répétés excessifs.

### Étape C3 — Fundamental : dernières News absentes malgré ~867 publications (PHOTO 2 / PHOTO 3 — VALIDÉE)

- [ ] Reproduire l'écart : compteurs Fundamental annonçant ~867 publications, alors que le bloc des dernières News affiche « Aucune publication collectée pour le moment ».
- [ ] Comparer le chemin des compteurs et celui du bloc News : même base/dataset ? même instance, schéma, stockage Docker persistant, endpoint, filtres, statut et pagination ?
- [ ] Contrôler la réponse JSON du endpoint News, les erreurs Core ↔ Router ↔ Fundamental, le parsing UI et les filtres (source, catégorie, plage temporelle, état, publication) susceptibles d'exclure les éléments.
- [ ] Vérifier le champ de date utilisé et les dates invalides/manquantes ; afficher par défaut les **5 actualités disponibles les plus récentes**, triées par date de publication décroissante avec repli explicite sur la date de collecte si nécessaire, indépendamment d'un filtre « dernières 24 h » destiné aux statistiques.
- [ ] Afficher pour chaque news titre, source et horodatage quand présents ; état vide uniquement lorsque le résultat confirmé est réellement vide, erreur/timeout avec message distinct lorsque la requête échoue.
- [ ] Garantir pagination et déduplication stable, rafraîchissement après collecte, et tests sur données réelles + cas 0/1/5/N publications. Ne jamais masquer un échec d'endpoint sous un message « aucune publication ».
- [ ] Examiner le `CP_ENGINE_TIMEOUT` aperçu dans l'écran Fundamental : déterminer quelle requête expire, si elle bloque le bloc News et si son exécution doit être asynchrone ; ne pas augmenter globalement les timeouts sans diagnostic.

### Étape C4 — Trading IA : catalogue des paires (PHOTO 4 — À CONFIRMER DANS L'AUDIT)

- [ ] Vérifier pourquoi Binance ne propose que BTC/USDT, ETH/USDT et SOL/USDT dans la liste, alors que les bougies ETH/USDT s'affichent.
- [ ] Remplacer un éventuel catalogue statique par les instruments réellement disponibles chez le provider choisi via MarketData, avec statut, typologie Spot/Perp, format normalisé, recherche et pagination/virtualisation si nécessaire.
- [ ] Vérifier chargement, changement de marché et non-régression de la latence du graphique.

### Étape C5 — Interface Chart Viewer (PHOTO 4 — À CONFIRMER)

- [ ] Vérifier si le défilement horizontal visible est un défaut de CSS, un conteneur volontaire ou un débordement ; corriger seulement s'il est parasite, sans affecter le graphique.

### Étape C6 — UI : supprimer les barres de défilement internes visibles (NOUVELLES PHOTOS 01:33/01:34 — VALIDÉE)

- [ ] Repérer les scrollbars horizontales visibles dans la barre d'outils Trading IA / Chart Viewer et dans la sous-navigation Paramètres (ainsi que les débordements analogues de l'interface).
- [ ] Conserver **uniquement la barre de défilement verticale de la page entière comme barre visible** ; supprimer les scrollbars internes inutiles en corrigeant les dimensions flex/min-width/overflow, sans cacher du contenu.
- [ ] Si la sous-navigation comporte plus d'onglets que la largeur disponible, prévoir adaptation responsive / défilement horizontal utilisable sans barre apparente (trackpad, molette adaptée, clavier ou flèches explicites accessibles) ; ne pas rendre les onglets inaccessibles.
- [ ] Sur Trading IA, faire tenir la barre d'outils sans défilement parasite et préserver la zone graphique et ses contrôles ; si nécessaire réorganiser les contrôles aux petites largeurs.
- [ ] Vérifier le rendu sur Chrome de Macro et plusieurs largeurs, le défilement vertical global, l'accessibilité et l'absence de régression des performances du graphique ; rapprocher cette étape de C5 sans créer deux changements CSS contradictoires.

### Étape C7 — Providers / Statistiques : métriques réelles et historique compact (NOUVELLE PHOTO 01:34 — VALIDÉE)

- [ ] Auditer les statistiques et événements déjà disponibles par provider dans MarketData, la télémétrie REST/Stream, le Firewall et l'orchestrateur : succès, erreurs, rejets bloqués, codes HTTP, limitation 429, cache et dates ; identifier les champs réellement disponibles et ceux non instrumentés.
- [ ] Définir précisément les compteurs **requêtes réussies**, **requêtes en erreur** et **requêtes bloquées** (ex. refus Firewall, politique/budget en mode exécutoire) en distinguant observations SHADOW, 429 provider, retries et cache hits ; éviter les doubles comptages et ne pas afficher des chiffres inventés.
- [ ] Agréger les événements par provider et par tranche temporelle avec horodatage, volume de requêtes, taux de réussite et erreurs ; conserver un historique borné persistant ou exploiter la télémétrie existante, avec rétention configurable et faible coût VPS.
- [ ] Ajouter à l'onglet « Providers > Statistiques » quelques KPI compacts (réussies, erreurs, bloquées, éventuellement taux de réussite), sans déborder ni remplacer les statistiques existantes.
- [ ] Afficher un **mini-graphique temporel compact** (courbes ou barres empilées) au sein du panneau actuel, avec légende et plage de temps courte (ex. 1 h/24 h/7 j lorsque les données existent), sans agrandir la page inutilement.
- [ ] Actualiser les statistiques à cadence raisonnable, avec gestion de l'absence de télémétrie (« indisponible » ou zéro avéré), test de cohérence des totaux, isolation par provider, tests de redémarrage et de charge ; ne pas générer de requêtes vers les exchanges pour construire ce graphique.

### Étape C8 — Livraison du lot de corrections en patch v2.0.1 compatible Docker DEBUG (À PRÉPARER APRÈS AUDIT)

- [ ] Finaliser l'audit et figer la liste des corrections C1 à C7 et C9 ; rattacher chaque changement à une anomalie et à des critères d'acceptation mesurables.
- [ ] Préparer un patch **v2.0.1** incrémental depuis le commit/image DEBUG validé, avec liste des fichiers modifiés, manifeste/version, notes de changement, tests et procédure de retour arrière.
- [ ] Rendre l'intégration simple sur GEN-1 : reconstruire une **nouvelle image Docker versionnée** depuis le source patché, fournir un override Compose **persistant** et un déploiement explicite des seuls services nécessaires ; ne pas modifier les conteneurs en place à la main et éviter l'override éphémère de `/tmp` pour les mises à jour pérennes.
- [ ] Préserver volumes/state, configuration des ports privés, `IATB_MARKETDATA_OFFLINE_DIAGNOSTIC=0`, orchestrateur SHADOW tant que non validé, et Trading Engine **désactivé** ; ne pas toucher au traitement HTTP `maxBytes` ni réécrire le MarketData opérationnel.
- [ ] Vérifier tests unitaires et intégration (UI/Core/Router/Firewall/MarketData/Fundamental/Providers), temps de chargement et changement de marché, puis déployer progressivement avec contrôle de santé et rollback documenté vers l'image `iatb:debug-aac8341`.
- [ ] Garder l'accès HTTP externe temporaire strictement restreint, puis arrêter Socat et supprimer l'exception Contabo une fois les tests terminés ; traiter **authentification avant HTTPS** dans un chantier séparé.

### Étape C9 — Trading IA : indicateurs sélectionnés mais invisibles sur le graphique (NOUVELLE ANOMALIE — SIGNALÉE)

- [ ] Reproduire avec un indicateur simple (SMA/EMA) puis un oscillateur (RSI/MACD), sur au moins deux providers et deux unités de temps ; noter si la sélection est mémorisée, si le bouton réagit et si une erreur apparaît.
- [ ] Auditer le flux complet du bouton « Indicateurs » : identifiant de l'indicateur sélectionné, configuration active, état frontend, événements de sélection/désélection et éventuelle persistance par contexte marché/paire/timeframe.
- [ ] Contrôler le registre des indicateurs et l'Indicator Engine : disponibilité, paramètres, données OHLC nécessaires, requête et réponse Core ↔ Router ↔ Indicator, traitement des erreurs et correspondance des timestamps avec les bougies.
- [ ] Vérifier la connexion entre les séries calculées et le Chart Viewer : affectation de l'indicateur au graphique, création/destruction des séries, visibilité, axe et échelle, plage temporelle, données nulles/insuffisantes, dessin au-dessus du prix ou dans un panneau inférieur selon le type d'indicateur.
- [ ] Corriger uniquement le composant fautif (événement UI, API/distribution, calcul ou rendu), sans modifier la collecte des bougies ni casser la réactivité obtenue lors du changement de paire et de provider.
- [ ] Afficher un état utilisateur clair « chargé / calcul en cours / données insuffisantes / erreur », avec suppression et reconfiguration d'un indicateur fonctionnelles ; éviter les échecs silencieux.
- [ ] Ajouter les tests de non-régression : activation, désactivation, plusieurs indicateurs, changement de paire, provider et timeframe, retour sur la page Trading IA, rafraîchissement et rendu à largeur réduite ; chronométrer l'impact sur l'affichage graphique.
- [ ] Inclure le correctif C9 dans le périmètre du patch v2.0.1 et ses critères d'acceptation, sans déclarer l'anomalie résolue avant validation sur Docker DEBUG.

### Hors anomalie retenue

- « Clé OpenAI absente » : comportement attendu tant que la clé n'est pas configurée ; aucune saisie de secret via HTTP temporaire. Configuration à traiter après AUTH + HTTPS.
- « 867 publications / 867 publications 24 h » : ne pas présumer d'une erreur de compteur ; priorité au bloc News effectivement vide.
- Aucun élément de cette checklist ne doit être coché avant correction et validation utilisateur.

## 🔒 GEN-1 — Jalon préalable à la première intégration RELEASE (À FAIRE PLUS TARD)

**Priorité actuelle :** terminer et valider l'accès à l'UI Docker DEBUG du VPS Contabo par tunnel SSH. Ce chantier *Shared Data* est explicitement différé ; **aucune intégration RELEASE n'est autorisée à ce stade**.

**Décision d'architecture :** DEBUG accessible uniquement par tunnel SSH ; RELEASE accessible par domaine HTTPS authentifié ainsi que par tunnel SSH. Les exécutions, configurations, secrets, utilisateurs, wallets, portefeuilles, ordres, historiques privés et journaux restent séparés. Seules les données publiques explicitement éligibles sont mutualisées.

**Jalon bloquant avant la première promotion d'un build en RELEASE — Shared Data GEN-1 et Compatibility Layer v1 :**

- [ ] Concevoir un stockage persistant commun dédié (cible `/var/lib/iatb/shared/`) pour les news RSS/Atom publiques, données de marché, métadonnées CoinGecko/DeFiLlama et calendriers/FED Watch, selon les droits de réutilisation des providers.
- [ ] Mutualiser l'acquisition externe avec l'API Request Orchestrator : cache-first, TTL/fraîcheur, déduplication des requêtes en cours, budgets/quotas par provider et politique explicite en cas de cache incompatible.
- [ ] Interdire l'écriture concurrente libre par DEBUG et RELEASE dans les mêmes tables SQLite ; désigner un collecteur/propriétaire unique de l'écriture et exposer des lectures contrôlées.
- [ ] Versionner chaque enregistrement partagé : `schema_id`, `schema_version`, `producer_version` (traçabilité), timestamps de création/mise à jour/expiration, provenance et payload ; séparer la version du schéma de données de celle du schéma SQL et de l'application.
- [ ] Publier un registre de compatibilité par Engine/version de build, décrivant précisément les `schema_id` et `schema_version` acceptés (ou une plage explicitement vérifiée), sans déduire la compatibilité du seul numéro de version IA-TB.
- [ ] **Vérifier avant toute désérialisation/consommation** la compatibilité du schéma, la fraîcheur et les droits d'accès ; si incompatibilité ou schéma inconnu : **ne pas charger la donnée**, signaler `CACHE_INCOMPATIBLE`, puis utiliser uniquement un repli explicitement compatible.
- [ ] Permettre la coexistence de plusieurs variantes d'un même objet par version de schéma ; une DEBUG récente ne doit jamais écraser la seule variante encore lisible par une ancienne RELEASE.
- [ ] Prévoir éventuellement des adaptateurs de migration/conversion versionnés et testés, mais **aucune conversion implicite ni réinterprétation silencieuse**.
- [ ] Tester le scénario critique : DEBUG produit un schéma plus récent que celui accepté par RELEASE ; RELEASE refuse la nouvelle version et continue à lire ses données compatibles sans perturbation. Tester également coexistence, cache expiré, déduplication et rollback.
- [ ] Valider tests, documentation, sauvegarde/restauration et séparation des permissions avant tout premier déploiement RELEASE.

**Statut :** décision validée, développement non commencé. **Ordre imposé :** tunnel SSH + UI DEBUG → validation fonctionnelle DEBUG → implémentation/validation Shared Data + compatibilité → seulement ensuite première intégration d'un build RELEASE.

---

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
- [x] Build complet publié dans `Builds/v1.7.9/`.
- [x] Archive complète publiée dans `Archives/IA-Trading-Bot_V1.7.9.zip` avec SHA-256.
- [x] `CHANGELOG.md` et `VERSION` disponibles dans le code livré.
- [x] La v1.7.9 a servi de source officielle vérifiée pour le passage UpdateManager vers v1.8.0.
- [ ] Validation end-to-end de toutes les fonctions prévues sur la machine cible.
- [ ] Vérification consommation mémoire / stabilité sur la machine cible.
- [ ] Vérification finale puis déclaration **v1.7.9 STABLE** au sens fonctionnel complet.

---

# ✅ v1.8.2 — FINALISÉE

Le packaging v1.8 est maintenant reproductible : la version est produite depuis l'archive officielle v1.7.9 au moyen d'un patch UpdateManager `1.7.9 -> 1.8.0`. Le patch a été accepté et installé par le vrai UpdateManager de la v1.7.9 sous Node.js 16.20.2, puis le résultat a été comparé au build `Builds/v1.8`.

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
