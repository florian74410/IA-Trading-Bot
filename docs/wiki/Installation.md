# Installation et démarrage

Cette page décrit le fonctionnement général de l'installation locale de IA-TB. Les packages publiés restent la référence pour les fichiers exacts d'une version.

## Prérequis

- machine capable d'exécuter l'environnement livré avec IA-TB ;
- navigateur web pour l'interface ;
- accès réseau pour les providers et CEX/DEX utilisés ;
- clés API uniquement pour les fonctions privées qui en ont besoin.

La v1.7.8 conserve la compatibilité avec macOS High Sierra / Intel et Node.js 16.20.2.

## Runtime Market Data v1.7.8+

Le provider Hyperliquid `SOCKET` utilise la dépendance `ws@8.18.0`, limitée au module `MarketData`. `install_runtime.command` vérifie et installe cette dépendance lorsque nécessaire ; aucune installation globale de `ws` n'est requise.

## Démarrage

Depuis le dossier de l'application :

```bash
bash start.command
```

L'application démarre ses services puis expose l'interface web locale selon la configuration de la version installée.

## Arrêt

```bash
bash stop.command
```

Toujours préférer l'arrêt propre aux interruptions brutales afin de laisser les services, caches et fichiers de journalisation se fermer correctement.

## Après installation

1. ouvrir l'interface ;
2. vérifier la version affichée ;
3. ouvrir `Settings > API` ;
4. renseigner uniquement les connecteurs privés nécessaires ;
5. tester les connexions lorsque le bouton est disponible ;
6. vérifier Market Data et Chart Viewer avant d'activer une stratégie ou un ordre réel.

Pour diagnostiquer le Market Data en v1.7.8+, les endpoints `/health` et `/providers` permettent de vérifier les providers disponibles et, pour les providers `SOCKET`, leur état de connexion et leur fraîcheur.

## Mise à jour

Les mises à jour passent par l'Update Manager. Voir [Update Manager](Update-Manager.md).
