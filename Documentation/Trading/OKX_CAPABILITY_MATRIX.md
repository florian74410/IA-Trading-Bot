# Matrice des capacités OKX manuelles

Référence technique vérifiée : [documentation officielle OKX V5 européenne](https://my.okx.com/docs-v5/en/), consultée le 18 novembre 2026. Les autorisations effectives sont vérifiées par `GET /api/v5/account/instruments`, la configuration du compte et le coffre propriétaire. La présence d'une fonctionnalité dans cette matrice ne prouve pas son accessibilité à un compte OKX EU réel.

| Famille | Spot | Margin | SWAP/FUTURES | Endpoint |
|---|---|---|---|---|
| Market, Limit, Post-only, IOC, FOK | Oui | Mode compte 2, devise de marge explicite | Contrats linéaires, mode et unité vérifiés | POST `/trade/order` |
| Cancel / amend | Identifiant exact | Identifiant exact | Identifiant exact | POST `/trade/cancel-order`, `/trade/amend-order` |
| État / fills / historique | Oui | Selon instruments du compte | Selon instruments du compte | GET `/trade/order`, `/trade/fills`, `/trade/orders-history` |
| TP / SL / OCO | Oui, unité explicite | Restrictions du compte | Quantité en contrats, position et mode vérifiés | POST `/trade/order-algo` |
| Trigger | Oui | Restrictions du compte | Contrats linéaires | POST `/trade/order-algo` |
| Trailing | `move_order_stop` | Restrictions du compte | Contrats linéaires | POST `/trade/order-algo` |
| Cancel algo | Oui | Selon famille broker | Selon famille broker | POST `/trade/cancel-algos` (tableau) |
| Amend algo | Stop/Trigger seulement | Stop/Trigger seulement | Stop/Trigger seulement | POST `/trade/amend-algos` (objet) |
| État algo | Oui | Selon accès compte | Selon accès compte | GET `/trade/order-algo` |
| Levier | Sans objet | Mode 2, portée instrument ; autres portées refusées | Scope instrument/marge/position vérifié | GET `/account/leverage-info`, POST `/account/set-leverage` |
| LONG/SHORT/réduction/fermeture | Acheter/vendre Spot ; pas de position dérivée inventée | Mode 2 et quantité en actif | Quantité en contrats ; hedge/net distincts | POST `/trade/order` puis lectures |
| Batch explicite | Même compte/instrument, 1–20 ordres | Non qualifié | Non qualifié | POST `/trade/batch-orders` |
| Plans confirmés | Oui | Sous réserve des contraintes ci-dessus | Sous réserve des contraintes ci-dessus | Plusieurs requêtes distinctes |

Tous les chemins sont préfixés par `/api/v5`. Les lectures privées de prévisualisation incluent aussi `/account/config`, `/account/balance`, `/account/positions`, `/account/trade-fee`, et les lectures informatives `/market/ticker`, `/public/funding-rate`.

## Sémantique

- Un ratio suiveur de 2 % devient `callbackRatio="0.02"`. `callbackSpread` est une distance en prix ; un seul des deux est accepté. `activePx` n'est ni le prix limite ni le prix de déclenchement d'un Trigger.
- Un algorithme `effective` a été déclenché ; cela ne prouve pas le fill de son ordre résultant. `order_failed` est un échec explicite.
- Un parent rempli n'active pas implicitement ses protections. L'état des identifiants algorithmiques associés doit confirmer leur activation.
- Un ACK de cancel/amend ne prouve pas l'état final. Le serveur lit l'ordre exact.
- La configuration du levier et l'ouverture d'une position sont deux opérations confirmées et journalisées distinctes.
- `reduceOnly` est utilisé pour les fermetures net éligibles ; en hedge, le couple sens/`posSide` exact détermine la réduction.
- Les frais et coûts futurs non calculables restent N/C. Aucun calcul de liquidation n'est inventé.

## Non pris en charge explicitement

Trailing amend, Iceberg, TWAP, Chase, Options, contrats inverses, changement de mode de compte/position, emprunts/remboursements, portées de levier Margin par devise dans les autres modes, portefeuilles de marge non qualifiés, fills historiques paginés exhaustifs de plusieurs mois et quantité dépendante déduite automatiquement d'un futur fill. Ces opérations ne sont pas présentées comme exécutables.

Les restrictions régionales proviennent de l'API privée du compte ; aucune disponibilité universelle des dérivés dans l'EEE n'est supposée.
