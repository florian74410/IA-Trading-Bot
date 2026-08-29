# IA-TB UserData Phase 1

Objectif: separer totalement les donnees utilisateur du code applicatif.

## Donnee canonique
- `user_data.db` est une base SQLite unique placee a la racine de l'application lors de l'execution.
- Elle contient profils, settings, credentials chiffres, strategies et journal d'acces.
- Elle n'est jamais versionnee par Git et ne doit jamais etre incluse dans un build ou un patch.

## Vault
- Les credentials sont chiffres en AES-256-GCM avant stockage dans SQLite.
- La cle maitre n'est jamais stockee dans la DB ni dans le depot.
- Par defaut: `~/.ia-trading-bot/master.key` (permissions 0600).

## Stockage multi-user Phase 1
Le RemoteStore local simule le futur stockage distant sans exposer de FTP en clair:

`IA-TB-UserData-Server/User Data/<username>/user_data.db`

Le chemin peut etre change avec `IATB_USERDATA_REMOTE_ROOT`.
Le nom utilisateur peut etre fourni par `IATB_USERNAME`; `default` est utilise tant que l'inscription n'a pas encore fixe le username.

Au bootstrap:
1. si `./user_data.db` existe, elle est ouverte sans etre remplacee;
2. sinon le RemoteStore tente de recuperer `User Data/<username>/user_data.db`;
3. si aucune DB n'existe, une DB SQLite schema v1 est creee;
4. une copie distante est creee si necessaire.

Le transport distant est volontairement abstrait. Une future implementation SFTP/FTPS/HTTPS pourra remplacer le RemoteStore sans modifier le schema SQLite ni le Vault.
