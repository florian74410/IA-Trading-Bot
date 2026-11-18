# IMPACT-001 — séparer les racines de code et de données

Statut : étude de deuxième passe avant correction. Le build repris est `1b6a01f0`, distribution historiquement marquée Rev2 mais migration Rev3 partielle. Aucun développement 3.0.2 identifiable n'a été trouvé dans les références examinées. La base qualifiée de comparaison reste `ef425e04`.

La migration de Fundamental a transformé un nom de répertoire de stockage dans `Core/Shared/paths.js`. Le test sur SQLite préexistante échoue : il ouvrirait un autre emplacement. Le générateur de migration interprétait tout segment portant le nom d'un Engine comme un chemin de code, même sous `SHARED_DATA`.

Décision : rétablir exactement `Shared Data/Fundamental` sans déplacer les données. Restreindre les transformations de segments aux préfixes de code enracinés dans App ; ne plus réécrire les labels internes de stockage. Ajouter un test ouvrant réellement la base préexistante, conservant un témoin et refusant la création du nouvel emplacement erroné. Aucune migration SQL nouvelle ni nouvelle API.

La migration a aussi changé le parent de la racine d'Indicators : service et Settings doivent continuer à utiliser App. Les définitions Custom/Quarantine historiques constituent des données modifiables distinctes des BuiltIn. Leur chemin existant doit être conservé explicitement, sans ancienne copie exécutable de l'Engine. Le mécanisme historique d'import de la base locale Fundamental doit conserver sa source originale, même après déplacement du code.

Alternative écartée : déplacer implicitement toutes les données dans Engines, car cela peut créer des bases vides ou perdre les définitions d'une installation existante. Une migration générale de stockage serait un chantier distinct avec inventaire, sauvegardes, journal transactionnel et rollback.

L'empreinte de qualification doit couvrir `Core/Shared/paths.js`, dépendance déterminante pour l'accès aux données. Son ajout au calcul existant ne donne aucune permission ; il impose une nouvelle qualification lorsque cette dépendance change. Les baselines historiques restent immuables. Validation : comparaison des 358 contrats, requalification CP1 existante et tests de préservation de données, puis répétition globale après second audit.

Rollback : restaurer le commit précédent pour le code sans restaurer aveuglément une ancienne base ; aucune donnée réelle n'est ouverte ou déplacée pendant cette mission. Les tests utilisent exclusivement des répertoires temporaires et identités fictives.
