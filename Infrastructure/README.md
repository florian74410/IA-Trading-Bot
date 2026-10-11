# IA-TB — Infrastructure GEN-1

Déploiement cible Contabo Debian 13, Docker Engine/Compose.

- App/ : copie de travail du build v2.0_DEBUG, arborescence interne conservée pour ne pas casser les chemins relatifs.
- builds/ : builds historiques conservés, inchangés.
- Infrastructure/ : scripts et manifests de déploiement validés progressivement.
- /opt/iatb/source/IA-Trading-Bot : clone Git sur GEN-1.
- /opt/iatb/debug et /opt/iatb/release : instances séparées.
- /var/lib/iatb/debug et /var/lib/iatb/release : états persistants hors Git.

IMPORTANT : App/ n'est pas encore refactorisée en App/Engines, App/Adapters et App/Shared : déplacements à réaliser après audit des chemins et tests de démarrage. Aucun conteneur prêt pour la production n'est déclaré.

DEBUG et RELEASE ne doivent partager ni comptes, ni clés, ni volumes. Aucun trading réel dans DEBUG.
