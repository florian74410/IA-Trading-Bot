# Patch v1.7.9 — Admin UI + UserData Phase 1 + Flux Tester

Base : v1.7.8
Cible : v1.7.9

## Objectifs
- Refonte ergonomique de la page Admin.
- Corriger l'affichage du resultat `Tester` d'un Flux dans le header `Flux & collecte`.
- Introduire UserData Phase 1: SQLite hors Git et hors SourceCode local, Vault chiffre, stockage multi-user et cache memoire.

## UserData Phase 1
Stockage canonique sur Macro:

`~/IA-TB-UserData-Server/<username>/user_data.db`

Regles:
- le dossier serveur et le dossier `<username>` sont crees automatiquement s'ils sont absents;
- la DB est creee automatiquement si elle n'existe pas;
- la DB n'est jamais copiee dans le dossier du build;
- le build charge profils, Settings, strategies et etat des credentials en memoire via le UserData Server local;
- les credentials restent chiffres AES-256-GCM dans SQLite et sont dechiffres uniquement a la demande;
- la cle maitre et le token serveur restent hors Git;
- UpdateManager refuse explicitement les DB utilisateur dans un patch.

UserData Server Phase 1:
- ecoute exclusivement `127.0.0.1:8020`;
- demarre automatiquement pendant le lancement du build s'il n'est pas deja actif;
- API locale authentifiee pour snapshot, Settings, strategies et credentials;
- architecture prevue pour remplacer plus tard le transport local par HTTPS/SFTP.

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

## Fichiers principaux
- Frontend/Pages/admin_v1.0.html
- Frontend/CSS/admin_v1.0.css
- Frontend/Pages/fundamental_v1.0.html
- Frontend/JS/fundamental_controller_v1.0.js
- UserData/local_server.js
- UserData/memory_client.js
- UserData/user_data_service.js
- UserData/bootstrap.js
- UserData/vault.js
- UserData/server_auth.js
- UserData/package.json
- UserData/README.md
- install_runtime.command
- .gitignore
- Core/Updates/update_manager_v1.0.js

## Compatibilite
- macOS High Sierra / Intel.
- Node.js 16.20.2.
- Firefox ESR compatible.
- `better-sqlite3` 8.7.0 pour la DB UserData.
