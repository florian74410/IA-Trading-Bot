# IA-TB 2.6 — Core Function Registry Manager

Le **Function Registry Manager** est une brique de Core, pas un Engine. Les fichiers `Functions.json` et `VERSION.json` sont déclarés dans chaque Engine au moyen du générateur `App/Tools/FunctionRegistry/generate.js`, à exécuter pour toute mise à jour de contrat CP/1.

`manager.js` utilise `better-sqlite3` déjà présent dans `App/package.json`, avec SQLite WAL, cache mémoire, contrôle d'identité de l'Engine à l'import, refus par défaut, révocation sur modification de contrat, historique d'audit et gestion d'autorisation par agent. Utiliser une DB privée hors de Git dans DEBUG.

**ATTENTION** : ces contrats sont inventoriés depuis `App/Core/Communication/ProtocolRegistry/*.json` ; les types et sorties inconnus sont explicitement marqués `unknown`, les descriptions manquantes sont des placeholders. Tant qu'un handler n'est pas validé, `verified_handler=false`, donc aucun ALLOW n'est possible.

**À terminer pour qualifier le build complet :** adapter chaque vrai service à la publication de snapshots CP/1 authentifiés (et à la notification à chaque modification), brancher le Core aux routes CP/1 réelles, exposer l'API ADMIN authentifiée pour l'UI Privilèges, vérifier les permissions à CHAQUE appel côté Router et Engine, audit complet, tests runtime, CI, déploiement DEBUG et rollback. Aucun des contrats documentaires ne permet d'appeler directement une opération de trading.

Ne pas activer Mode Direct IA Trading avant recette du contrôle d'exécution et du Risk Engine.
