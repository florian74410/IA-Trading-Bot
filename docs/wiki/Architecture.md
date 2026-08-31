# Architecture

IA-TB suit une architecture modulaire. Le but est de pouvoir ajouter des CEX/DEX et des moteurs d'analyse sans créer de dépendances implicites entre les plateformes.

<p align="center">
  <img src="../../assets/architecture-overview.png" alt="IA-TB — Architecture fonctionnelle" width="100%" />
</p>

> Version SVG : [`assets/architecture-overview.svg`](../../assets/architecture-overview.svg)

## Vue logique actuelle

Le **Router** est le hub de communication central. Les échanges inter-modules passent par lui afin de limiter le couplage et de rendre les flux observables.

```text
Market Data    <-> Router
Chart Viewer   <-> Router
Portfolio      <-> Router
Risk Engine    <-> Router
Supervisor     <-> Router

Strategy Engine     <-> Router
Trading Engine      <-> Router
Indicator Engine    <-> Router
Fundamental Engine  <-> Router

Trading Engine <-> Trading Firewall <-> Exchanges
```

Le **Risk Engine** est analytique : il calcule exposition, levier, marge, drawdown, volatilité, VaR, Expected Shortfall et autres métriques à partir des données obtenues via le Router. Il fournit ses résultats au Supervisor mais ne décide ni n'exécute directement un ordre. Voir [Risk Engine](Risk-Engine.md).

Le **Trading Firewall** est la couche de contrôle du canal d'exécution entre le Trading Engine et les Exchanges. Il vérifie les règles de sécurité avant transmission d'une commande : authentification CP, signatures, âge du message, whitelist de commandes, whitelist de paires et protection anti-doublon. Voir [Trading Firewall Module](Firewall-Module.md).

## Séparation des responsabilités

```text
Strategy / Supervisor
        |
        v
      Router <-> Risk Engine
        |
        v
 Trading Engine
        |
        v
 Trading Firewall
        |
        v
     Exchanges
```

- **Supervisor** : orchestration et décision de haut niveau.
- **Risk Engine** : mesure et représentation du risque.
- **Trading Engine** : préparation/adaptation et exécution technique des ordres.
- **Trading Firewall** : contrôle de sécurité du canal d'exécution.
- **Exchange connector** : communication avec l'API CEX/DEX concernée.

## Principes

### Connecteur autonome

Un connecteur représente sa plateforme et conserve la provenance de ses données.

### Registre Market Data multi-provider

Depuis la v1.7.8, le Market Data Engine dispose d'un registre de providers. Kraken reste le provider de référence par défaut et Hyperliquid est le premier provider de type `SOCKET`.

Le registre permet de sélectionner explicitement la source sans mélanger les caches ni les séries. Les clés de cache restent séparées par provider, symbole et timeframe.

### Provider SOCKET

Le type `SOCKET` représente un flux WebSocket persistant destiné aux mises à jour temps réel. Il peut être associé à une API HTTP pour récupérer l'historique initial. Hyperliquid utilise cette architecture avec `candleSnapshot` pour l'historique et le canal WebSocket `candle` pour les mises à jour.

### Normalisation centrale

La couche commune harmonise symboles, timeframes, timestamps et formats sans effacer l'identité de la source.

### Market Data séparé des secrets

Les données publiques doivent fonctionner sans clé lorsque la plateforme le permet. Les fonctions privées utilisent les identifiants configurés dans `Settings > API`.

### Faible couplage

Chart Viewer, Risk Engine, Indicator Engine et les autres moteurs consomment des interfaces normalisées et communiquent via le Router plutôt que par des dépendances implicites entre modules.

### Machine cible

L'application doit rester légère : cache maîtrisé, mémoire limitée, traitement à la demande et flux temps réel raisonnables plutôt qu'un chargement historique massif au démarrage.
