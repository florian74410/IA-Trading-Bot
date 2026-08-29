# Roadmap

La roadmap décrit l'état réel du projet. Une fonctionnalité n'est marquée **STABLE** qu'après test sur le runtime cible.

### Légende

- [ ] À faire
- ◐ En cours / codé mais pas encore validé
- [x] Terminé dans le code
- ⚠️ À vérifier sur le runtime cible
- ★ Validé STABLE

# Version v1.7.9

**État global : ◐ DÉVELOPPEMENT / DEBUG**

Objectif : terminer la consolidation UserData/SQLite, l'authentification et le Vault avant la validation finale de la branche v1.7.x.

## Interface & Administration

- [x] Refonte de la page Admin Backend Manager.
- [x] Conservation des services et contrôles existants dans la nouvelle interface Admin.
- [x] Correction du test `Flux & collecte` : résultat affiché dans le header Flux et non dans Providers.
- [x] Journalisation des tests de Flux conservée dans le Fundamental Engine.
- [x] Asset officiel du nouvel écran d'authentification enregistré dans `Docs/Assets/IA-TB_Auth_v1.7.9.png`.
- [x] Nouvel écran graphique Auth intégré autour du vrai formulaire Login/Inscription, sans remplacer les contrôles fonctionnels.
- ⚠️ Tester Admin + Fundamental + nouvel écran d'authentification sur Firefox / macOS High Sierra.

## UserData / SQLite

- [x] UserData Server local sur `127.0.0.1:8020`.
- [x] Une base SQLite par utilisateur sous `User Data/<username>/user_data.db`.
- [x] Création automatique de la DB et du dossier utilisateur.
- [x] DB exclue du dépôt Git et protégée contre UpdateManager.
- [x] Cache mémoire / client UserData pour limiter les accès disque.
- [x] Tables et API UserData pour compte, Settings, credentials et stratégies.
- [x] Vault AES-256-GCM pour les credentials stockés dans SQLite.
- [x] Clé maître et token serveur conservés hors dépôt.
- [x] Mécanisme de migration/projection depuis les anciens fichiers `.dat`.
- [x] Core lancé via `UserData/server_entry.js` après bootstrap SQLite.
- [x] Runtime adapter : SQLite/cache mémoire est la source canonique des lectures Login et Settings.
- [x] Écritures Login/Settings répercutées vers SQLite avant la fin de la requête HTTP.
- [x] Les anciens fichiers Login/Settings sont conservés uniquement comme projections de compatibilité pour les consommateurs historiques.
- ◐ Supprimer progressivement les projections lorsque tous les consommateurs historiques auront été migrés ; ce nettoyage n'est pas bloquant pour la source canonique SQLite.
- ⚠️ Vérifier l'installation de `better-sqlite3@8.7.0` avec Node 16.20.2 sur macOS High Sierra.
- ⚠️ Tester récupération de la DB après suppression d'une projection locale / changement de build.
- ⚠️ Tester sauvegarde et restauration des Settings, compte et credentials après mise à jour.

## Compte / Authentification

Règle v1.7.9 : le **Username est créé à l'inscription et devient immuable**. Il identifie le dossier UserData du compte et reste lié au compte de connexion et à son email.

- [x] Validation backend d'un Username sûr (`3–32`, lettres/chiffres/`.`/`_`/`-`).
- [x] Support du compte dans le client et le serveur UserData.
- [x] Migration d'un ancien compte vers une identité UserData.
- [x] Champ **Username** dans le formulaire de première inscription.
- [x] Pré-enregistrement `/api/userdata/pre-register` avant `/api/setup` avec contrôle d'unicité/validité.
- [x] Username + Email + hash/salt du mot de passe enregistrés dans le compte SQLite lors de l'inscription.
- [x] Username non modifiable après création et affiché en lecture seule dans Settings.
- [x] `/api/setup`, `/api/login`, changement d'email et changement de mot de passe raccordés au compte SQLite par l'adaptateur runtime.
- ⚠️ Tester création de compte neuf, reconnexion, changement d'email et changement de mot de passe sur le Mac cible.

## Settings

- [x] API générique `scope/key/value` disponible dans SQLite.
- [x] Import initial des fichiers de paramètres existants vers UserData.
- [x] Bootstrap et restauration des projections depuis SQLite au démarrage.
- [x] Lectures runtime des Settings suivis servies depuis le cache SQLite.
- [x] Écritures `config_v1.0.dat`, `ai_settings_v2.dat` et `Parametres/*.dat` répercutées vers SQLite.
- [x] Général, langue, puissance IA, modulation/mosaïque et profils actifs couverts par la couche canonique SQLite.
- [x] Settings > API étendu aux credentials OpenAI, X, Binance, OKX et Kraken.
- [ ] Migrer les paramètres Indicator Engine vers le Data Service uniquement si leur périmètre doit devenir utilisateur/persistant.
- ⚠️ Confirmer sur installation réelle qu'une mise à jour v1.7.8 → v1.7.9 ne remplace jamais les Settings utilisateur.

## Secrets / API / Vault

Architecture : `Settings > API -> Data Service -> Vault SQLite -> consommateur`. Aucun connecteur ne doit accéder directement à SQLite.

- [x] Infrastructure Vault SQLite disponible.
- [x] Credentials chiffrés dans la DB UserData via AES-256-GCM.
- [x] API Data Service pour lire/écrire un credential sans accès SQLite direct du consommateur.
- [x] OpenAI raccordé au Data Service/Vault par `CredentialRuntime`.
- [x] X / Twitter raccordé au Data Service/Vault par `CredentialRuntime`.
- [x] Trading Engine privé Binance / OKX / Kraken raccordé via `SecretProvider -> credential_service -> Data Service/Vault`.
- [x] Kraken Add-On raccordé au Data Service/Vault pour ses credentials privés.
- [x] Migration automatique des credentials de l'ancien coffre vers SQLite au premier login réussi.
- [x] Suppression automatique de l'ancien fichier uniquement après réussite de toutes les écritures Vault SQLite.
- [x] Le Core actif compilé n'utilise plus l'ancienne logique RSA et le self-test vérifie l'absence de référence active au nom du fichier legacy.
- [x] Textes runtime Auth/Settings nettoyés pour présenter le Vault SQLite AES-256-GCM.
- ◐ Le code historique RSA reste présent dans le fichier source Core d'origine comme couche de transition, mais est remplacé avant compilation par `core_credential_patch.js`; nettoyage statique définitif à faire après validation de migration.
- [ ] Préparer une procédure sécurisée de sauvegarde/restauration de la clé maître du Vault SQLite.
- ⚠️ Tester migration réelle d'un ancien coffre, sauvegarde, lecture, modification et redémarrage avec credentials Vault sur le Mac cible.

## Connecteurs & Market Data

- [x] Hyperliquid Provider de type `SOCKET` présent dans MarketData.
- [x] Transport WebSocket générique et normalisation OHLCV Hyperliquid présents.
- ⚠️ Test live Hyperliquid sur le Mac cible à effectuer.
- [ ] CoinGecko : intégration prévue après consolidation UserData.
- [ ] Coinbase : priorité CEX future.
- [ ] OKX : priorité CEX future pour le connecteur complet Market Data/Trading ; le support des credentials Vault est déjà prêt.

## Patch / tests d'installation

- [x] `UserData/self_test.js` contrôle mappings Vault, transformation du Core, SecretProvider exchanges et asset Auth.
- [x] `install_runtime.command` lance le self-test avant le démarrage UserData.
- [x] `build_patch.command` génère une archive conforme au format UpdateManager avec manifeste et SHA-256 de chaque fichier.
- [x] `test_install.command` installe le patch dans une copie temporaire de v1.7.8 et vérifie les fichiers utilisateur protégés.
- [x] Syntaxe des scripts de construction/test vérifiée et génération d'archive testée sur environnement de développement.
- ⚠️ Exécuter `test_install.command` sur le Mac High Sierra cible pour valider l'UpdateManager, Node 16 et les dépendances natives réelles.

## Finalisation v1.7.9

- [ ] Préparer la sauvegarde/restauration de la clé maître Vault.
- [ ] Nettoyer statiquement l'ancienne implémentation RSA du Core après validation de migration.
- [ ] Revue complète des fichiers du patch v1.7.9.
- [ ] Tests fonctionnels Mac High Sierra : démarrage, inscription Username, Login, Settings, UserData, Vault, Fundamental, Admin, MarketData.
- [ ] Test réel de mise à jour v1.7.8 → v1.7.9 sans perte de données utilisateur.
- [ ] Test réel de migration ancien Login/Settings/credentials vers SQLite.
- [ ] Corriger les régressions découvertes pendant les tests.
- [ ] Mettre à jour CHANGELOG / documentation Wiki finale.
- [ ] Générer et valider l'archive patch officielle v1.7.8 → v1.7.9.
- [ ] Générer le build complet v1.7.9.
- [ ] Générer l'archive complète officielle et son SHA-256.
- [ ] Promouvoir la version validée de `debug` vers `main`.
- [ ] ★ Déclarer v1.7.9 STABLE.

# Version v1.8

**État : 🔒 EN ATTENTE DE CLÔTURE DE v1.7.9**

La v1.8 ne démarre qu'après validation ★ STABLE de v1.7.9.

## Objectif connecteurs à long terme

Tout nouveau connecteur doit respecter le même contrat : Market Data, OHLC/OHLCV, volumes propres, Chart Viewer, Indicator Engine lorsque pertinent, paramètres requis dans `Settings > API`, documentation, tests et health check.

Préférer un connecteur autonome et légèrement redondant à une intégration qui réutilise silencieusement les données d'une autre plateforme.

## Passage v2.x

Le passage de la branche de développement `v1.x` à `v2.x` est réservé à la phase suivante lorsque l'application sortira de sa période de test/développement.
