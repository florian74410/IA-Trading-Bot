# IA-Trading-Bot

Dépôt du projet **IA-TB**.

## Documentation

- [Protocole officiel de versionnage et de release](docs/RELEASE_PROTOCOL.md)
- [Checklist obligatoire de release](.github/RELEASE_CHECKLIST.md)
- [Sources du Wiki](docs/wiki/Home.md)

## Cycle de release

Le cycle officiel est :

**Versionnage → Développement → Tests → Patch → CHANGELOG → Déploiement GitHub → Analyse d'impact Wiki → Mise à jour du Wiki**

Une release n'est terminée que lorsque la documentation correspondant à la version réellement publiée a également été traitée.

## Connecteurs

Chaque nouveau CEX/DEX doit être intégré avec ses propres données de marché lorsque disponibles : marchés/paires, OHLC/OHLCV, volumes, Market Data, Chart Viewer et paramètres nécessaires dans `Settings > API`.
