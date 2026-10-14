# IA-TB DEBUG 2.1 — P2.1 — Inventaire préliminaire des écrivains SQLite

> **Revue statique ciblée du 14/10/2026** sur `fix/v2.0.1-debug`, sans lancement des modules ou connexion à GEN-1.  
> **Statut : PRÉLIMINAIRE** ; ce tableau ne prétend **pas** identifier tous les chemins dynamiques, toutes les tâches planifiées ni les dépendances d'exécution. L'inventaire complet des écrivains reste bloquant pour la barrière de production.  
> **Liens :** [P2.1 — protocole de gel](AUTH_DEBUG_2.1_COHERENT_SNAPSHOT_BARRIER.md), [rapport stockage P1.5](../Security/AUTH_DEBUG_2.1_STORAGE_AUDIT.md), [contrat backup/restore](AUTH_DEBUG_2.1_BACKUP_RESTORE_CONTRACT.md).  
> **Verrou :** aucun nouveau Docker DEBUG sur GEN-1 avant intégration et validation complète du système Auth 2.1 par Overflow. Wallet et secrets Wallet hors périmètre.

## 1. Modules du code connus pour écrire des SQLite

| Base ou famille | Point(s) d'écriture **constatés dans le code** | Niveau de cohérence proposé, à confirmer | Risque pour un snapshot |
| --- | --- | --- | --- |
| `Database/clients.sqlite` | `App/Core/Clients/client_repository.js` : `init`/migrations, `insert`, `updateIdentity`, `upsertAuth`, `audit`, autres liens historiques | **CRITIQUE** pour Auth, version + clé maître client d'origine, `clientId` immuable | Démarrage peut créer tables ou appliquer migrations ; captures partielles d'identité ou de rôle interdites. **Ne pas appeler** ses méthodes relatives au Wallet pendant Auth 2.1 |
| `User Data/default/user_data.db` | `App/Core/Settings/sqlite_settings_store.js` : `init`, `setRaw`, `markMigration`, gestion des scopes | **CRITIQUE** pour réglages globaux, références d'identité et paramètres persistants | Les lectures peuvent initialiser la DB/les tables ; l'état `active_client_id` historique n'est pas un vrai propriétaire multiutilisateur |
| `User Data/default/portfolio.db` | `App/Portfolio/Engine/portfolio_store.js` : `init`, `recordEvent`, `upsertBalance`, `addSnapshot`, `compactSnapshots`, `upsertClosedTrade`, `setSetting` | **CRITIQUE si historique/ledger doit être restauré avec le compte** ; préciser l'interdépendance réelle | Les opérations de compaction/rétention écrivent elles aussi ; ne pas confondre lectures avec restauration cohérente |
| `Shared Data/Fundamental/fundamental.db` | `App/Fundamental/Engine/database_core.js` : schémas/migrations, mise à jour initiale des feeds/providers, inserts, updates et status | **SELON FINALITÉ** : paramètres personnalisés/feeds et audit importants, données recouvrables à classifier séparément | L'ouverture du store comporte des écritures, et la collecte/les règles de provider peuvent déclencher des writes en arrière-plan |
| `Shared Data/MarketData/market_registry.db` | `App/MarketData/Registry/market_registry.js` : `init`, `upsertAssets`, `upsertDetail` | **RECONSTRUCTIBLE** sous réserve de validation (provider/metadata) | Registry globale mise à jour par lots `BEGIN/COMMIT` ; bloquer au bon niveau de transaction |
| MarketData — base télémétrie | `App/MarketData/Storage/api_telemetry_store.js` : `init`, `save`, `saveStream`, purge/rétention | **RECONSTRUCTIBLE / AUDIT ? À DÉCIDER**, fort débit potentiel | Les rétentions `DELETE` sont des writers ; geler par requête/tick provoquerait une régression inutile |
| MarketData — base microstructure | `App/MarketData/Storage/microstructure_store.js` : `init`, `saveSnapshot`, `saveLiquidation`, `saveOpenInterest`, `saveDexLiquidity`, prune | **RECONSTRUCTIBLE / HISTORIQUE ? À DÉCIDER**, fort débit | Événements liquidations/open interest peuvent arriver pendant la copie ; préférer fenêtre courte/snapshot indépendant lorsque les exigences métier l'autorisent |

**Attention :** aucune de ces classes n'autorise actuellement une suppression de données. « Reconstructible » reste une hypothèse de politique backup à confirmer, pas une permission de tronquer, d'ignorer ou de régénérer une base. L'inventaire GEN-1 a observé **huit DB** ; cette revue statique liste des **familles de writers connues**, pas une correspondance garantie 1:1 à ces huit chemins.

## 2. Conséquences pour la barrière de production

- **Registre exhaustif des écrivains actifs**, et non des seules classes de code : tout processus susceptible de faire `INSERT`, `UPDATE`, `DELETE`, DDL, rétention ou migration doit être surveillé à l'ouverture et après restart. Inclure scripts CLI, jobs schedulers, maintenance et hooks d'initialisation.
- **Distinguer les DB critiques liées par invariants métier** (`clients` + `settings` + `portfolio`, si confirmé) des flux réapprovisionnables. Un snapshot critique ne doit jamais s'appeler « cohérent global » tant que les huit bases, clients, clés et états n'ont pas été capturés sous une barrière couvrant tous les écrivains concernés.
- **Maintenance initiée rarement** : un coordinateur Core/Supervisor, en charge du registre et du cycle `PREPARE/QUIESCED/RELEASE`, doit attendre l'ACK de tous les writers avant d'ouvrir la fenêtre. Chaque writer réalise `finish current transaction -> ACK -> hold writes`, le coordinateur valide un `epoch` et fait les SQLite Online Backups.
- **Lecture marché performante** : buffers/caches peuvent continuer tant que leur lecture ne produit pas d'écritures ni d'appels fournisseur et que la file de backlog est bornée. Les nouveaux travaux d'écriture doivent être refusés proprement ou différés de façon idempotente. **Les ticks ne doivent pas payer une signature, une vérification de clé, ni une prise de verrou disque à chaque événement.**
- **Démarrages durant la maintenance** : les initialisations des `Store`/`Repository` doivent elles aussi respecter la barrière ; sinon un redémarrage d'Engine pourrait modifier les tables au milieu d'une sauvegarde. Un writer non enregistré ou silencieux = **abandon du snapshot, fail closed**.
- **Isolation de la clé client et des volumes** : la barrière de cohérence n'est **pas** une protection RBAC ou une restriction Docker ; les 13 conteneurs partagent encore le même UID et cinq volumes RW. Les travaux d'isolation doivent être réalisés/validés séparément avant déploiement.
- **Wallet gelé** : ne pas toucher aux données associées, ni appeler de code Wallet, ni générer la clé Wallet absente. Les références existantes pourront être conservées sans être modifiées par un mécanisme de backup futur explicitement autorisé.

## 3. Étapes de vérification encore nécessaires

- [x] Familles principales d'écrivains identifiées dans les sources canonique (Core Clients, Settings, Portfolio, Fundamental, MarketData).
- [x] Mutations à l'initialisation, rétention et migrations recensées dans les modules inspectés.
- [ ] Lister toutes les autres DB, scripts et tâches cachées/dynamiques ; retrouver les appels à chaque Store et le service/identité OS effectivement exécutant.
- [ ] Définir la frontière précise des invariants transactionnels `clientId` / crédits / portfolio / réglages, avec owner mapping.
- [ ] Décider quelles bases **très actives** peuvent avoir une sauvegarde indépendante sans briser les exigences d'intégrité ou d'audit.
- [ ] Intégrer un protocole contrôlé sur **tous** les chemins d'écriture réels (y compris startup, retention, recovery), avec tests de restart, crash et temporisation sur banc isolé.
- [ ] Mesurer p50/p95/p99 sur moteurs benchmark de DEBUG 2.1, puis autoriser un déploiement complet uniquement après accord d'Overflow.

**Cette revue ne coche pas P2.1 et n'autorise aucun accès aux fichiers existants de GEN-1.**
