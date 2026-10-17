# 🧪 IA-TB Build v2.2.0 TEST — Recette Auth21 / User Management

> **Préversion de test uniquement.** Ce dossier rassemble l'application et les ressources Docker provenant du tag officiel **v2.2.0**. Il ne vaut ni validation fonctionnelle de GEN-1 ni build de production.

## Provenance immuable

- Release officielle : https://github.com/florian74410/IA-Trading-Bot/releases/tag/v2.2.0
- Commit source : `1a315da19e3b3fd90391255c48ab2948d9d21d0f`
- Qualification : 519 tests GitHub annoncés réussis, recette Docker 13 services avant et après redémarrage.
- Archive source et SHA-256 publiés dans la release (les télécharger et vérifier séparément).

## Arborescence du build

```text
Builds/IA-TB_Build_v2.2.0_TEST/
├── App/                         # Application Node.js 22, Dockerfile, code et dépendances verrouillées
├── Tools/                       # Outils de déploiement, préflight et inventaire
├── Documentation/               # Documentation de la release
├── compose.v2.2.gen1-test.yml   # Stack Docker isolée à 13 services
├── BUILD_MANIFEST.json          # Provenance et limites du build
└── README.md                    # Ce document
```

Les sous-arbres `App`, `Tools`, `Documentation` et le Compose sont référencés **sans altération** depuis le commit du tag v2.2.0. Aucune donnée cliente, clé privée, volume Docker ou dépendance `node_modules` n'est intégrée.

## Préparation et tests (environnement isolé uniquement)

1. Utiliser l'archive source de la release ou un checkout de ce répertoire, avec Docker et Node 22 compatibles.
2. Préparer une **copie privée** des données avec **toutes les clés originales**, les volumes de test et le certificat HTTPS.
3. Lire entièrement `Documentation/GEN1_TEST_2.2.0.md` avant tout changement ; cette procédure est prioritaire.
4. Vérifier le Compose puis construire l'image sur le banc isolé uniquement :
   ```bash
   export IATB_UID="$(id -u)" IATB_GID="$(id -g)"
   export IATB_V22_ROOT=/chemin/absolu/vers/recette-v22
   export IATB_AUTH_ORIGIN=https://localhost:8443
   docker compose -f compose.v2.2.gen1-test.yml config --quiet
   docker compose -f compose.v2.2.gen1-test.yml build router
   ```
   **Ne pas exécuter ces commandes sur les volumes actifs de la v2.1.1.**
5. L'inventaire, la migration sur copie arrêtée, la création du compte ADMIN et les contrôles Firefox/CLI sont documentés dans la procédure de recette.

## Limites fonctionnelles

Trading LIVE, ordres, transferts signés, REMOTE_LLM, envoi d'e-mails et snapshots à chaud : **indisponibles / non qualifiés** sur la v2.2.0 authentifiée. Aucune migration automatique des ressources historiques. Aucun redémarrage ou déploiement GEN-1 effectué par ce packaging.

## Reproductibilité

Le tag Git de référence permet de comparer ces fichiers avec leurs originaux via `git diff v2.2.0 -- App Tools Documentation compose.v2.2.gen1-test.yml` depuis le dépôt source. Le SHA-256 de l'archive officielle est publié dans les assets de la release ; ce dossier Git n'invente pas de hash d'archive Docker.

**Statut : PACKAGING SOURCE/COMPOSE ASSEMBLÉ — IMAGE DOCKER NON CONSTRUITE ICI — RECETTE GEN-1 À EFFECTUER.**
