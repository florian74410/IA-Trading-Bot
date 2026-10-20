# IA-TB v2.3 — Trading Engine 2.0 / Runtime & Health

## Suivi P3 — Commandes ADMIN (2026-10-20)

**P3 partiellement implémentée ; ne pas annoncer la commande de maintenance opérationnelle.**

- [x] Contrôleur indépendant `trading_admin_controller_v2.js`, sans route publique/CP1, avec liste blanche `STATUS`, `START`, `RESTART`, `DRAINING_STOP`, `EMERGENCY_STOP`.
- [x] Refus par défaut en absence d'un vérificateur de principal Auth21 ; un jeton de service CP/1, un header ou un champ `role` fournis par l'appelant ne valent pas identité ADMIN.
- [x] Contrôles de commande : identifiant, horodatage récent, confirmation explicite ; transitions non implémentées donc **aucune exécution ni liquidation**.
- [x] Test unitaire `tests/test_trading_admin_controller_v2.js` créé ; exécution différée selon consigne.
- [ ] Raccorder à une vérification **réelle** Auth21 côté Core, avec permission d'opération et principal vérifié avant émission d'une capacité bornée à l'action, au compte et à une courte durée.
- [ ] Définir le contrat CP/1 Routeur/Firewall et les autorisations dans ProtocolRegistry, puis brancher le contrôleur en refus par défaut.
- [ ] Ajouter journal durable des actions ADMIN, protection anti-rejeu persistante, idempotence sous concurrence, audit sans données sensibles.
- [ ] Activer les comportements `START/RESTART` uniquement après réconciliation confirmée (P4-P5 et test d'intégration).
- [ ] P4 et P5 restent seuls responsables de l'exécution des séquences d'arrêt.

**Pourquoi ce choix :** l'ingress Auth21 existant autorise certains messages machine par jeton CP/1 mais ne fournit pas au Trading Engine la preuve d'un rôle ADMIN vérifié. Connecter maintenant un arrêt ou un redémarrage à cette authentification machine créerait une faille de privilèges. 

## Suivi P2 — Health Monitor CP/1 (2026-10-20)

**P2 code intégré, tests écrits, exécution différée selon décision du projet.**

- [x] `trading_health_monitor_v2.js` avec métriques instantanées (requêtes en cours, compteurs, latence de traitement, uptime, dernière exécution, dernière erreur anonymisée).
- [x] État runtime P1, activation service et LIVE, état de persistance JSONL ; SQLite `NOT_INTEGRATED` jusqu'à fusion de la branche Logs.
- [x] Disponibilité des brokers et nombres d'ordres exposés comme **inconnus / non vérifiés** plutôt que simulés ; CP/1 indiqué configuré mais disponibilité distante non vérifiée.
- [x] Intégration au `GET /health` et à l'action `trading.health` CP/1 existants (aucune nouvelle permission créée).
- [x] Tests unitaires ajoutés sous `tests/test_trading_health_monitor_v2.js`.
- [ ] Tester localement le contrat et vérifier compatibilité des consommateurs existants de `trading.health`.
- [ ] P3 : définir et autoriser l'endpoint ADMIN de diagnostic avancé avec Auth21 au backend ; ne jamais dévoiler de secrets API, noms de comptes utilisateurs ou informations sensibles dans le Health ordinaire.
- [ ] En phase d'intégration, brancher comptage des ordres et tests actifs non destructifs de connectivité via les services habilités ; éviter les contrôles réseau synchrones à chaque requête Health.
- [ ] L'état SQL, les logs formatés, les commandes ADMIN et les commandes d'arrêt sont hors périmètre P2.

## Suivi de réalisation — P1 (2026-10-20)

**P1 — code présent sur la branche, tests automatisés écrits mais non exécutés. Ne pas déployer.**

- [x] Module `trading_runtime_state_v2.js`, persistance JSON atomique (temp + rename) dans le User Data séparé.
- [x] États persistés `STOPPED`, `STARTING`, `RUNNING`, `DRAINING`, `DRAINING_BLOCKED`, `RECONCILING`, `EMERGENCY_HALTED`, `DEGRADED`, `ERROR`.
- [x] Défaut sécurisé : première installation en `STOPPED` avec reprise ADMIN requise ; redémarrage inattendu d'un état actif vers `ERROR` sans reprise implicite.
- [x] Intégration de la barrière runtime dans `trading_service.js` pour les actions mutantes et ajout d'un snapshot dans le health existant. Lecture CP/1 conservée.
- [x] Interception des signaux de fermeture pour enregistrer le verrou d'arrêt local ; cette interception **n'annule pas et ne clôture aucune position**.
- [x] Script de test du store et des redémarrages : `node App/services/trading-engine/tests/test_trading_runtime_state_v2.js`.
- [ ] Exécuter les tests en local et analyser l'intégration au gestionnaire de processus, avec crash/permissions/arrêt et redémarrage du conteneur.
- [ ] Valider la durabilité forte (fsync fichier/répertoire), les écritures simultanées et les droits d'accès avant déploiement.
- [ ] P2 Health avancé et P3 commandes ADMIN nécessaires avant tout passage en `RUNNING`. Ne pas activer le LIVE.

**Attention :** P1 ne constitue ni une liquidation `DRAINING_STOP`, ni un `EMERGENCY_STOP` opérationnel. Les états existent en tant que modèle, pas comme séquences de maintenance exposées. Les signaux système n'imitent pas `DRAINING_STOP`. La version R1 déployée est inchangée.


**Statut : spécification validée, implémentation et tests locaux à venir.** Branche `feature/v2.3-runtime-trading-engine-2.0`, créée directement depuis v2.2.5-R1 (`39e78e76`). Aucun déploiement VPS, trading LIVE désactivé.

## Ordre de réalisation (impératif)

1. Runtime autonome et états persistants de cycle de vie ; distinguer arrêt ADMIN volontaire et crash, éviter le redémarrage automatique après arrêt intentionnel.
2. Health Monitor CP/1 (santé basique et diagnostic ADMIN) indépendamment du frontend.
3. Contrôles ADMIN sécurisés, idempotents et journalisés ; état partagé Router/Firewall et autorisations Auth21 réévaluées au backend.
4. `EMERGENCY_STOP` : interdiction immédiate de toute nouvelle soumission locale ; persistance d'un verrou `EMERGENCY_HALTED` survivant aux redémarrages. Ne clôture ni n'annule automatiquement les ordres déjà chez les brokers.
5. `DRAINING_STOP` : arrêt coordonné, exige la prise en charge effective des capacités d'annulation, de fermeture et de réconciliation par broker ; sinon refus avant démarrage de la procédure. Inventaire préalable du périmètre IA-TB (compte, broker, positions et ordres) et confirmation ADMIN explicite des conséquences financières.
6. Tests locaux des races, timeouts, interruptions, crash/restart, doubles commandes, brokers injoignables et états de position incertains ; seulement ensuite UI et recette.

## États

- `STOPPED` : arrêt normal confirmé, aucune position/ordre résiduel dans le périmètre vérifié.
- `STARTING` : initialisation.
- `RUNNING` : accepte des intentions autorisées.
- `DRAINING` : arrêt coordonné en cours, nouvelles intentions interdites.
- `DRAINING_BLOCKED` : liquidation ou réconciliation non confirmée ; intervention ADMIN obligatoire ; ne jamais déclarer succès.
- `EMERGENCY_HALTED` : soumissions locales bloquées, reprise exclusivement ADMIN.
- `DEGRADED` : fonctionnement partiel avec capacités réduites.
- `ERROR` : défaillance bloquante.

## Commandes ADMIN

- `START` / `RESTART` : uniquement lorsque les préconditions de sécurité sont satisfaites ; redémarrage après urgence sous autorisation spécifique.
- `DRAINING_STOP` : arrêt coordonné obligatoire avec fermeture des positions **du périmètre IA-TB**, sous contrôle des brokers ; état `DRAINING` durant toute la séquence.
- `EMERGENCY_STOP` : bloquer immédiatement les nouvelles soumissions ; ne pas annuler d'ordres ni liquider de positions existantes ; état `EMERGENCY_HALTED`.
- `STATUS` : observabilité sans pouvoir de commande.

### DRAINING_STOP — séquence obligatoire

1. Faire vérifier une commande ADMIN récente et afficher avant confirmation l'inventaire des comptes, positions et ordres IA-TB concernés.
2. Verrouiller les nouvelles stratégies/ouvertures ; informer Router, Risk et Firewall.
3. Stabiliser les requêtes d'ordres déjà parties et rechercher leurs résultats, sans réémettre à l'aveugle.
4. Annuler les ordres ouverts concernés et confirmer leur état (y compris fills partiels).
5. Clôturer **une par une** les positions IA-TB restantes, avec reduce-only quand disponible ; chaque clôture passe par les contrôles Risk/Firewall autorisant explicitement les opérations de réduction de risque pendant `DRAINING`.
6. Lire de nouveau les états des brokers et réconcilier la fermeture réelle des positions et l'absence d'ordres résiduels.
7. Persister les résultats et arrêter proprement seulement quand tous les contrôles du périmètre ont réussi. Sinon `DRAINING_BLOCKED` et alerte ADMIN.

**Important** : la clôture peut occasionner frais, slippage, pertes réalisées et ne peut être garantie si l'exchange échoue. Les positions manuelles hors périmètre IA-TB ne doivent jamais être liquidées. Aucun `STOPPED` trompeur si un broker est inaccessible ou le résultat incertain.

### EMERGENCY_STOP — séquence obligatoire

1. Autorisation ADMIN + avertissement clair.
2. Verrouiller sans délai le chemin de soumission local au Trading Engine et au Firewall ; interrompre les travaux locaux interruptibles.
3. Conserver les traces disponibles et les identifiants en vol ; marquer les résultats inconnus pour réconciliation future.
4. État persistant `EMERGENCY_HALTED` ; aucune reprise automatique, même après reboot.
5. L'interface signale expressément que des ordres/positions déjà présents chez les brokers peuvent rester actifs et exposés au marché.

## Confirmations UI

`DRAINING_STOP` : « Arrêt coordonné : IA-TB bloquera les nouveaux ordres, tentera d'annuler les ordres ouverts et de clôturer, une à une, les positions du périmètre indiqué. La procédure peut provoquer frais, slippage ou pertes réalisées et restera bloquée si une clôture n'est pas confirmée. Confirmer ? »

`EMERGENCY_STOP` : « Arrêt d'urgence : IA-TB bloque immédiatement les nouvelles exécutions. Les ordres déjà transmis et les positions ouvertes ne seront ni annulés ni clôturés automatiquement ; ils peuvent rester exposés au marché. Reprise ADMIN obligatoire. Confirmer ? »

Les confirmations frontend ne remplacent jamais les contrôles Auth21 et la validation des droits au backend.

## Health Monitor et distribution UI

Source unique : Health du Trading Engine. Champs à concevoir : état, uptime, état CP/1, latence, requêtes en cours, ordres ouverts, réconciliations en attente, dernière exécution, dernière erreur, état des brokers/comptes API, état du journal local, motif de maintenance et auteur ADMIN. Aucun secret dans les réponses.

- **Trading IA / Mosaïque** : module facultatif, lecture seule, vue synthétique.
- **Paramètres / Trading Engine (section existante à compléter)** : configuration/diagnostic adapté aux permissions ; n'exposer les paramètres sensibles qu'à ADMIN.
- **Panel Administration / Trading Engine** : Health approfondi, opérations, journaux formatés, maintenance ADMIN et historique de ses commandes.

Mettre en place les contrats Health avant les vues UI, pour éviter trois logiques divergentes. Bien distinguer des états « service actif », « engine habilité » et « trading LIVE activé ».

## Limites et dépendances

- Le Compose R1 actuel n'active pas le service Trading Engine ; le build R1 et le VPS ne sont pas à modifier pendant les chantiers isolés.
- Les opérations `DRAINING_STOP` dépendent de l'existence de fonctions **réelles** de lecture, clôture, annulation et réconciliation pour chaque broker ; ne pas simuler la complétude.
- La double écriture JSONL/SQLite du chantier `feature/v2.3-trading-engine-2.0` doit être intégrée plus tard par fusion contrôlée, et non copiée dans cette branche.
- Tests de conformité et validation locale obligatoires avant fusion de la v2.3.
