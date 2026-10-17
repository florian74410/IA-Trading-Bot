# Trading Engine

## Role

Le Trading Engine possede l'execution exchange d'IA-TB. Il ne produit pas de signal et ne decide pas seul d'ouvrir une position.

Flux de reference : Supervisor / Strategy -> Router -> Risk -> Firewall :8017 -> Trading Engine :8016 -> Exchange Adapter -> CEX / DEX.

## Surface runtime

GET /health et POST /cp/v1.
Les anciennes routes HTTP /api/status, /api/capabilities et /api/last-execution ont ete supprimees.

## CP/1

Actions principales :
- trading.health
- trading.capabilities
- trading.account.positions
- trading.account.orders
- trading.account.balances
- trading.execute
- trading.cancel
- trading.close_position
- trading.history

Les lectures de compte sont generiques par executor. GMX est le premier adapter a exposer positions, orders et balances via ce contrat commun.

## Exchanges / adapters

Le Trading Engine utilise un executor catalog. Un nouvel exchange doit etre ajoute via son adapter + manifeste de capabilities, pas par du code specifique dans Core ou Router.

Adapters actifs : Binance, OKX, Kraken et GMX.

## Securite

Les operations Trading mutantes traversent le Firewall et les controles Risk.
Les secrets restent dans les frontieres prevues et ne doivent pas etre codes en dur.
