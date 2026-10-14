# IA-TB DEBUG 2.1 — Phase 2 / P2.1 — Préflight stockage et reprise Auth

> **État :** P2.1 **en cours de développement** sur fixtures et copies isolées. Préflight Python sans imports des modules runtime et suite de 20 tests SQLite fictifs en cours de validation CI (14 tests précédemment confirmés, 6 tests de gel coopératif supplémentaires) ; **ne pas cocher P2.1 avant les résultats GitHub et la revue d'Overflow**. Aucun accès, sauvegarde ni modification du GEN-1.  
> **Décisions validées par Overflow :** garder l'arborescence et les données existantes ; ne pas refondre ce qui fonctionne, améliorer l'isolation interne, **Wallet complètement gelé** ; pas de transfert de DB/données DEBUG ↔ RELEASE dans Auth 2.1.  
> **Sources :** [audit P1.5](../Security/AUTH_DEBUG_2.1_STORAGE_AUDIT.md), [backup/restore P1.5](AUTH_DEBUG_2.1_BACKUP_RESTORE_CONTRACT.md), [versions P1.6](AUTH_DEBUG_2.1_VERSION_COMPATIBILITY.md), [intégrité RBAC](../Security/AUTH_DEBUG_2.1_RBAC_POLICY_INTEGRITY.md).

## 1. But de P2.1

Obtenir un outil de préflight et une preuve de restauration reproductible **sur un environnement de test** avant toute future migration Auth ou redémarrage du Core. Ce point concerne la **continuité des comptes et de leurs données**, pas le passage DEBUG↔RELEASE ni le modèle Wallet.

**Inventaire GEN-1 déjà reçu, suffisant pour la conception :**

- 14/14 conteneurs en `1001:1001`, cinq volumes `:rw`, rootfs readonly ; les permissions interservices devront évoluer graduellement.
- `clients.sqlite` (mode DELETE dans la source) en `0600` ; identité client chiffrée liée à `client_master.key`, présent `0600`.
- Plusieurs autres SQLite en WAL (Settings/Portfolio/MarketData/Fundamental) ; `user_data.db` et `portfolio.db` en `0644` sous des répertoires `0700`.
- `wallet_master.key` absente : **ne jamais la générer, l'ouvrir, la restaurer ou tenter de déchiffrer une donnée Wallet** durant Auth 2.1.
- État observé : `clients=1`, `client_accounts=0` et `client_audit=1`. Ne pas supprimer l'identité historique ni créer d'ADMIN automatiquement.

## 2. Périmètre exact des essais

| Composant | Test sur copie/fixture fictive | GEN-1 réel |
| --- | --- | --- |
| `clients.sqlite` & `client_master.key` | Conservation des `clientId`, de la clé originale, intégrité SQLite et restauration à clé identique | Métadonnées déjà auditées ; aucune ouverture/écriture sans accord |
| `User Data/default/user_data.db`, `portfolio.db` | Backup SQLite WAL en ligne et contrôle des snapshots | Aucun checkpoint, chmod ni lecture du contenu privé |
| Autres DB SQLite métiers | Sauvegarde via SQLite Online Backup de fixtures représentatives et cohérence inter-DB explicite | Aucun parcours de bases privées ni copie en bloc |
| Clés CP1 internes | Vérification de l'existence/mode et maintien des permissions sur données de test | Secrets et contenu jamais lus ni exposés |
| Wallets, `wallet_master.key`, `client_wallets` | **Aucun test de manipulation Wallet** ; fixtures SQLite peuvent contenir un lien factice, sans appel WalletService ni clé réelle | **Gel absolu** |
| Stockage RELEASE | Fixture distincte facultative pour vérifier que les chemins ne se mélangent pas | **Aucun transfert DEBUG ↔ RELEASE** |

La restauration est un test de continuité **du même environnement**, jamais un outil de portabilité entre environnements.

## 3. Séquence technique de validation sur fixtures

1. Créer un dossier temporaire isolé (mode `0700`) avec DB clients factice, clé **factice** créée explicitement par le test, un `clientId` factice, schéma legacy `001/002` et comptes de test, et une DB en WAL avec écriture transactionnelle récente.
2. Vérifier par lecture de métadonnées que les dossiers et fichiers attendus sont présents, avec une liste blanche de chemins et interdiction de suivre un lien symbolique hors racine. **Ne pas importer `Core/Shared/paths.js` ou `ClientCrypto` pendant un préflight réel tant qu'ils peuvent générer des clés par effet de bord.**
3. Réaliser des SQLite Online Backups de chaque DB de test (`sqlite3.Connection.backup` ou `better-sqlite3.backup()`) pour inclure les données WAL sans effectuer un simple `cp` de fichier actif.
4. Capturer un **ensemble cohérent** de bases liées au même `clientId` via un gel d'écritures factice contrôlé. Un backup individuel ne garantit pas la cohérence **entre** huit bases : le banc de test doit démontrer la procédure retenue.
5. Construire un manifeste de snapshot **ne comportant pas de données personnelles ou de secret**, versions, tailles et checksum d'archives **chiffrées** ; vérifier `PRAGMA quick_check` et les contraintes sur copie.
6. Restaurer sur un autre dossier temporaire isolé sans publier de port et sans démarrer Trading LIVE ; vérifier le même `clientId`, le bon état de comptes factices, le déchiffrement possible uniquement avec la **clé factice d'origine**, pas avec une clé régénérée.
7. Injecter erreurs de test : clé client absente, clé erronée, WAL transactionné, interruption backup, copie partielle, espace insuffisant simulé, schéma inconnu, autorisation RBAC absente. **Attendu : fail closed, aucune identité remplacée, aucun ADMIN nouveau, aucune perte silencieuse.**
8. Détruire seulement le dossier de fixtures explicitement créé **par le test**. Ne jamais nettoyer un chemin GEN-1 ou un dossier utilisateur arbitraire.

## 4. Isolation future et performances

- Préparer une matrice `service -> DB/volume/secret -> RO/RW/absent`, remplacer les droits partagés uniquement quand un build séparé aura validé les dépendances réelles de tous les Engines.
- Core Auth seul conserve le minimum de permissions sur identités et clé client ; Gateway et Engines doivent être privés des secrets inutiles et des montages globaux.
- Garder le système historique opérationnel jusqu'à validation des tests de mise à niveau et du rollback ; pas de refonte du modèle Wallet.
- Sauvegarde hors boucle trading/collecte ; mesurer charge CPU/RAM, pause éventuelle de cohérence et delta p95/p99. Ne pas diminuer la sécurité pour satisfaire un benchmark.

## 5. Implémentation initiale et résultats locaux

- [Outil de préflight P2.1](../../Tools/CI/auth_storage_preflight.py) : le mode CLI ne réalise **que des `lstat` sur des chemins prédéfinis**. Aucun import de `paths.js`, de `ClientCrypto`, de `WalletService`, aucune lecture de clé et aucune ouverture SQLite en mode inventaire. Le rapport sort uniquement les types de fichiers, modes, UID/GID et blocages.
- [Tests P2.1](../../Tools/CI/test_auth_storage_preflight.py) : 14 cas initiaux et 6 nouveaux tests de barrière, soit 20 cas sur un répertoire privé temporaire avec DB clients fictive créée depuis les migrations SQL historiques réelles `001`/`002`, Settings et Portfolio fictifs en WAL. Deux connexions WAL restent ouvertes pendant la sauvegarde et les fichiers `-wal` sont capturés par l'API SQLite Online Backup.
- Les sauvegardes et restaurations de tests sont **exclusivement internes à `/tmp` avec un marqueur de fixture** ; aucune sous-commande de backup/restore sur GEN-1 n'est fournie. Les copies sont normalisées en mode `DELETE` **sur la copie seulement**, avec `quick_check` et `foreign_key_check` ; le fichier source WAL n'est pas checkpointé par cet outil.
- La présence d'une clé **factice** correspondante est vérifiée par un canary HMAC synthétique ; **un 14ᵉ test supplémentaire invoque le vrai module `App/Core/Clients/client_crypto.js` exclusivement sur la fixture pour chiffrer et déchiffrer une identité fictive AES-256-GCM après restauration.** Une clé différente ne peut pas la déchiffrer. La capacité à reprendre une DB réelle n'est **pas prouvée** : le test ne doit jamais charger la clé client GEN-1. La procédure de gel multi-bases interservices reste à développer.
- **Essai local isolé (14/10/2026)** : `python3 -W error::ResourceWarning -m unittest discover -s Tools/CI -p 'test_auth_storage_preflight.py' -v` → **14/14 tests initiaux réussis**, puis [GitHub Actions](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38498590581) **SUCCESS** sur Python 3.11/Node 22. Six nouveaux tests de concurrence (20 au total) attendent une seconde exécution GitHub. Aucun Wallet ni GEN-1.
- **Ce que cela ne démontre PAS :** sauvegarde chiffrée exploitable de GEN-1, reprise de huit bases à une génération interservice atomique, capacité d'accéder aux **vraies données et à la vraie clé client GEN-1**, latence p95/p99 de trading, intégrité de l'ensemble des volumes, ni isolation Docker.
- **Verrou utilisateur :** aucun nouveau Docker DEBUG déployé sur GEN-1 tant que l'architecture Auth 2.1 n'est pas totalement implémentée/testée et que l'autorisation explicite d'Overflow n'a pas été obtenue.

## 5 bis. P2.1 — Barrière coopérative interbases (prototype non déployé)

Le [contrat technique de cohérence interbases](AUTH_DEBUG_2.1_COHERENT_SNAPSHOT_BARRIER.md) complète le préflight et les backups sur fixtures. Le nouvel outil utilise `fcntl.flock` sous le seul dossier temporaire de test :

- `fixture_writer_guard()` : verrou partagé pendant **toutes** les transactions de la génération fictive, même si plusieurs SQLite changent l'une après l'autre.
- `coherent_fixture_snapshot()` : verrou exclusif autour des validations de génération et des SQLite Online Backups ; un writer coopératif doit terminer avant la copie, et un writer nouveau attend la fin.
- `fixture_snapshot_barrier()` : méthode de test d'exclusivité ; expiration bornée, liens symboliques et modes de fichiers non sûrs refusés.
- Six tests supplémentaires de concurrence : interdiction d'un état inter-DB partiellement modifié, protection des writes concurrents, timeout sans snapshot, symlink/modes refusés, racine GEN-1 interdite, partage du verrou entre **processus OS distincts**.
- Les fichiers de verrou de fixture restent `0600`, privés, et ne contiennent aucun secret.
- **Très important : `flock` est advisory et ne protège que des writers qui le prennent volontairement.** Ces tests ne coordonnent pas nos 13 conteneurs réels. Un protocole `PREPARE/QUIESCED/RELEASE` orchestré avec ACK de tous les vrais Engines et Core reste indispensable, avec rollback et timeout lors d'un writer non coopératif. Aucun chemin de tick Trading ne doit faire de hash coûteux.

**CI des 20 tests : en attente de résultat sur la nouvelle version.** Aucun nouvel accès GEN-1, pas de pause moteur réelle, aucune modification Wallet.

## 6. Portes de validation P2.1

- [x] Rapport GEN-1 antérieur et structure du stockage analysés dans P1.5.
- [x] Conception des tests de reprise sur copie et contraintes Wallet / séparation des environnements documentées.
- [x] Script de préflight **sans effet de bord** implémenté et vérifié avec fichiers fictifs (13 essais locaux, Python 3.13.5).
- [x] Tests backup SQLite WAL/DELETE et restauration de fixtures exécutés localement, sans publication ni copie de DB réelle. **La cohérence multi-bases en production nécessite encore un gel d'écritures à concevoir.**
- [x] Tests négatifs locaux (clé factice manquante/incorrecte, rollback de staging, DB corrompue, FK, symlink et génération incohérente) exécutés ; smoke test local sans benchmark p95/p99.
- [x] **GitHub Actions P2.1 SUCCESS : 14/14 tests** ([run 38498590581](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38498590581), Python 3.11 + Node 22) et **RBAC SUCCESS** ([run 38498589990](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38498589990)). Ce n'est pas une mesure de performance sur GEN-1.
- [x] Interopérabilité **AES-256-GCM sur identité et clé fictives** vérifiée avec le vrai module `ClientCrypto`, y compris refus de clé incorrecte ; aucune exécution sur une DB GEN-1.
- [x] **Prototype de gel inter-DB coopératif uniquement sur fixtures** : verrou partagé/exclusif, simulation de writer simultané et subprocessus, gestion timeout et paths dangereux ; [contrat](AUTH_DEBUG_2.1_COHERENT_SNAPSHOT_BARRIER.md). **Validation CI des 6 nouveaux tests encore attendue.**
- [ ] **Intégrer un gel réel entre les services** : inventaire exhaustif des writers, protocole d'ACK, tests multicomposants, crash/restart et mesure p95/p99. La fixture n'apporte pas cette garantie.
- [ ] Accès à un snapshot réel, si nécessaire ultérieurement, demandé à Overflow séparément ; **aucun accès direct ni changement GEN-1 dans ce point sans accord**.
- [ ] Résultats et validation utilisateur pour cocher **P2.1**.

**P2.1 est ouvert, non validé.** La prochaine activité de développement sûre est un préflight et ses tests sur DB factices dans la branche DEBUG 2.1 ; aucune donnée Wallet n'est utilisée.
