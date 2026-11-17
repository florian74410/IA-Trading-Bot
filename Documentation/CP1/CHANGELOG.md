# 2.6.0-dev.4 DEBUG — CP1 Integration Simulator

Base : 2.6.0-dev.3, commit Risk/OKX e115285a. Nouvelle branche : integration/iatb-2.6.0-dev.4.

- Consolidation fonctionnelle des divergences dev.2 ; conservation de la branche Supervisor déjà intégrée à Risk.
- Publication et découverte réelles des neuf Engines et de Supervisor, via les startup adapters existants et des identités par service.
- Registre SQLite persistant, contrats versionnés et qualification liée aux empreintes d’implémentation et de schéma.
- Schémas d’arguments vérifiés au Router et à l’Engine ; réponses et corrélations contrôlées avant résultat COMPLETED.
- Autorisations permanentes, temporaires et ONCE unifiées ; réservation atomique, révocation et invalidation de contrat.
- Gateway Supervisor et adaptateur d’outils ; sessions Auth21 bornées, refus des identités JSON et des commandes financières non qualifiées.
- Pont propriétaire OKX : compte du profil, ticket de lecture, contexte Auth21 vérifié par hash de session et protection des secrets.
- Scripts de gestion de services : identité propre au processus enfant, clé Core non héritée par UI.
- Supervisor Simulator CLI, scénarios versionnés, vraies communications interprocessus et fixtures limitées aux fournisseurs externes.
- Vérification de Risk, reprise des services, timeout, rejeu, concurrence, réponse invalide et maintien des verrous Trading/Firewall.
- Manifeste de build source complet, SHA-256, vérification de tous les fichiers et workflow CI dédié.

Les commandes non qualifiées demeurent bloquées ; les handlers cognitifs protégés conservent leur accès propriétaire et restent interdits aux outils génériques. Aucune activation LIVE ni modification de production.
