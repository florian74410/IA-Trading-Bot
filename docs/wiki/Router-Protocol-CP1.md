# Router Protocol / CP/1

> Référence documentaire : IA-TB v1.8.12 — Router Protocol Normalization.

Le **Communication Router** constitue le point de passage normalisé des communications inter-modules IA-TB. Les Engines et services ne doivent pas dépendre directement de l'implémentation interne d'un autre Engine.

## Statut des composants

### Actifs CP/1

- Indicator Engine
- Trading Engine
- Risk Engine
- Portfolio Engine
- Market Data
- Liquidity Engine
- Fundamental Engine — `INFORMATION_ONLY`

### Bridge de sécurité

- Trading Firewall — `SECURITY_BRIDGE` volontaire. Il protège le canal d'exécution et n'est pas une cible métier Router directe.

### RESERVED

- Strategy Engine — contrat préparé, aucun service runtime autonome présent dans le build v1.8.12.
- Supervisor IA — contrat préparé, aucun service runtime CP/1 autonome présent dans le build v1.8.12.

Ces composants ne doivent jamais être présentés dans le Wiki comme fonctionnels tant que leur runtime autonome n'est pas effectivement intégré et validé.

## Contrat CP/1

### Request

Une requête CP/1 contient :

- `protocol`
- `request_id`
- `timestamp`
- `target`
- `action`
- `detail`
- `arguments`

### Response

Une réponse CP/1 contient :

- `protocol`
- `request_id`
- `engine`
- `action`
- `status`
- `schema`
- `generated_at`
- `duration_ms`
- `data_hash`
- `data`
- `warnings`

## Règles de sécurité

- communication locale `localhost` ;
- token CP partagé ;
- HMAC-SHA256 ;
- whitelist via Registry ;
- protection anti-replay dans le Router ;
- aucun shell arbitraire ;
- aucun chemin de fichier arbitraire ;
- aucune URL arbitraire.

## Commandes Market Data

| Commande | Effet |
|---|---|
| `marketdata.health` | Etat et santé du service Market Data. |
| `marketdata.candles` | Demande de bougies selon les arguments autorisés par le Registry. |
| `marketdata.refresh` | Demande de rafraîchissement contrôlé des données. |
| `marketdata.active` | Retourne l'état/source active exposée par Market Data. |
| `marketdata.cache.clear` | Vide le cache Market Data selon le périmètre autorisé. |

## Commandes Liquidity

| Commande | Effet |
|---|---|
| `liquidity.health` | Etat et santé du Liquidity Engine. |
| `liquidity.zones` | Retourne les zones de liquidité calculées. |
| `liquidity.realtime` | Retourne les informations temps réel disponibles. |
| `liquidity.snapshot` | Produit un snapshot de liquidité. |
| `liquidity.liquidations` | Retourne les liquidations explicitement disponibles. |
| `liquidity.cache.clear` | Vide le cache Liquidity selon le périmètre autorisé. |

## Commandes Fundamental

Le Fundamental Engine est exposé en mode **INFORMATION_ONLY** : il fournit du contexte et ne prend aucune décision d'exécution.

| Commande | Effet |
|---|---|
| `fundamental.health` | Etat et santé du Fundamental Engine. |
| `fundamental.summary` | Retourne un résumé fondamental. |
| `fundamental.context` | Retourne le contexte fondamental disponible. |
| `fundamental.sources` | Liste les sources connues/exposées. |
| `fundamental.events` | Retourne les événements fondamentaux disponibles. |
| `fundamental.collect` | Déclenche une collecte contrôlée selon les paramètres autorisés. |

## Sources de vérité

- Machine-readable : `Core/Communication/router_protocol_spec_v1.8.12.json`
- Documentation humaine du build : `Docs/Architecture/ROUTER_PROTOCOL_SPEC_v1.8.12.md`

Le Wiki doit rester aligné sur ces sources. En cas de divergence, le registre/spec machine-readable sert à contrôler les capacités réellement déclarées et la documentation ne doit pas inventer de fonctionnalité.

## QA v1.8.12

- Router normalization : **OK**
- Communication Protocol CP/1 : **OK**
- Unified Admin Debug Framework v1.8.11 : **OK**
- CP/1 Common Tools v1.8.9 : **OK**
- VERSION-GUARD : **OK 1.8.12**
- Contrôle visuel : **30 fichiers, 0 modification**
