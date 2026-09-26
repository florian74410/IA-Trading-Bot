# Trading Engine

## Rôle

**Trading Engine :8016** est la couche d'exécution. Il ne produit pas de signal : il traduit une commande interne validée vers le format de l'exchange choisi.

## Chemin réel DEBUG 1.12

```text
Client métier / futur Supervisor
          │
        Router
          │ cible trading
          ▼
     Firewall :8017
          │ inspection + forward signé
          ▼
  Trading Engine :8016
          │
          ▼
 Exchange Adapter
          │
 Binance / OKX / Kraken / GMX
```

Le ProtocolRegistry déclare volontairement l'endpoint Trading sur 8017 : c'est le **point d'entrée protégé**. Le Process Registry conserve Trading Engine lui-même sur 8016.

## Commandes CP/1

`trading.health`, `capabilities`, `execute`, `cancel`, `close_position`, `history`.

Les commandes mutantes exigent les champs de sécurité prévus, dont `risk_approval_id` selon le contrat. Trading Engine exige également que la requête mutante provienne du forwarding Firewall.

## LIVE

`IATB_TRADING_LIVE=0` est la valeur runtime par défaut. Le service peut donc être ONLINE tout en gardant l'exécution réelle désactivée.

## Adapters

Chaque exchange possède capabilities + executor + schémas de requêtes. Le registre choisit l'adapter et les utilitaires HTTP/secrets restent internes à la couche Trading.

## Historique et Portfolio

Chaque résultat est normalisé, ajouté à l'historique, puis un événement Portfolio est enregistré. Cela permet de séparer « ordre envoyé » et « état financier observé ».

## Secrets

Le `secret-provider` récupère les credentials depuis le stockage Settings/API. Aucun secret ne doit être codé dans un adapter.
