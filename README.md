# IA-Trading-Bot (IA-TB)

Application modulaire de trading crypto : CEX/DEX, Market Data, Chart Viewer, Indicator Engine, Strategy Engine, Fundamental Engine, gestion centralisée des API et Update Manager versionné.

<p align="center">
  <img src="docs/assets/architecture-overview.svg" alt="IA-Trading-Bot architecture" width="100%" />
</p>

## Architecture générale

Le système repose sur un **Router central** qui orchestre les différents moteurs spécialisés :

- `Supervisor <-> Router`
- `Strategy Engine <-> Router`
- `Trading Engine <-> Router`
- `Indicator Engine <-> Router`
- `Fundamental Engine <-> Router`
- `Market Data -> Supervisor`
- `Exchanges -> Market Data`
- `Trading Engine -> Risk Manager -> Exchanges`
- `Market Data -> Chart Viewer`
- `Portfolio -> Supervisor`

# 🗺️ Feuille de route — v1.8+

> **Check-list détaillée de développement de IA-Trading-Bot**

## 🔒 Règle de démarrage

Cette feuille de route commence **exclusivement à partir de la version v1.8**.

Tant que la branche **v1.7.x** n'est pas officiellement **terminée, testée et déclarée STABLE**, aucune fonctionnalité, tâche ou sous-tâche de v1.8 ne doit être planifiée ici.

À la clôture de v1.7.x, cette feuille sera construite à partir de **l'état réel du code source** et des décisions prises pour la suite du projet.

### Légende de suivi

- [ ] À faire
- ◐ En cours
- [x] Terminé
- ⚠️ Bloqué / à vérifier
- ★ Validé **STABLE**

## Version v1.8

**État : 🔒 EN ATTENTE DE CLÔTURE DE v1.7.x**

> ### AUCUNE TÂCHE PLANIFIÉE
> La check-list v1.8 restera volontairement vide jusqu'à la validation **STABLE** de la dernière version v1.7.x.

### Structure utilisée à partir de v1.8

- [ ] Objectif de la version
  - [ ] Fonctionnalité / chantier
    - [ ] Sous-tâche technique
    - [ ] Tests nécessaires
    - [ ] Critère de validation
  - [ ] Documentation à mettre à jour
  - [ ] Contrôle de sécurité
  - [ ] Contrôle des performances
  - [ ] Validation finale
- [ ] ★ Passage **STABLE**

---

## Rôle du dépôt

Ce dépôt est la **source de vérité du code source courant de IA-TB**.

- `main` = code source complet de la dernière version validée.
- `Updates/Patches/` = archives de mise à jour installables entre deux versions.
- L'historique Git conserve les anciennes versions du code ; il n'est pas nécessaire de dupliquer le projet dans des dossiers `v1.x`.
- Chaque nouvelle mise à jour repart de la dernière source validée présente sur GitHub, puis remplace/actualise cette source une fois les tests terminés.
- Les secrets, coffres, clés privées, tokens, logs, bases locales et données utilisateur ne doivent jamais être commités.

## Documentation

La documentation officielle est versionnée dans [`docs/wiki`](docs/wiki/Home.md).

- [Accueil documentation](docs/wiki/Home.md)
- [Installation](docs/wiki/Installation.md)
- [Architecture](docs/wiki/Architecture.md)
- [Connecteurs CEX / DEX](docs/wiki/Connectors-CEX-DEX.md)
- [Market Data](docs/wiki/Market-Data.md)
- [Chart Viewer](docs/wiki/Chart-Viewer.md)
- [Indicator Engine](docs/wiki/Indicator-Engine.md)
- [Settings / API](docs/wiki/Settings-API.md)
- [Update Manager](docs/wiki/Update-Manager.md)
- [Sécurité](docs/wiki/Security.md)
- [Roadmap](docs/wiki/Roadmap.md)

## Versionnage

La branche de développement utilise les versions `v1.x`. Chaque changement publié incrémente la version. Le passage à `v2.x` correspondra à la phase suivant le développement/test.

Cycle officiel :

`Source GitHub N -> Développement N+1 -> Tests -> Patch -> CHANGELOG -> Commit source N+1 -> Updates/Patches -> Wiki`

Voir [Versionnage et releases](docs/wiki/Versioning-and-Releases.md) et le [protocole de mise à jour](docs/RELEASE_PROTOCOL.md).
