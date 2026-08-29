# Checklist de mise à jour IA-TB

Cette checklist doit être utilisée pour chaque nouvelle version.

## 1. Versionnage

- [ ] `from_version` défini
- [ ] `to_version` défini
- [ ] `from_version` correspond à la dernière source validée sur GitHub
- [ ] `from_version` correspond à la version installée ciblée
- [ ] Convention de versionnage respectée

## 2. Développement

- [ ] Dernier code source récupéré depuis `main`
- [ ] Nouvelle version développée à partir de cette source
- [ ] Changements prévus implémentés
- [ ] Aucun changement hors périmètre ajouté sans validation
- [ ] Si nouveau CEX/DEX : marchés/paires intégrés
- [ ] Si nouveau CEX/DEX : OHLC/OHLCV intégrés
- [ ] Si nouveau CEX/DEX : volumes intégrés
- [ ] Si nouveau CEX/DEX : Chart Viewer intégré
- [ ] Si nouveau CEX/DEX : Market Data intégré
- [ ] Si nouveau CEX/DEX : paramètres nécessaires ajoutés dans `Settings > API`
- [ ] Aucun secret codé en dur

## 3. Tests

- [ ] Tests fonctionnels OK
- [ ] Tests d'intégration OK
- [ ] Tests de non-régression OK
- [ ] Market Data vérifié
- [ ] Chart Viewer vérifié
- [ ] Données utilisateur préservées
- [ ] Secrets/configuration préservés

## 4. Patch

- [ ] Manifest valide
- [ ] `from_version` / `to_version` corrects
- [ ] Hashes vérifiés
- [ ] Installation testée sur une copie propre de la version source
- [ ] UpdateManager accepte le patch
- [ ] Version finale correcte après installation
- [ ] Rollback vérifié si applicable

## 5. CHANGELOG

- [ ] CHANGELOG mis à jour après validation des tests
- [ ] Ajouts documentés
- [ ] Modifications documentées
- [ ] Correctifs documentés
- [ ] Changements de configuration/API documentés

## 6. GitHub

- [ ] `main` contient le code source complet de la nouvelle version
- [ ] Le code commité est exactement celui qui a passé les tests
- [ ] Le patch est ajouté dans `Updates/Patches/`
- [ ] Le nom du patch indique version source -> version cible
- [ ] Rapport QA/manifest ajouté avec le patch lorsque pertinent
- [ ] Ancienne version récupérable par l'historique Git
- [ ] Aucun secret/coffre/token/log/base locale/donnée utilisateur envoyé
- [ ] `VERSION` correspond à la version du code source

## 7. Impact Wiki

- [ ] Pages impactées identifiées
- [ ] Ou `Wiki impact: NONE` explicitement indiqué

Pages à vérifier selon la version :

- [ ] Accueil
- [ ] Versionnage / Releases
- [ ] Connecteurs CEX / DEX
- [ ] Market Data
- [ ] Chart Viewer
- [ ] Indicator Engine
- [ ] Liquidity Engine
- [ ] Settings / API
- [ ] Architecture
- [ ] Sécurité
- [ ] Dépannage

## 8. Wiki

- [ ] Wiki mis à jour après synchronisation du code
- [ ] Documentation cohérente avec la version réellement présente sur GitHub
- [ ] Aucune fonction non publiée présentée comme disponible

## Validation finale

- [ ] **VERSION OK**

`VERSION OK + CODE OK + TESTS OK + PATCH OK + CHANGELOG OK + SOURCE GITHUB OK + PATCH GITHUB OK + WIKI IMPACT OK + WIKI OK`
