# Architecture

IA-TB suit une architecture modulaire. Le but est de pouvoir ajouter des CEX/DEX et des moteurs d'analyse sans créer de dépendances implicites entre les plateformes.

## Vue logique

```text
CEX / DEX connectors
        │
        ├── Market Data : marchés, OHLC/OHLCV, volumes
        ├── Private API : compte, positions, ordres
        └── Health / capabilities
                │
                v
        Normalisation commune
                │
        ┌───────┼────────┐
        v       v        v
 Chart Viewer  Indicator  Liquidity
               Engine     Engine
        │
        v
 Trading / stratégie / exécution
```

## Principes

### Connecteur autonome

Un connecteur représente sa plateforme et conserve la provenance de ses données.

### Normalisation centrale

La couche commune harmonise symboles, timeframes, timestamps et formats sans effacer l'identité de la source.

### Market Data séparé des secrets

Les données publiques doivent fonctionner sans clé lorsque la plateforme le permet. Les fonctions privées utilisent les identifiants configurés dans `Settings > API`.

### Faible couplage

Chart Viewer, Indicator Engine et Liquidity Engine consomment des interfaces normalisées plutôt que du code spécifique à un exchange.

### Machine cible

L'application doit rester légère : cache maîtrisé, mémoire limitée, traitement à la demande et flux temps réel raisonnables plutôt qu'un chargement historique massif au démarrage.
