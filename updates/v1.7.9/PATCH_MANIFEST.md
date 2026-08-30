# Patch v1.7.9 — Admin UI + UserData SQLite + Vault + Auth

Base : v1.7.8
Cible : v1.7.9

## Objectifs
- UserData/SQLite devient la source canonique du compte, des Settings et des credentials.
- Username demande a la premiere inscription, lie au compte/email et immuable.
- OpenAI, X, Binance, OKX et Kraken consomment leurs credentials via Data Service/Vault, jamais par acces SQLite direct.
- Migration automatique de l'ancien coffre RSA vers le Vault SQLite AES-256-GCM au premier login reussi.
- Suppression de l'ancien fichier de credentials uniquement apres persistance reussie dans SQLite.
- Integration du visuel Auth v1.7.9 dans le vrai formulaire fonctionnel.
- Refonte Admin et correctif Flux Tester conserves.

## UserData / SQLite
Stockage canonique hors build et hors Git :

`~/IA-TB-UserData-Server/User Data/<username>/user_data.db`

Le UserData Server ecoute `127.0.0.1:8020`. Le Core passe par `UserData/server_entry.js`, le cache memoire et le Data Service. Les anciennes projections Login/Settings restent uniquement pour compatibilite temporaire.

## Vault / Credentials
- `OPENAI/API_KEY` : OpenAI.
- `X/BEARER_TOKEN` : X.
- `BINANCE/API_KEY` + `BINANCE/API_SECRET` : Binance.
- `OKX/API_KEY` + `OKX/API_SECRET` + `OKX/PASSPHRASE` : OKX.
- `KRAKEN/API_KEY` + `KRAKEN/API_SECRET` : Kraken.
- GMX conserve ses endpoints publics / validation wallet et ne requiert pas de cle API dans ce flux.
- Chiffrement persistant : AES-256-GCM via `UserData/vault.js`.
- Cle maitre et token serveur : hors Git.
- Trading Engine : `services/trading-engine/secret-provider.js` -> `UserData/credential_service.js` -> Data Service/Vault.
- Kraken Add-On : credentials prives charges via le meme Data Service et conserves uniquement en RAM.
- Le Core actif remplace au chargement ses fonctions RSA historiques par `CredentialRuntime`.
- Le nom de l'ancien fichier n'est plus reference dans le Core actif compile ; sa presence sur disque sert uniquement de source de migration.

## Migration legacy
Au premier login avec l'ancien coffre present :
1. le mot de passe ouvre temporairement l'enveloppe RSA historique ;
2. chaque credential est dechiffre en RAM ;
3. les valeurs sont ecrites par Data Service dans le Vault SQLite ;
4. l'ancien fichier n'est supprime qu'apres succes de toutes les ecritures ;
5. en cas d'echec, le fichier legacy reste intact.

## Settings > API
Le runtime ajoute les champs OpenAI, X, Binance, OKX et Kraken. Une valeur vide conserve le credential existant. Les secrets ne sont jamais ecrits dans le build.

## Auth v1.7.9
- Asset runtime : `Frontend/Assets/IA-TB_Auth_v1.7.9.png`.
- Le visuel est integre autour du formulaire reel Login/Inscription ; aucun formulaire statique factice n'est utilise.
- Username affiche uniquement lors de la premiere inscription puis en lecture seule dans Settings.

## Self-test / installation
- `UserData/self_test.js` verifie mappings, transformation du Core, absence de dependance active au coffre legacy, SecretProvider exchanges et asset Auth.
- `install_runtime.command` execute ce self-test avant de demarrer UserData.
- `build_patch.command` construit l'archive officielle au format UpdateManager : `Crypto Chart Viewer IA Trader.zip` avec `update_manifest.json`, payload et SHA-256 par fichier.
- `test_install.command` installe le patch dans une copie temporaire de `builds/v1.7.8`, lance le self-test et verifie que les fichiers utilisateur proteges ne sont pas ecrases.

## Fichiers principaux
- `Core/Server/server_v1.0.js`
- `Core/Shared/paths.js`
- `Core/Updates/update_manager_v1.0.js`
- `UserData/credential_runtime.js`
- `UserData/credential_service.js`
- `UserData/core_credential_patch.js`
- `UserData/api_ui_runtime.js`
- `UserData/runtime_bootstrap.js`
- `UserData/runtime_hooks.js`
- `UserData/server_entry.js`
- `UserData/local_server.js`
- `UserData/memory_client.js`
- `UserData/vault.js`
- `UserData/self_test.js`
- `services/trading-engine/secret-provider.js`
- `AddOns/Kraken/kraken_service.js`
- `Frontend/Assets/IA-TB_Auth_v1.7.9.png`
- `launcher.js`
- `install_runtime.command`

## Validation restante
Le test structurel d'installation est fourni dans le patch. La validation materielle finale reste obligatoire sur macOS High Sierra / Intel avec Node 16.20.2 : installation de `better-sqlite3@8.7.0`, premier login/migration reelle, OpenAI/X, persistence Settings/Vault, Hyperliquid et redemarrage complet.
