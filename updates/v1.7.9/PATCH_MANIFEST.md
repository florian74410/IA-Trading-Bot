# Patch v1.7.9 — Admin UI + UserData SQLite + Flux Tester

Base : v1.7.8
Cible : v1.7.9

## Objectifs
- Refonte ergonomique de la page Admin.
- Corriger l'affichage du resultat `Tester` d'un Flux dans le header `Flux & collecte`.
- Faire de UserData/SQLite la source canonique du compte et des Settings tout en conservant des projections `.dat` de compatibilite.
- Ajouter un Username demande a l'inscription, lie au compte/email et non modifiable.
- Conserver les credentials dans le Vault SQLite chiffre et preparer leur consommation exclusive via Data Service/Vault.

## UserData / SQLite
Stockage canonique hors build et hors Git :

`~/IA-TB-UserData-Server/User Data/<username>/user_data.db`

Regles :
- le dossier `User Data/<username>` et la DB sont crees automatiquement ;
- une DB SQLite distincte est utilisee par Username ;
- schema UserData v2 avec compte, Settings, credentials, strategies et audit ;
- le UserData Server ecoute exclusivement `127.0.0.1:8020` et exige son token local ;
- le cache memoire limite les acces disque du serveur principal ;
- le launcher demarre le Core via `UserData/server_entry.js` ;
- `runtime_bootstrap.js` migre l'ancien compte et les Settings existants ;
- `runtime_hooks.js` fait lire Login et Settings depuis le cache charge depuis SQLite ;
- les anciens `user.dat`, `config_v1.0.dat`, `ai_settings_v2.dat` et `Parametres/*.dat` ne sont plus la source de verite : ils restent des projections de compatibilite pour les consommateurs historiques ;
- chaque ecriture de compte ou de Settings est repercutee dans SQLite avant la fin de la requete HTTP ;
- UpdateManager ne doit jamais remplacer une DB utilisateur.

## Compte / Login
- Username valide : `3–32` caracteres, lettres, chiffres, `.`, `_`, `-` ; `default` est reserve.
- Username demande uniquement a la premiere inscription.
- Username utilise comme identifiant permanent du dossier UserData et non modifiable apres creation.
- Login quotidien conserve : email + mot de passe.
- Email, hash du mot de passe, salt et role sont stockes dans le compte SQLite.
- `/api/setup`, `/api/login`, changement d'email et changement de mot de passe restent compatibles avec le Core historique mais leurs lectures/ecritures de `user.dat` sont interceptees par le runtime UserData, SQLite restant canonique.
- Endpoint local `/api/userdata/profile` pour afficher Username/email sans rendre le Username editable.
- Endpoint local `/api/userdata/pre-register` pour valider/reserver l'identite avant `/api/setup`.

## Settings
- API generique `scope/key/value` dans SQLite.
- Import automatique des Settings existants lors du premier bootstrap.
- Au redemarrage, les projections de compatibilite sont restaurees depuis SQLite.
- Les lectures runtime des fichiers Settings suivis retournent d'abord la valeur SQLite en memoire.
- Les ecritures General, langue, puissance IA, modulation/mosaique, profils et autres `.dat` de `Parametres/` sont repercutees vers SQLite par le runtime adapter.

## Vault / Credentials
- Les credentials de la table UserData restent chiffres AES-256-GCM.
- Dechiffrement uniquement a la demande et en memoire via le Data Service/Vault.
- Cle maitre et token serveur hors Git.
- Objectif d'architecture conserve : OpenAI, X et les Exchanges ne lisent jamais SQLite directement ; ils doivent demander leurs credentials au Data Service/Vault.
- Le remplacement complet de l'ancien `secrets_v2.dat` dans tous les consommateurs reste a terminer/tester avant la validation STABLE.

## Flux Tester
- Le test lance depuis `Flux & collecte` affiche son resultat dans le header de cette section.
- Les tests lances depuis `Providers` restent affiches dans le header Providers.
- Le Collector conserve la journalisation des tests et erreurs dans `Fundamental/fundamental.log`.

## Admin UI
- Nouvelle barre laterale gauche fixe.
- Navigation Application : Trading IA, Chart Viewer, Portfolio, Fondamental.
- Navigation Admin : Vue d'ensemble, Services, Maintenance, Logs & executions, Systeme, Mises a jour.
- Header Admin compact avec etat LOCAL et bouton Actualiser.
- Responsive conserve.

## Fichiers principaux du patch
- `launcher.js`
- `Frontend/Pages/admin_v1.0.html`
- `Frontend/CSS/admin_v1.0.css`
- `Frontend/Pages/fundamental_v1.0.html`
- `Frontend/JS/fundamental_flux_test_v1.7.9.js`
- `Frontend/JS/mosaic_controller_v2.9.js`
- `UserData/local_server.js`
- `UserData/memory_client.js`
- `UserData/user_data_service.js`
- `UserData/bootstrap.js`
- `UserData/runtime_bootstrap.js`
- `UserData/runtime_hooks.js`
- `UserData/server_entry.js`
- `UserData/vault.js`
- `UserData/server_auth.js`
- `UserData/package.json`
- `UserData/README.md`
- `install_runtime.command`
- `.gitignore`
- `Core/Updates/update_manager_v1.0.js`

## Compatibilite / validation restante
- Cible : macOS High Sierra / Intel, Node.js 16.20.2, Firefox ESR.
- `better-sqlite3` 8.7.0 pour UserData.
- Le code SQL/Login/Settings est integre sur `debug`, mais doit encore etre valide sur le Mac cible avant passage STABLE.
- Test obligatoire : migration v1.7.8 -> v1.7.9 sans perte du compte, des Settings ni des credentials.
