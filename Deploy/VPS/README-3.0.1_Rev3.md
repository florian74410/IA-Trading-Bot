# Installation documentaire — 3.0.1 Rev3 consolidée

Aucun déploiement VPS n’est réalisé par cette mission. Distribution DEBUG, runtime Node 22.x ; package complet `IA-TB-3.0.1_Rev3_Consolidated_FULL-SOURCE_VPS.zip`. Vérifier SHA-256, BUILD.json et le workflow CI du commit exact avant toute installation.

Les procédures de préparation Auth21, TLS, sauvegardes et arrêt propre de la [procédure précédente](README-3.0.1_Rev1.md) restent applicables. Les dix points d’entrée sont maintenant sous App/Engines/ ; les lanceurs et Process Registry sont adaptés. Core, UI et Frontend gardent leurs emplacements.

Installer les dépendances avec `npm ci --omit=dev --no-audit --no-fund` dans App, puis exécuter depuis la racine `bash Deploy/VPS/preflight.sh --source-only`. Ce contrôle de sources ne démarre aucun service et n’autorise aucune transaction. Les fichiers TLS privés, clés, bases et node_modules ne sont jamais fournis par l’archive.

Conserver les données de l’installation et ses namespaces propriétaires : notamment Shared Data/Fundamental, et les définitions Indicators historiques. Ne pas déplacer ces données dans Engines. Préparer une release séparée et conserver l’ancienne pour rollback. La configuration d’exécution financière et la recette utilisateur nécessitent une intervention distincte sur l’installation.

[Qualification](../../Documentation/Consolidation-3.0.1/QUALIFICATION.md) · [Arborescence](../../Documentation/Consolidation-3.0.1/ARCHITECTURE_VALIDATION.md) · [Risques et rollback](../../Documentation/Consolidation-3.0.1/FINAL_REPORT.md).
