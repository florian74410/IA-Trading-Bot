# Builds STABLE — branche main

Ce dossier contient exclusivement les builds declares **STABLE** du projet IA-TB.

Regles :
- aucun build WIP, DEBUG ou experimental ici ;
- un build n'entre dans `main/builds` qu'apres validation fonctionnelle, tests, documentation et packaging ;
- chaque build doit etre range dans `builds/vX.Y.Z/` ;
- conserver l'archive officielle et son SHA-256 quand disponible ;
- ne jamais remplacer silencieusement un build stable deja publie.

La branche `debug` contient le build de developpement courant. La branche `Save` conserve l'historique des productions de builds et patchs.