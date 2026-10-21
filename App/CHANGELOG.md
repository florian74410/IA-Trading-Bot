# Changements de la source 2.4

## 2.4.2-R1 DEV

- **Modifications** : copie source allégée ; anciens builds, archives, plans et maquettes inutiles retirés.
- **Nettoyage** : 42 fonctions privées sans consommateur, objets/écriture sans lecteur et un import retirés ; stub Liquidity obsolète supprimé, contrat CP/1 courant testé.
- **Correctifs de cohérence** : VERSION, npm, manifest et pointeur de lancement alignés en 2.4.2, révision R1 ; audit runtime délié de la version 2.0.0.
- **Sécurité/configuration** : contrats CP/1, migrations, Auth21 et Firewall conservés ; état généré exclu de Git. Aucune donnée privée d'une autre installation effacée.
- **Validation** : audit de source et de dépendances, suites métier, tests d'entrées/snapshots et Firefox. Voir `../Documentation/Cleanup/2.4.2-R1/RESULTS.md`.
- **Compatibilité** : recette sur copie propre ; aucune fausse archive incrémentale de suppression pour l'UpdateManager historique. Aucun déploiement ou promotion stable.

## 2.4.1 DEV

Calendrier responsive et lignes d'événement transparentes ; alignement Crypto ;
Swap/Bridge, coffres et prêts suspendus ; 51 lectures normalisées CP/1 pour
Supervisor et contexte partagé de onze familles. Base qualifiée par 583 tests CI.

## 2.4.0 DEV

Finance Calendar JSON, provenance et attribution, UI défilante ; Trading Logs V2
réintégré avec masquage des deux écritures, reprise SQLite et protections snapshot.

[Changelog antérieur](https://github.com/florian74410/IA-Trading-Bot/blob/189e9c09f1549dd8f2f73bb62c62fc19d6f31d15/App/CHANGELOG.md)
