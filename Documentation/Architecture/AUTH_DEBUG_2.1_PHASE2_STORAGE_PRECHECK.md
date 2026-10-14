# IA-TB DEBUG 2.1 — Phase 2 / P2.1 — Préflight stockage et reprise Auth

> **État :** préparation du premier point de Phase 2 ; **implémentation sur fixtures et copie isolée à réaliser**, pas de sauvegarde ni modification du GEN-1.  
> **Décisions validées par Overflow :** garder l'arborescence et les données existantes ; ne pas refondre ce qui fonctionne, améliorer l'isolation interne, **Wallet complètement gelé** ; pas de transfert de DB/données DEBUG ↔ RELEASE dans Auth 2.1.  
> **Sources :** [audit P1.5](../Security/AUTH_DEBUG_2.1_STORAGE_AUDIT.md), [backup/restore P1.5](AUTH_DEBUG_2.1_BACKUP_RESTORE_CONTRACT.md), [versions P1.6](AUTH_DEBUG_2.1_VERSION_COMPATIBILITY.md), [intégrité RBAC](../Security/AUTH_DEBUG_2.1_RBAC_POLICY_INTEGRITY.md).

## 1. But de P2.1

Obtenir un outil de préflight et une preuve de restauration reproductible **sur un environnement de test** avant toute future migration Auth ou redémarrage du Core. Ce point concerne la **continuité des comptes et de leurs données**, pas le passage DEBUG↔RELEASE ni le modèle Wallet.

**Inventaire GEN-1 déjà reçu, suffisant pour la conception :**

- 13/13 conteneurs en `1001:1001`, cinq volumes `:rw`, rootfs readonly ; les permissions interservices devront évoluer graduellement.
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

## 5. Portes de validation P2.1

- [x] Rapport GEN-1 antérieur et structure du stockage analysés dans P1.5.
- [x] Conception des tests de reprise sur copie et contraintes Wallet / séparation des environnements documentées.
- [ ] Script de préflight **sans effet de bord** implémenté et vérifié avec fichiers fictifs.
- [ ] Tests backup SQLite WAL/DELETE et restauration transactionnelle exécutés sur fixtures.
- [ ] Tests négatifs (clé manquante, rollback, DB incohérente) et performances documentés.
- [ ] Accès à un snapshot réel, si nécessaire ultérieurement, demandé à Overflow séparément ; **aucun accès direct ni changement GEN-1 dans ce point sans accord**.
- [ ] Résultats et validation utilisateur pour cocher **P2.1**.

**P2.1 est ouvert, non validé.** La prochaine activité de développement sûre est un préflight et ses tests sur DB factices dans la branche DEBUG 2.1 ; aucune donnée Wallet n'est utilisée.
