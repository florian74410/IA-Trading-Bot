# Base de consolidation

Source récente préservée et publiée avant correction : `1b6a01f012169bfd4d1034c0d9d19b20b2fc9284`. Branche : `maintenance/iatb-3.0.1-full-consolidation`. Elle reprend les quatre migrations intermédiaires sans les attribuer à une qualification globale Rev3. La Rev2 `ef425e04` et toutes les branches précédentes restent inchangées.

La branche `chore/iatb-3.0.1-runtime-cleanup-audit` diverge avant les correctifs Advanced OKX et contient trois fichiers supplémentaires de packaging runtime. Son âge/nom ne remplace pas la source récente. Elle n'est pas fusionnée aveuglément. Aucun développement 3.0.2 n'a été identifié dans les branches consultées ; la version runtime reste 3.0.1-dev.1 et la consolidation vise la distribution 3.0.1_Rev3.

Qualification locale AVANT correction : 407 exécutions PASS, 1 FAIL, 1 SKIP, 80/80 scénarios avancés PASS. L'échec est une référence ancienne dans le test d'entrée HTTP Auth21 ; le SKIP est le test UID non privilégié indisponible dans ce conteneur. Test supplémentaire SQLite de préservation de la base Fundamental : FAIL reproduit. Navigateur local bloqué par les sockets Unix ; une validation CI réelle est nécessaire.

Inventaire initial : 1 225 fichiers suivis, 11 589 483 octets, 12 134 nœuds de fonctions, 372 sites d'assignation d'exports et 1 497 liens d'import relatifs statiques ; aucun échec de parsing. Les comptes incluent les tests et preuves historiques et ne constituent pas une preuve de lecture humaine exhaustive de chaque fonction. Les chargements dynamiques restent explicitement à examiner.
