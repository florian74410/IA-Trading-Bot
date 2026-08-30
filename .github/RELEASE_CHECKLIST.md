# Checklist de mise à jour IA-TB

Cette checklist doit être utilisée pour chaque nouvelle version.

## État de release — v1.7.9

- [x] Patch v1.7.9 publié dans `updates/v1.7.9/`.
- [x] Archive `Crypto Chart Viewer IA Trader.zip` publiée avec SHA-256.
- [x] `PATCH_MANIFEST.md` publié.
- [x] Test d'installation documenté dans `updates/v1.7.9/INSTALL_TEST_RESULT.md`.
- [x] Build complet publié dans `builds/v1.7.9/`.
- [x] Archive complète publiée dans `archives/IA-Trading-Bot_V1.7.9.zip` avec SHA-256.
- [x] La v1.7.9 a été utilisée comme source officielle vérifiée du passage UpdateManager vers v1.8.0.
- [ ] Validation runtime fonctionnelle complète sur la machine cible avant déclaration STABLE définitive.

**État : PATCH / BUILD / ARCHIVE v1.7.9 FINALISÉS.**

---

## État de release — v1.7.9 → v1.8.0

Dernière validation packaging effectuée le 30 août 2026.

### Versionnage

- [x] `from_version = 1.7.9`
- [x] `to_version = 1.8.0`
- [x] La source utilisée est l'archive officielle `archives/IA-Trading-Bot_V1.7.9.zip`.
- [x] SHA-256 de l'archive source vérifié avant génération du patch.
- [x] Convention de versionnage respectée.

### Patch / UpdateManager

- [x] Patch `1.7.9 -> 1.8.0` généré au format UpdateManager officiel.
- [x] `update_manifest.json` valide.
- [x] 61 fichiers déclarés et couverts par SHA-256.
- [x] Archive ZIP vérifiée sans erreur.
- [x] UpdateManager v1 de la v1.7.9 accepte le patch.
- [x] Installation effectuée sur une copie propre de la v1.7.9.
- [x] Version obtenue après installation : `1.8.0`.
- [x] Entrypoint obtenu : `Core/Server/server_v1.8.js`.
- [x] Le résultat installé correspond à `builds/v1.8` pour les fichiers applicatifs concernés.
- [x] Rapport `VALIDATION_REPORT.json` publié avec statut `PASS`.
- [x] Patch publié dans `updates/Patch_v1.7.9_to_v1.8.0/`.
- [x] Build source complet publié dans `builds/v1.8/`.

### Tests exécutés pendant la validation du patch

- [x] Validation effectuée sous Node.js `16.20.2`.
- [x] Vérification syntaxique du Risk Engine.
- [x] Test pur de calcul du Risk Engine réussi.
- [x] Vérification que le patch installé produit le build cible attendue.
- [ ] Test runtime complet sur macOS High Sierra / machine cible.
- [ ] Test end-to-end Router / CP/1 / Market Data / Indicators / Supervisor.
- [ ] Vérification mémoire / CPU sur MacBook Pro 2011.
- [ ] Validation fonctionnelle utilisateur de la v1.8 avant déclaration STABLE.

### Publication GitHub

- [x] Code et build v1.8 présents dans `main`.
- [x] Patch v1.8 présent dans `main`.
- [x] Manifeste, SHA-256, build info et rapport de validation présents avec le patch.
- [x] Aucun secret utilisateur requis pour générer ou valider le patch.
- [x] Branche de sauvegarde créée avant la validation finale.

**État : PATCH 1.7.9 → 1.8.0 FINALISÉ ET VALIDÉ PAR UPDATEMANAGER.**

**La v1.8 reste DEV jusqu'aux tests runtime sur la machine cible.**

---

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
