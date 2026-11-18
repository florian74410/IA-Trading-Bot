# Validation de l'arborescence

Les dix Engines disposent d'un seul point d'entrée canonique sous App/Engines/. Les 393 fichiers recensés dans le gel Rev2 sont retrouvés dans la nouvelle structure ; PATH_MIGRATION.json donne chaque correspondance. Le document historique App/services/fundamental-engine/CONTRACT.md a été conservé sous Documentation/Legacy/Fundamental-Service-CONTRACT.md.

Core, Router, Auth21, Function Registry, UI et Frontend restent hors d'Engines. Le Supervisor conserve tous ses sous-modules, dont ChatBot, CognitiveRuntime, Memory, Gateway et Supervisor Engine. Les anciens répertoires exécutables ne contiennent plus de code actif ; aucune copie parallèle ni wrapper vers une vieille implémentation.

Le Process Registry, les lanceurs Shell, Docker, les tableaux de chemins de tests, le générateur de registres et le constructeur de package utilisent les nouveaux points d'entrée. Les imports statiques sont résolus depuis leurs fichiers appelants. Les ressources dépendant de __dirname et les racines dérivées ont été contrôlées, notamment les deux racines Indicators et les fixtures CP1.

Les exceptions de persistance sont explicites dans Core/Shared/paths.js : données historiques Fundamental et Indicators. Ces emplacements ne sont pas des sources d'Engine. Les tests ouvrent réellement une base préexistante et retrouvent les définitions personnalisées sans nouvelle base vide. Les snapshots et namespaces propriétaires restent protégés.

Les audits examinent tout l'arbre actif et les configurations, puis la CI répète le contrôle sur le commit publié et dans l'archive extraite. Les références historiques de Git et les archives documentaires sont distinguées des chemins actifs. Une absence de résultat textuel seule n'a jamais autorisé une suppression.

La comparaison des exports déclarés des 301 fichiers JavaScript d’Engine présents dans l’inventaire initial ne relève aucune disparition ni modification d’affectation d’export. Les deux composantes cycliques statiques préexistantes (Core Snapshot et ChatBot state/procedures) sont identiques après normalisation des chemins ; aucun nouveau cycle statique. Les chargements dynamiques restent couverts par les services réels et suites existantes, sans prétendre à une preuve statique formelle. Voir Results/source-graph-comparison.json.
