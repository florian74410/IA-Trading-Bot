# Protocole de versionnage et de release IA-TB

Version du protocole : 1.0

Ce document définit la procédure obligatoire pour toute nouvelle version de IA-TB.

## Ordre officiel

1. **Versionnage**
   - Définir immédiatement `from_version -> to_version`.
   - Vérifier que `from_version` correspond exactement à la version installée ciblée.
   - Toute modification fonctionnelle, structurelle ou corrective entraîne une nouvelle version selon la convention du projet.

2. **Développement**
   - Implémenter uniquement les changements prévus pour la version.
   - Pour chaque nouveau CEX/DEX, intégrer en parallèle : marchés/paires, OHLC/OHLCV, volumes, provenance des données, Chart Viewer et Market Data.
   - Tous les paramètres requis par un connecteur (clé, secret, passphrase, token, identifiant, endpoint ou équivalent) doivent être configurables dans `Settings > API`. Aucun secret ne doit être codé en dur.

3. **Tests**
   - Tests fonctionnels.
   - Tests d'intégration.
   - Tests de non-régression.
   - Vérification des connecteurs et des Market Data concernés.
   - Vérification que les données utilisateur et secrets ne sont pas altérés par la mise à jour.

4. **Construction et validation du patch**
   - Générer le manifest avec `from_version` et `to_version` corrects.
   - Calculer et vérifier les hashes des fichiers du patch.
   - Tester le patch avec l'UpdateManager réel sur une copie propre de la version source.
   - Vérifier installation, version finale et mécanisme de rollback lorsqu'il s'applique.
   - Une erreur de type `Version source incompatible` bloque la release.

5. **CHANGELOG**
   - Documenter uniquement les changements réellement validés.
   - Séparer au minimum : Ajouts, Modifications, Correctifs, Sécurité/Configuration, Compatibilité.

6. **Déploiement GitHub**
   - Déployer uniquement si le code, les tests, le patch et le CHANGELOG sont validés.
   - La version déposée doit correspondre strictement à la version validée.

7. **Analyse d'impact Wiki**
   - Identifier les pages Wiki impactées par la release.
   - Pour chaque release, inscrire explicitement soit la liste des pages à modifier, soit `Wiki impact: NONE`.

8. **Mise à jour du Wiki**
   - Mettre à jour uniquement la documentation correspondant à une fonctionnalité effectivement publiée.
   - Ne jamais documenter comme disponible une fonction encore seulement prévue.
   - Les changements de connecteurs doivent au minimum être reflétés dans les pages Connecteurs, Market Data et Settings/API lorsqu'elles sont impactées.

## Condition de release

Une release n'est considérée comme terminée que si :

`VERSION OK + CODE OK + TESTS OK + PATCH OK + CHANGELOG OK + GITHUB OK + WIKI IMPACT OK + WIKI OK = RELEASE OK`

## Règle spécifique CEX / DEX

Tout connecteur doit être autonome sur ses données de marché. L'application conserve la provenance exacte des données afin qu'un marché provenant d'un exchange ne soit pas silencieusement remplacé par celui d'un autre exchange.

Chaque nouveau CEX/DEX doit donc fournir, lorsque l'API de la plateforme le permet :

- liste des marchés/paires ;
- prix et données de marché ;
- OHLC/OHLCV ;
- volumes propres à la plateforme ;
- état du provider / health check ;
- intégration Chart Viewer ;
- intégration Market Data ;
- paramètres privés dans `Settings > API` ;
- test de connexion lorsque pertinent.

Si une donnée n'est pas fournie directement par la plateforme, l'adaptateur doit documenter clairement la méthode de reconstruction ou la limitation.
