# v1.8 UpdateManager pipeline

La v1.8 doit etre produite depuis la v1.7.9 via un package UpdateManager (`from_version: 1.7.9`, `to_version: 1.8.0`), puis le resultat complet est publie dans `builds/v1.8`.

Regle pour les prochaines versions : le build publie est le resultat complet apres application du patch, et l'archive de patch est conservee dans `updates/`.
