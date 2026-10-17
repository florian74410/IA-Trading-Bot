# Source IA-TB

Cette arborescence est le point de départ de la source unique. Elle a été initialisée depuis Builds/IA-TB_Build_v2.0_DEBUG/ en conservant les chemins relatifs nécessaires aux scripts Node.js et à start.command.

Refactorisation progressive prévue : Core, Engines, Adapters, Frontend, Shared, Config. Ne déplacer les moteurs qu'après analyse des import/require et tests. Le dossier Builds conserve les instantanés historiques.

NodeRuntime/install_runtime.command sont des scripts historiques Mac ; Docker utilisera un runtime Linux adapté après audit des dépendances et tests. Ne pas exécuter start.command tel quel dans Docker.
