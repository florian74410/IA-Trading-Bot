# Architecture

IA-TB suit une architecture modulaire. Le but est de pouvoir ajouter des CEX/DEX et des moteurs d'analyse sans créer de dépendances implicites entre les plateformes.

<p align="center">
  <img src="../assets/architecture-overview.png" alt="IA-TB — Architecture fonctionnelle" width="100%" />
</p>

> Version SVG : [`assets/architecture-overview.svg`](../assets/architecture-overview.svg)

## Vue logique actuelle

Le **Router** est le hub de communication central. Les échanges bidirectionnels sont représentés par deux flèches distinctes : chaque flèche reprend la couleur du module dont elle part, tandis que les données binaires affichées entre les deux sens restent blanches.

```text
Market Data    <-> Router
Chart Viewer   <-> Router
Portfolio      <-> Router
Risk Manager   <-> Router
Supervisor     <-> Router

Strategy Engine     <-> Router
Trading Engine      <-> Router
Indicator Engine    <-> Router
Fundamental Engine  <-> Router

Trading Engine <-> Firewall <-> Exchanges
```

Le **Firewall** matérialise la couche de contrôle du canal d'exécution entre le Trading Engine et les Exchanges. Il représente notamment les contrôles de sécurité, les coupures réseau possibles et les validations avant exécution.

## Principes

### Connecteur autonome

Un connecteur représente sa plateforme et conserve la provenance de ses données.

### Registre Market Data multi-provider

Depuis la v1.7.8, le Market Data Engine dispose d'un registre de providers. Kraken reste le provider de référence par défaut et Hyperliquid est le premier provider de type `SOCKET`.

Le registre permet de sélectionner explicitement la source sans mélanger les caches ni les séries. Les clés de cache restent séparées par provider, symbole et timeframe.

### Provider SOCKET

Le type `SOCKET` représente un flux WebSocket persistant destiné aux mises à jour temps réel. Il peut être associé à une API HTTP pour récupérer l'historique initial. Hyperliquid utilise cette architecture avec `candleSnapshot` pour l'historique et le canal WebSocket `candle` pour les mises à jour.

La couche SOCKET suit également l'état de connexion, le dernier événement reçu, les erreurs et les abonnements actifs afin de rendre le flux observable.

### Normalisation centrale

La couche commune harmonise symboles, timeframes, timestamps et formats sans effacer l'identité de la source.

### Market Data séparé des secrets

Les données publiques doivent fonctionner sans clé lorsque la plateforme le permet. Les fonctions privées utilisent les identifiants configurés dans `Settings > API`.

### Faible couplage

Chart Viewer, Indicator Engine et les autres moteurs consomment des interfaces normalisées et communiquent via le Router plutôt que par des dépendances implicites entre modules.

### Machine cible

L'application doit rester légère : cache maîtrisé, mémoire limitée, traitement à la demande et flux temps réel raisonnables plutôt qu'un chargement historique massif au démarrage. La v1.7.8 conserve cette règle avec un cache Market Data borné et des contextes actifs expirables.
