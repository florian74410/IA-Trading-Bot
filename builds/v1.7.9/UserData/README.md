# IA-TB UserData Phase 1

Objectif: separer les donnees utilisateur persistantes du code applicatif et permettre de remplacer/supprimer un build sans perdre le profil, les reglages, le coffre ou les strategies.

## Donnee canonique
- `user_data.db` est la base SQLite locale de travail placee a la racine de l'application.
- Elle contient utilisateurs, settings, credentials chiffres, strategies, documents persistants et audit log.
- Le bridge de compatibilite importe/restaure aussi `user.dat`, `secrets_v2.dat`, `config_v1.0.dat`, `ai_settings_v2.dat`, `Parametres/*.dat` et `Annexes/Strategies/*` afin que le code historique continue de fonctionner pendant la migration.
- `user_data.db` est ignoree par Git et explicitement interdite par UpdateManager.

## Vault
- Les nouveaux credentials peuvent etre chiffres en AES-256-GCM dans SQLite.
- La cle maitre n'est jamais stockee dans la DB ni dans le depot.
- Par defaut: `~/.ia-trading-bot/master.key` avec permissions 0600.
- Le token du serveur UserData est egalement externe: `~/.ia-trading-bot/userdata_server.token`.

## Serveur UserData local
Au demarrage, le bootstrap verifie puis demarre si necessaire un serveur uniquement sur `127.0.0.1:8020`.

Stockage par defaut:

`~/IA-TB-UserData-Server/User Data/<username>/user_data.db`

Le serveur exige le token local pour GET/HEAD/PUT et garde jusqu'a 10 sauvegardes precedentes par utilisateur dans `Backups/`.

Le repertoire serveur peut etre place dans un dossier synchronise Dropbox/iCloud avec `IATB_USERDATA_SERVER_ROOT`. Pour un futur serveur distant, on remplacera le transport local HTTP par HTTPS/SFTP sans changer le schema SQLite.

## Bootstrap
1. demarre/verifie le serveur UserData local;
2. determine le username (`IATB_USERNAME`, `local_username.dat`, ancien profil, sinon `default`);
3. si `./user_data.db` n'existe pas, la telecharge depuis `User Data/<username>/user_data.db`;
4. si elle n'existe nulle part, cree SQLite schema v1;
5. restaure ou importe les fichiers historiques dans la DB;
6. synchronise la DB vers le serveur;
7. demarre le sync agent qui surveille les modifications historiques et resynchronise la DB.

## Multi-user
Chaque utilisateur possede son propre dossier:

`User Data/<username>/user_data.db`

`UserData/set_username.js` fournit deja l'operation de changement de username pour la future liaison avec la page Parametres. Tant que le champ username n'est pas encore cable dans l'ecran d'inscription, le bootstrap peut deriver automatiquement le nom depuis le compte existant.
