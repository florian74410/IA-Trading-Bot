# IA-Trading-Bot - Patch v1.7.8

Base cible : v1.7.7

## Objectif

Introduire un nouveau type de Provider `SOCKET` pour les flux persistants temps reel et utiliser Hyperliquid comme premier Provider de ce type.

## Fichiers ajoutes

- `MarketData/Provider/socket_provider.js`
  - transport WebSocket generique
  - reconnexion automatique avec backoff borne
  - envoi JSON
  - statut connexion
  - aucune logique specifique a un exchange

- `MarketData/Provider/hyperliquid_provider.js`
  - Provider : `HYPERLIQUID`
  - Type : `SOCKET`
  - endpoint public par defaut : `wss://api.hyperliquid.xyz/ws`
  - abonnement trades
  - abonnement carnet L2
  - etat de connexion et dernier evenement

## Dependances

Ajouter au runtime Node utilise par MarketData :

```json
"ws": "8.18.0"
```

Le patch reste compatible avec Node.js 16, utilise sur la cible macOS High Sierra.

## Integration restante avant validation v1.7.8

1. Brancher Hyperliquid dans le registre des Providers MarketData.
2. Ajouter `SOCKET` dans la liste exposee par l'interface Providers.
3. Ajouter Hyperliquid dans la liste des Providers disponibles.
4. Normaliser les messages Hyperliquid vers le format MarketData interne.
5. Alimenter cache / Indicator Engine / Chart Viewer sans conserver inutilement l'historique en RAM.
6. Ajouter health/debug : provider, type, connected, lastEventAt, lastError.
7. Ajouter un self-test SOCKET/Hyperliquid.
8. Mettre a jour VERSION et CHANGELOG uniquement quand le patch sera fonctionnellement integre.
9. Construire ensuite `Build/v1.7.8` sans modifier l'archive historique v1.7.7.

## Etat

PREPARATION - socle SOCKET + Hyperliquid cree, integration runtime/UI encore en cours.
