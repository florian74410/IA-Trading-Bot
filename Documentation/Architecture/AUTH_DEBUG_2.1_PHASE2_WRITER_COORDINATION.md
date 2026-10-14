# IA-TB DEBUG 2.1 — P2.2 — Coordination des écrivains et reprise cohérente interservices

> **État : OUVERT**, non implémenté dans les 13 services. Hérite explicitement des obligations sorties du périmètre de [P2.1 (prototype sur fixtures clôturé)](AUTH_DEBUG_2.1_P21_FIXTURE_VALIDATION_REPORT.md).  
> **Références :** [P1.5 Backup/Restore](AUTH_DEBUG_2.1_BACKUP_RESTORE_CONTRACT.md), [protocole de gel](AUTH_DEBUG_2.1_COHERENT_SNAPSHOT_BARRIER.md), [inventaire préliminaire](AUTH_DEBUG_2.1_SQLITE_WRITER_INVENTORY.md), [audit GEN-1](../Security/AUTH_DEBUG_2.1_STORAGE_AUDIT.md).  
> **Interdiction :** **aucun nouveau Docker DEBUG sur GEN-1 avant Auth 2.1 intégralement testé et approuvé** ; ne pas manipuler Wallet, clé Wallet ou compte réel.

## Objectif

Transformer la barrière de démonstration P2.1 en une **coordination applicable à tous les écrivains de données critiques**, avec rollback et résilience aux crashs, mesurée en performance, sans réduire l'isolation de sécurité. Un simple lock `flock` ne suffit **pas** : les writers du runtime n'y participent pas actuellement, et des fichiers JSONL/Annexes sont modifiés hors SQLite.

Le prototype P2.1 reste test-only. **P2.2 devra concevoir puis tester le mécanisme runtime sur un banc isolé** avant tout déploiement ou opération sur un jeu réel.

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
