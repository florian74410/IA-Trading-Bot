# IA-TB v2.3 — Trading Engine 2.0 / Runtime & Health

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
