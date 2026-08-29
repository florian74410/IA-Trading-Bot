# Roadmap

La roadmap décrit les directions du projet sans transformer une idée en fonctionnalité publiée.

## Objectif connecteurs

À terme, IA-TB vise une large couverture des CEX et DEX pertinents.

Tout nouveau connecteur doit respecter le même contrat :

- Market Data ;
- OHLC/OHLCV ;
- volumes propres ;
- Chart Viewer ;
- Indicator Engine lorsque pertinent ;
- paramètres requis dans `Settings > API` ;
- documentation ;
- tests et health check.

## Priorité structurelle

Préférer un connecteur autonome et légèrement redondant à une intégration qui réutilise silencieusement les données d'une autre plateforme.

## Idées exploratoires

Des sources globales, oracles décentralisés ou agrégateurs peuvent être étudiés plus tard comme couches complémentaires. Ils ne remplacent pas actuellement les données propres aux connecteurs.

## Passage v2.x

Le passage de la branche de développement `v1.x` à `v2.x` est réservé à la phase suivante lorsque l'application sortira de sa période de test/développement.
