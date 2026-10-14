# IA-TB DEBUG 2.1 — P2.2 — Coordination des écrivains et reprise cohérente interservices

> **État : OUVERT**, non implémenté dans les 13 services. Hérite explicitement des obligations sorties du périmètre de [P2.1 (prototype sur fixtures clôturé)](AUTH_DEBUG_2.1_P21_FIXTURE_VALIDATION_REPORT.md).  
> **Références :** [P1.5 Backup/Restore](AUTH_DEBUG_2.1_BACKUP_RESTORE_CONTRACT.md), [protocole de gel](AUTH_DEBUG_2.1_COHERENT_SNAPSHOT_BARRIER.md), [inventaire préliminaire](AUTH_DEBUG_2.1_SQLITE_WRITER_INVENTORY.md), [audit GEN-1](../Security/AUTH_DEBUG_2.1_STORAGE_AUDIT.md).  
> **Interdiction :** **aucun nouveau Docker DEBUG sur GEN-1 avant Auth 2.1 intégralement testé et approuvé** ; ne pas manipuler Wallet, clé Wallet ou compte réel.

## Objectif

Transformer la barrière de démonstration P2.1 en une **coordination applicable à tous les écrivains de données critiques**, avec rollback et résilience aux crashs, mesurée en performance, sans réduire l'isolation de sécurité. Un simple lock `flock` ne suffit **pas** : les writers du runtime n'y participent pas actuellement, et des fichiers JSONL/Annexes sont modifiés hors SQLite.

Le prototype P2.1 reste test-only. **P2.2 devra concevoir puis tester le mécanisme runtime sur un banc isolé** avant tout déploiement ou opération sur un jeu réel.

## Décision de mise en œuvre minimale (Overflow — 14/10/2026)

- **Pas de surarchitecture :** intégrer un coordinateur unique et léger dans Core, avec un registre minimal des ressources/écrivains et des acquittements d'arrêt/reprise. Réutiliser les canaux et cycles de vie existants ; pas de nouveau conteneur, broker, moteur de workflow, protocole distribué générique ou abstraction supplémentaire sans nécessité démontrée.
- **Développement progressif :** protéger d'abord les chemins d'écriture critiques et vérifier au fil de l'eau leurs tests unitaires, fixtures, erreurs et sauvegardes locales. Le registre pourra être étendu uniquement lorsqu'un écrivain réel est confirmé, sans supposer qu'il est exhaustif.
- **Tests inter-Engines en fin de développement :** conserver les tests de cohérence, d'isolation, de permissions, de crash/restart et de contournement **multi-Engines** pour une campagne complète à la fin de l'intégration Auth 2.1 (Phase 6) sur banc isolé, avant tout passage à la Phase 7. Jusqu'alors, P2.2 demeure **OUVERT**, même si ses composants sont codés et leurs tests unitaires réussissent.
- **Aucun raccourci de sûreté :** une sauvegarde globale n'est pas autorisée ni qualifiée « cohérente » tant que les writers concernés ne sont pas réellement coordonnés et validés. ABORT/fail-closed en cas de writer inconnu ou non coopératif. Wallet et GEN-1 restent intouchés ; interdiction de déployer un nouveau Docker DEBUG maintenue.

## Avancement d'implémentation — prototype isolé (14/10/2026)

- **Ajouté :** `App/Core/Backup/snapshot_coordinator.js`, module Node 22 sans dépendance, **non instancié et non importé par les services actifs**. Aucun accès à une DB, au réseau, au Wallet, aux secrets ou à GEN-1.
- **Contrat minimal :** allowlist d'écrivains connue, `prepare(epoch)` avec ACK `{epoch, writerId, pending:0}`, appel de capture uniquement après tous les ACK, puis `release(epoch)` ; `abort(epoch)` en cas d'échec. Refus d'un writer absent, inconnu ou sans acquittement ; état `BLOCKED` si la libération/annulation échoue.
- **Vérification locale :** 10/10 tests unitaires Node 22 réussis avec callbacks simulés, sans moteurs ni fichiers persistants. Voir `App/Tools/Tests/snapshot_coordinator.test.js`, exécuté par `.github/workflows/auth-p22-coordinator-fixtures.yml` ; **[GitHub Actions P2.2 SUCCESS](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38504080153)** (Node 22, syntaxe et fixtures).
- **Limites :** ce prototype ne fige **aucun véritable writer** et ne prouve ni la cohérence interservices, ni la restauration, ni le contrôle des writer/restarts ou les performances. Les `prepare` tardifs doivent respecter l'invalidation d'epoch après ABORT : à implémenter et tester dans chaque participant lors de l'intégration. **Aucune sauvegarde réelle n'est autorisée** par ce module.
- **P2.2 — Clients et Settings (14/10/2026) :** ajout de `LocalSnapshotWriter` dans `snapshot_coordinator.js` et d'un paramètre facultatif `snapshotGate` dans `App/Core/Clients/client_repository.js` et `App/Core/Settings/sqlite_settings_store.js`. Gèle **tous les accès SQL par leurs API** (y compris les lectures potentiellement créatrices de fichiers) et les réinitialisations tant que l'epoch est détenue, sans queue ni microservice. `SettingsStore` ne peut pas transformer silencieusement ce refus en valeurs par défaut via ses lectures de confort. `App/Core/Server/server.js` **ne transmet pas** `snapshotGate` : aucune activation sur le runtime existant. Tests de faux stores : `App/Tools/Tests/core_snapshot_writers.test.js` (6 cas) + coordinateur (10 cas), **[CI P2.2 Node 22 — SUCCESS](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38504944618)**. Sans SQLite réelle, sans secrets, sans Wallet et sans GEN-1.
- **Portfolio — extension opt-in (14/10/2026) :** `App/Portfolio/Engine/portfolio_store.js` accepte désormais `snapshotGate` facultatif comme Clients/Settings. Contrôle AVANT toute création de dossier/connexion SQLite et à l'entrée de ses méthodes SQL (y compris `compactSnapshots`, migrations/initialisation et fermeture). Aucune modification des données de trades, des références Wallet ni de la politique de rétention ; aucune injection dans `portfolio_service.js` : fonctionnement du Portfolio existant conservé. `App/Tools/Tests/portfolio_snapshot_writer.test.js` ajoute six tests sur un adaptateur SQLite simulé et sans données réelles : compatibilité sans garde, refus préinitialisation, refus de toutes les méthodes pendant le gel, reprise après RELEASE et ABORT, générations successives. Workflow Node 22 étendu ; **[CI P2.2 SUCCESS](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38505549291)** (22 tests unitaires : 10 coordinateur + 6 Clients/Settings + 6 Portfolio). Les [contrôles P2.1](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38505549301) et [RBAC](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38505549300) sont également au vert. **Validation limitée aux fixtures.** Aucun Engine démarré et aucun déploiement.
- **Limites et suite :** les tests CI prouvent le refus d'écritures sur les entrées des classes instrumentées avec des adaptateurs factices, pas l'absence de chemins contournant ces classes ni une pause interprocessus. La finalisation de l'inventaire des accès directs, la coordination des autres Engines, la reprise d'un service pendant le gel, les snapshots chiffrés restaurables et la charge p95/p99 restent **non validées**. Les tests complets multi-Engines sont reportés à la Phase 6, avant Phase 7.

## P2.2 — Fundamental Engine : garde SQLite facultatif (14/10/2026)

- **Code ajouté :** `App/Fundamental/Engine/database_core.js` accepte `new Storage({snapshotGate})` (absence de `snapshotGate` = comportement actuel inchangé). Contrôle avant la création du répertoire de données, l'ouverture SQLite, les migrations de démarrage et à l'entrée des **54 méthodes** `Storage.prototype`, y compris écritures de feeds, événements, traductions, synthèses et lectures exposées au stockage. Contrôle JS léger, aucune dépendance nouvelle.
- **Tests isolés :** `App/Tools/Tests/fundamental_snapshot_writer.test.js` (6 cas) : construction sans garde, garde invalide, refus d'initialisation pendant gel, couverture automatique de chaque méthode, parcours coordinateur RELEASE et ABORT. Modules Paths et SQLite **simulés** pendant les tests, sans accès aux secrets ni aux DB réelles. **[CI P2.2 Node 22 SUCCESS](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38506185261)** — **28 tests** cumulés (10 coordinateur + 6 Clients/Settings + 6 Portfolio + 6 Fundamental).
- **Réserve importante :** `App/Fundamental/Engine/database.js` déclenche encore sa migration legacy `fundamental.db` et `-wal/-shm` **dès l'import**, donc **avant** tout `snapshotGate` injecté à `database_core.js`. Ce chemin n'est pas protégé par les 54 gardes ; il devra être refactorisé puis testé sans altérer les données d'origine **avant toute activation du coordinateur**. Les services actifs n'injectent actuellement aucun garde ; aucune sauvegarde globale ni pause interprocessus n'est validée.
- **Calendrier approuvé :** continuer par MarketData et les autres écrivains sur fixtures, puis valider globalement les Engines à la Phase 6. Aucun Docker DEBUG GEN-1, aucune modification Wallet ou de données persistantes réelles.

## Registre des écrivains — couverture exigée

Chaque base, fichier persistant, écriture d'initialisation ou migration doit disposer d'un enregistrement :

| Champ | Valeur attendue |
| --- | --- |
| `resource_id` | Chemin logique/volume à conserver ; chemin réel validé par le déploiement |
| `writer_id` | Service/processus/instance, génération et PID non fiabilisé seul |
| `write_methods` | `INSERT/UPDATE/DELETE/DDL`, append, rename atomique, pruning/retention, startup/migration |
| `criticality` | Auth-critique, historique métier/audit, reconstructible **après confirmation**, Wallet congelé |
| `owner` | Propriétaire de l'autorité de maintenance et des droits sur le volume |
| `barrier_support` | Acquittement d'arrêt, file différée bornée/idempotente, timeout, reprise/crash |
| `test_id` | Test automatisé prouvant arrêt/reprise sans perte et impossibilité du bypass |

Partir de `clients.sqlite`, Settings, Portfolio, Fundamental, Registry, Telemetry/Microstructure, journaux Financial/Trading/Usage, mosaïques, états non-SQLite et scripts CLI. **Ne pas déclarer l'inventaire exhaustif** avant couverture des appels indirects et vérification de la liste des services au runtime de banc.

## Protocole cible

1. `PREPARE_SNAPSHOT(generation, target_scope)` authentifié : maintenance explicitement autorisée ; registre des writers et processus vivants figé, sans ordres LIVE.
2. Chaque writer arrête les **nouvelles mutations**, finit/rollback ses transactions en cours puis acquitte `QUIESCED(generation, writer_id, pending=0)`. Une lecture publique pure peut continuer depuis le cache ; **jamais de suppression d'une mutation acceptée**.
3. Coordinateur rejette les générations incomplètes, writers non enregistrés ou ACK manquants, démarreurs automatiques, versions incompatibles, conflits de rôles ou timeout.
4. Capture des SQLite par Online Backup et des fichiers non SQLite au moyen d'une procédure **consistante et testée**. Staging privé, validation d'intégrité/génération, sauvegarde chiffrée authentifiée, manifest fiable, publication atomique de génération.
5. `RELEASE_SNAPSHOT(generation)` ; reprise idempotente des écritures, mesure de latence d'interruption, backlog et I/O ; audit sans valeurs secrètes.
6. **Échec :** refus de publier la génération incomplète, `ABORT`, reprise coordonnée, nettoyage borné ; un writer redémarré pendant le gel ne peut pas écrire sans s'enregistrer à nouveau. Tester kill -9, crash du coordinateur, disques pleins, DB corrompue et requests concurrentes.

## Vérifications obligatoires avant validation P2.2

- [ ] Inventaire **exhaustif** des mutations de toutes les ressources critiques y compris démarrage, migrations, JSONL et Annexes. Les ressources Wallet demeurent **hors champ de mutation**, simplement préservées dans leur état historique ; pas de test de seed/clé Wallet.
- [ ] Registre des writers effectifs sur banc isolé et coordination `PREPARE/QUIESCED/RELEASE/ABORT` implantée sur **tous** les chemins critiques.
- [ ] Tests multicomposants avec writer réticent, non coopératif, crash/restart d'un Engine, crash coordinateur, échec disque et timeouts ; aucun snapshot incomplet publié ni modification perdue.
- [ ] Sauvegarde **chiffrée et restaurable de bout en bout sur copies autorisées**, avec conservation de l'original `client_master.key`, validation AES-GCM et `clientId`, conflits WAL/DELETE et intégrité inter-ressources ; pas de base/clé GEN-1 sans consentement séparé.
- [ ] P95/p99 et charge CPU/RAM/I/O mesurés face à une baseline comparable des services, respect du budget de régression sans suppression de garde de sécurité ; aucune opération bloquante par tick.
- [ ] Démontrer séparation DEBUG/RELEASE, protection RBAC et sécurité d'accès à la politique/aux sauvegardes.
- [ ] Vérification CI GitHub de tests automatiques, revue du rollback et accord de clôture d'Overflow.

**Clôture P2.2 ≠ permission de déployer** : le verrou de l'ensemble Auth 2.1 s'applique toujours pendant les Phases 3–7. Après réussite, envisager un build DEBUG uniquement dans un environnement de test isolé, pas sur le VPS GEN-1 sans validation finale.
