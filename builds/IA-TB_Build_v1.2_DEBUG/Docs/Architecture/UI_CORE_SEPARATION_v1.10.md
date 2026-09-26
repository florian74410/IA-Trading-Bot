# IA-TB v1.10 — Séparation Interface Graphique / Core / Router / Engines

## Décision

L'interface graphique devient un processus autonome. Le rendu visuel de la v1.9.3 est conservé : mêmes pages, mêmes DOM/CSS, mêmes contrôles et mêmes zones graphiques. La modification porte sur le déploiement et les flux de données.

## Ports

- `8000` — UI Service, seul point d'entrée navigateur.
- `8001` — Core API interne / launcher child API.
- `8021` — Communication Router CP/1 interne.
- `8011..8020` — Engines/services existants.

Le Router n'est plus le serveur de l'interface graphique.

## Frontière UI

`UI/Gateway/ui_service.js` sert `Frontend/` et ne charge aucun module métier provenant de Core ou des Engines. Le navigateur ne connaît que le port UI 8000.

Flux :

```text
Browser
  -> UI Service :8000
       -> Core API :8001          (Settings, Chat, application APIs)
       -> Router CP/1 :8021       (Engine/read channels)
            -> Firewall
            -> Engines
```

Le Core est démarré avec `IATB_UI_SEPARATED=1` : ses routes HTML/assets sont désactivées à l'exécution. Il reste headless.

## Permissions préparées

- `READ` : lecture des données et états.
- `USER_WRITE` : paramètres utilisateur et opérations autorisées à un utilisateur normal.
- `ADMIN_WRITE` : administration, updates et opérations système sensibles.

`Settings` est classé `USER_WRITE`. Un futur compte `USER` pourra donc enregistrer ses paramètres sans être `ADMIN`.

L'authentification reste désactivée dans cette release. Le bypass de développement reste `ADMIN` afin de ne supprimer aucune fonction actuelle. Quand l'authentification sera activée, le rôle de session sera obtenu côté serveur ; le navigateur ne décidera jamais de son propre rôle.

## Les deux vues graphiques

### Chart Viewer / TradingView

Le Chart Viewer reste inchangé : il embarque le widget TradingView externe (`s3.tradingview.com`). La paire et le timeframe sont gérés localement dans cette page. Ce flux ne fournit pas les données utilisées par les Engines.

### IA Trading View

Le graphique Trading IA n'utilise plus les endpoints marché du Core (`/api/market/klines`, `/api/gmx/ticker`). Son contrat navigateur est :

```text
/ui-data/market/candles
  -> UI Gateway
  -> Router :8021
  -> /market-data/candles
  -> Firewall Data Thread :8017
  -> Market Data Collector :8013
```

Cette source est la source métier commune destinée aux Engines. Le graphique IA affiche donc le même flux Market Data Collector que celui disponible au pipeline de trading/indicateurs/risk.

## Strategy v2

La page Strategy conserve son rendu. Elle lit Strategy Engine v2 via `/communication/v1/ui/read`. Une ancienne fonction JavaScript qui réintroduisait `/api/strategy/*` a été retirée pour empêcher tout retour accidentel vers Strategy v1.

## Lifecycle

`start.command` démarre désormais : Core -> Router interne 8021 -> UI Service 8000. `stop.command` connaît le service UI et le Router 8021. Le correctif lifecycle 8017 reste conservé.
