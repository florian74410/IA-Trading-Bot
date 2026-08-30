# Roadmap

La source officielle de suivi est `ROADMAP.md` à la racine du dépôt. Cette page Wiki en présente la lecture fonctionnelle ; les cases de validation doivent toujours être prises depuis le fichier racine.

## Version stable

La dernière version déclarée stable est la v1.7.8.

## v1.7.9 — en développement

Les trois objectifs fonctionnels principaux sont CoinGecko API, Blockchain.com API et DefiLlama API. Leur intégration technique est largement réalisée, mais leur validation finale sur la machine cible reste ouverte.

La v1.7.9 comprend également le Market Data Collector Kraken + GMX, le prix consensus, la source virtuelle `ƒx Consensus`, le catalogue central des commandes Market Data et la documentation de leurs règles de provenance.

### Points restant ouverts

- validation CoinGecko sur la machine cible ;
- recentrage Blockchain.com sur le rôle Bitcoin / on-chain retenu puis validation ;
- validation DefiLlama sur la machine cible ;
- affichage UI détaillé du prix consensus et des prix sources ;
- validation réseau Kraken + GMX ;
- validation end-to-end de `ƒx` avec les flux réels ;
- vérification de `ƒx` lors de la migration des connecteurs historiques dans le Collector ;
- tests globaux, stabilité et consommation mémoire ;
- packaging UpdateManager, build et archive finale ;
- déclaration STABLE uniquement après toutes les validations.

## Documentation v1.7.9

Le Wiki documente désormais les rôles de CoinGecko, Blockchain.com et DefiLlama, le Collector, le consensus prix, `ƒx`, les règles de volume/provenance, la sécurité CoinGecko dans `Settings > API` et l'intégration du Chart Viewer.

## Règle de clôture

Une fonctionnalité n'est pas considérée validée parce que son code ou sa documentation existe. La case correspondante dans `ROADMAP.md` ne passe à `[x]` qu'après le niveau de vérification demandé. Une version ne devient STABLE qu'après fonctions, tests, documentation, packaging et vérification finale.

## Passage v2.x

Le passage de `v1.x` à `v2.x` reste réservé à la phase suivant la période de test/développement.
