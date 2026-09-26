
# Trading Engine

## Rôle

Le Trading Engine est la passerelle d'exécution entre l'architecture interne IA-TB et les APIs des exchanges.

Flux de référence :

```text
Supervisor -> Router <-> Risk Manager -> Trading Engine -> Exchange
```

Il ne produit aucun signal et ne décide jamais d'ouvrir une position.

## Contrôle obligatoire

Toute commande `trading.execute` doit contenir un `risk_approval_id`.
Sans autorisation Risk Manager, le Trading Engine refuse l'exécution.

## Communication Protocol

Le moteur échange avec le reste d'IA-TB via un adaptateur Communication Protocol.
Les formats natifs Binance, OKX, Kraken et GMX ne sortent jamais de la couche Exchange Adapter.

## Runtime supervisé depuis v1.7.7

Le Trading Engine est lancé comme service local sur `127.0.0.1:8016`.
Il expose `/health`, `/api/status`, `/api/capabilities`, `/api/last-execution` et `/cp/v1`.

Le service peut être redémarré depuis ADMIN. Son état de sécurité est visible sans activer l exécution réelle : `LIVE OFF` est la valeur par défaut.

## Exchanges intégrés depuis v1.7.6

- Binance : Spot + USDⓈ-M Futures
- OKX : Spot / Margin / Swap / Futures
- Kraken : Spot / Margin
- GMX : ordre préparé + signature wallet + submission relayée

## Sécurité

Les secrets proviennent exclusivement du coffre `Settings > API`.
Aucun secret ne doit être codé en dur ou stocké dans le dossier Trading Engine.
