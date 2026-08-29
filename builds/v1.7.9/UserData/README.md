# IA-TB UserData Phase 1

Objectif: separer totalement les donnees utilisateur persistantes du code applicatif. Un build peut etre remplace ou supprime sans perdre le profil, les reglages, les cles API ou les strategies.

## Stockage canonique
La base SQLite n'est jamais copiee dans le SourceCode local du build.

Chemin par defaut sur Macro:

`~/IA-TB-UserData-Server/<username>/user_data.db`

Si `~/IA-TB-UserData-Server/` ou le dossier `<username>/` n'existe pas, le UserData Server le cree automatiquement. Si `user_data.db` n'existe pas, SQLite la cree automatiquement avec le schema courant.

Le repertoire peut etre change avec `IATB_USERDATA_SERVER_ROOT`, mais le layout reste `<root>/<username>/user_data.db`.

## Fonctionnement au lancement
1. `start.command` prepare le runtime puis verifie le UserData Server local sur `127.0.0.1:8020`.
2. Si le serveur n'est pas actif, il est demarre automatiquement.
3. Le serveur ouvre ou cree `~/IA-TB-UserData-Server/<username>/user_data.db`.
4. Le client UserData demande un snapshot des profils, Settings, strategies et de l'etat des credentials.
5. Ces donnees sont chargees dans un cache memoire du client; aucun fichier `.db` n'est depose dans le dossier du build.
6. Les credentials restent chiffres dans SQLite et sont dechiffres uniquement a la demande par le Vault local.
7. Les ecritures Settings/Strategies/Credentials passent par l'API locale authentifiee et sont directement persistees dans la DB canonique.

## Vault
- Les credentials sont chiffres AES-256-GCM avant stockage dans SQLite.
- La cle maitre n'est jamais stockee dans la DB ni dans Git.
- Par defaut: `~/.ia-trading-bot/master.key` avec permissions 0600.
- Le token d'authentification du UserData Server est externe: `~/.ia-trading-bot/userdata_server.token`.

## Multi-user
Chaque utilisateur possede sa propre DB:

`~/IA-TB-UserData-Server/alice/user_data.db`
`~/IA-TB-UserData-Server/bob/user_data.db`

Le username peut etre fourni par `IATB_USERNAME`. Le branchement complet du champ Username a l'inscription et dans Parametres reste a faire dans l'interface.

## Git / Updates
- `user_data.db` et ses variantes sont ignores par Git.
- UpdateManager interdit explicitement tout payload contenant `user_data.db`, `*.db`, `UserData/local_username.dat` ou `IA-TB-UserData-Server/**`.
- Les builds et patchs ne contiennent donc que le code UserData, jamais les donnees utilisateur reelles.

## Futur serveur distant
Le protocole client/serveur est separe du stockage SQLite. Le serveur local HTTP sur `127.0.0.1` pourra etre remplace plus tard par un service HTTPS/SFTP distant sans deplacer la logique du Vault ni changer le schema de la DB.
