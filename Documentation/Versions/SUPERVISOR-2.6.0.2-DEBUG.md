# Supervisor / CP1 Registry — v2.6.0.2 DEBUG

Base: branche 2.6 (2.6.0-dev.1). Ne pas fusionner en RELEASE.

## Livré dans ce commit

- Demandes de privilège ONCE, TEMPORARY (60–86400 s) ou PERMANENT, enregistrées dans SQLite.
- Approbation/refus uniquement par une identité administrateur vérifiée, jamais par le Supervisor.
- Refus des contrats absents, modifiés, non vérifiés, hard_deny ou de risque HIGH/CRITICAL.
- Consommation transactionnelle des permissions ONCE, expiration des TEMPORARY et révocation.
- Journal d'audit des demandes, décisions et consommations.

## Important : travail restant avant un build qualifié

- Raccorder l'identité de l'administrateur aux sessions réelles (ne pas faire confiance au JSON client).
- Intégrer les vérifications atomiques aux points d'exécution Router ET Engine ; l'API consumePermission ne doit pas être appelée à l'avance depuis un client.
- Harmoniser les privilèges permanents existants de manager.grant() avec les nouveaux grants et leur révocation.
- Faire publier et signer les snapshots de tous les Action Blocks Engines, vérifier chaque handler et décrire tous les paramètres.
- Implémenter Paramètres > IA > Registre CP/1 : catalogue, recherche, création/suppression de déclarations, politiques, demandes et audit.
- Tests unitaires et d'intégration, contrôle des races, CI Node 22, package/build, recette DEBUG et rollback.

**État : développement partiel non testé sur VPS ; aucun déploiement ni activation LIVE.**
