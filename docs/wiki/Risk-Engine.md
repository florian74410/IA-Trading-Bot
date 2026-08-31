# Risk Engine

## Rôle

Le **Risk Engine** est le moteur analytique chargé de représenter et quantifier le risque. Il fournit des analyses au reste de l'architecture mais **ne décide pas d'exécuter un ordre**.

Il ne doit donc pas émettre directement `APPROVE`, `MODIFY` ou `REJECT` vers un Exchange et ne doit jamais contourner le Router ou le Trading Firewall.

## Architecture

Le Risk Engine est un Engine autonome relié au Router par le protocole interne CP/1.

```text
Market Data ----\
Indicators ------> Router <-> Risk Engine
Portfolio -------/              |
                                v
                             Router -> Supervisor
```

Toutes ses demandes de données passent par le Router :

- Market Data pour prix, OHLC/OHLCV, volatilité et données de marché ;
- Indicator Engine pour les indicateurs nécessaires à une analyse ;
- Portfolio pour positions, balances, exposition, equity et historique ;
- Supervisor comme consommateur des analyses de risque.

## Analyses prises en charge

Le socle du moteur couvre :

- taille et poids d'une position ;
- exposition absolue et relative ;
- levier ;
- marge utilisée et marge disponible lorsque les données existent ;
- drawdown ;
- volatilité ;
- Value at Risk historique (VaR) ;
- Expected Shortfall (ES) ;
- préparation de scénarios de stress.

Chaque résultat doit conserver la provenance et l'horodatage des données utilisées afin que le Supervisor puisse connaître la fraîcheur de l'analyse.

## Paramétrage

Le paramétrage du Risk Engine doit rester distinct des règles de blocage du Trading Firewall.

Les paramètres fonctionnels peuvent comprendre :

- fenêtre historique utilisée pour volatilité/VaR/ES ;
- niveau de confiance de la VaR ;
- horizons d'analyse ;
- seuils d'alerte d'exposition ;
- seuils d'alerte de levier ;
- seuils de drawdown ;
- scénarios de stress activés ;
- fréquence ou fraîcheur maximale des données acceptées.

Un seuil Risk dépassé constitue une **information de risque** destinée au Supervisor. Le blocage technique d'une commande appartient au Trading Firewall selon ses propres règles.

## Fonctionnement d'une analyse

1. Le Risk Engine reçoit une demande via le Router.
2. Il identifie les données nécessaires.
3. Il demande ces données aux modules concernés exclusivement via le Router.
4. Il vérifie leur disponibilité et leur fraîcheur.
5. Il calcule les métriques de risque.
6. Il produit un rapport structuré avec métriques, provenance, timestamp et éventuels avertissements.
7. Le rapport revient au Supervisor via le Router.
8. Le Supervisor conserve la responsabilité de la décision finale.

## États dégradés

Si une donnée indispensable est absente ou trop ancienne, le Risk Engine ne doit pas fabriquer une valeur. Le rapport doit indiquer explicitement que l'analyse est partielle ou indisponible et préciser la donnée manquante.

## Séparation Risk Engine / Trading Firewall

| Risk Engine | Trading Firewall |
| --- | --- |
| Analyse le risque | Sécurise le canal d'exécution |
| Produit métriques et alertes | Autorise ou bloque selon des règles techniques |
| Consomme Market Data / Indicators / Portfolio via Router | Contrôle les commandes du Trading Engine |
| N'exécute aucun ordre | Se trouve avant l'Exchange |
| Informe le Supervisor | Protège l'exécution |

## Sécurité

Le Risk Engine n'a pas besoin de manipuler directement les secrets API des Exchanges pour ses calculs. Les accès privés restent centralisés dans `Settings > API` et sont fournis uniquement aux composants qui en ont réellement besoin.

## Validation

Les calculs purs du prototype ont été testés sous Node.js 16.20.2. La validation end-to-end CP/1 sur la machine cible reste une étape distincte : elle concerne l'intégration runtime et ne change pas le fait que le module a été implémenté.
