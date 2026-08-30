# Test d'installation v1.7.8 -> v1.7.9

Date : 2026-08-29
Branche : `debug`
Workflow : `v1.7.9 Install Test`
Run GitHub Actions : `33275061718`
Commit teste : `eafcf261889af2a5c2c97d2394dfd52b4b3b6e44`

## Resultat

**PASS**

Le test a :

- construit l'archive de patch v1.7.9 ;
- valide l'archive avec UpdateManager ;
- installe le patch dans une copie temporaire de `builds/v1.7.8` ;
- confirme la cible `1.7.9` et `restartRequired=true` ;
- execute `UserData/self_test.js` ;
- confirme OpenAI -> Vault, X -> Vault, Binance/OKX/Kraken -> Data Service/Vault ;
- confirme que le Core actif ne contient plus la logique RSA legacy ni de reference active au nom de l'ancien coffre ;
- confirme la presence et l'integration fonctionnelle de l'asset Auth v1.7.9 ;
- confirme que `user.dat`, `config_v1.0.dat` et l'ancien coffre de test restent intacts pendant la copie du patch ;
- confirme que la migration de l'ancien coffre est reportee au premier login reel afin de pouvoir le dechiffrer avant import dans SQLite.

Archive generee pendant ce run :

`Crypto Chart Viewer IA Trader.zip`

SHA-256 du run CI :

`e65b26552025af8fa5d8e3a972bf235cc5cc911f3f89160eeedc52ca13b47405`

## Limite du test

Ce test a ete execute sur GitHub Actions / Ubuntu. Il valide le format du patch, UpdateManager et les self-tests applicatifs, mais **ne remplace pas** le test final sur macOS High Sierra / Node 16.20.2, notamment pour `better-sqlite3` et le comportement du navigateur cible.
