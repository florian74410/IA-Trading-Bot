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

Objectif : consolider l'administration, la persistance UserData et l'authentification avant la prochaine vague de connecteurs.

## Interface & Administration

- [x] Refonte de la page Admin Backend Manager.
- [x] Conservation des services et contrôles existants dans la nouvelle interface Admin.
- [x] Correction du test `Flux & collecte` : résultat affiché dans le header Flux et non dans Providers.
- [x] Journalisation des tests de Flux conservée dans le Fundamental Engine.
- [x] Asset officiel du nouvel écran d'authentification enregistré dans `Docs/Assets/IA-TB_Auth_v1.7.9.png`.
- [ ] Intégrer visuellement le nouvel écran/logo dans la page d'authentification réelle.
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
- ◐ Faire de SQLite la source canonique directe des Settings : couche UserData disponible, mais le serveur principal utilise encore des fichiers de projection pour compatibilité.
- ◐ Faire de SQLite la source canonique directe du Login : compte SQLite supporté, mais l'ancien `user.dat` reste encore projeté pour le runtime existant.
- [ ] Supprimer progressivement la dépendance runtime aux anciens fichiers Settings/Login lorsque les consommateurs seront migrés.
- ⚠️ Vérifier l'installation de `better-sqlite3@8.7.0` avec Node 16.20.2 sur macOS High Sierra.
- ⚠️ Tester récupération de la DB après suppression de la copie locale / changement de build.
- ⚠️ Tester sauvegarde et restauration des Settings, compte et credentials après mise à jour.

## Compte / Authentification

Nouvelle règle v1.7.9 : le **Username est créé à l'inscription et devient immuable**. Il identifie le dossier UserData du compte et reste lié au compte de connexion et à son email.

- [x] Validation backend disponible pour un Username sûr (`3–32`, lettres/chiffres/`.`/`_`/`-`).
- [x] Support du compte dans le client et le serveur UserData.
- [x] Migration d'un ancien compte vers une identité UserData.
- [ ] Ajouter le champ **Username** au formulaire de première inscription.
- [ ] Enregistrer Username + Email + hash du mot de passe directement dans le compte SQLite lors de l'inscription.
- [ ] Rendre le Username non modifiable dans Settings.
- [ ] Afficher le Username du compte dans Settings en lecture seule.
- [ ] Faire utiliser le compte SQLite directement par `/api/setup`, `/api/login`, changement d'email et changement de mot de passe.
- ⚠️ Tester création de compte neuf, reconnexion, changement d'email et changement de mot de passe.

## Settings

- [x] API générique `scope/key/value` disponible dans SQLite.
- [x] Import initial des fichiers de paramètres existants vers UserData.
- ◐ Synchronisation SQLite ↔ projections `.dat` disponible pour compatibilité.
- [ ] Migrer `/api/settings/general` vers SQLite comme source directe.
- [ ] Migrer langue, puissance IA, modulation/mosaïque et profil actif vers SQLite comme source directe.
- [ ] Migrer les paramètres Indicator Engine pertinents vers le Data Service si nécessaire.
- [ ] Confirmer qu'une mise à jour v1.7.8 → v1.7.9 ne remplace jamais les Settings utilisateur.

## Secrets / API

- [x] Infrastructure Vault SQLite disponible.
- [x] Credentials chiffrés dans la DB UserData.
- ◐ Les anciens secrets peuvent encore être représentés via la compatibilité `secrets_v2.dat`.
- [ ] Migrer les consommateurs OpenAI/X/exchanges pour lire directement leurs credentials via UserData/Vault.
- [ ] Préparer une procédure sécurisée de sauvegarde/restauration de la clé maître.

## Connecteurs & Market Data

- [x] Hyperliquid Provider de type `SOCKET` présent dans MarketData.
- [x] Transport WebSocket générique et normalisation OHLCV Hyperliquid présents.
- ⚠️ Test live Hyperliquid sur le Mac cible à effectuer.
- [ ] CoinGecko : intégration prévue après consolidation UserData.
- [ ] Coinbase : priorité CEX future.
- [ ] OKX : priorité CEX future.

## Finalisation v1.7.9

- [ ] Revue complète des fichiers du patch v1.7.9.
- [ ] Tests fonctionnels sur le Mac High Sierra : démarrage, Login, Settings, UserData, Fundamental, Admin, MarketData.
- [ ] Test de mise à jour depuis v1.7.8 sans perte de données utilisateur.
- [ ] Corriger les régressions découvertes pendant les tests.
- [ ] Mettre à jour CHANGELOG / documentation Wiki.
- [ ] Générer le patch officiel v1.7.8 → v1.7.9.
- [ ] Générer le build complet v1.7.9.
- [ ] Générer l'archive officielle et son SHA-256.
- [ ] Promouvoir la version validée de `debug` vers `main`.
- [ ] ★ Déclarer v1.7.9 STABLE.

# Version v1.8

**État : 🔒 EN ATTENTE DE CLÔTURE DE v1.7.9**

La v1.8 ne démarre qu'après validation ★ STABLE de v1.7.9. Les nouveaux grands connecteurs et fonctionnalités seront planifiés depuis l'état réel du code à ce moment-là.

## Objectif connecteurs à long terme

Tout nouveau connecteur doit respecter le même contrat : Market Data, OHLC/OHLCV, volumes propres, Chart Viewer, Indicator Engine lorsque pertinent, paramètres requis dans `Settings > API`, documentation, tests et health check.

Préférer un connecteur autonome et légèrement redondant à une intégration qui réutilise silencieusement les données d'une autre plateforme.

## Passage v2.x

Le passage de la branche de développement `v1.x` à `v2.x` est réservé à la phase suivante lorsque l'application sortira de sa période de test/développement.
