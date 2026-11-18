# Livraison complète — IA-TB 3.0.2 Rev-X

## Source et contenu

Branche : `release/iatb-3.0.2-Rev-X-full-source`. Elle contient l’intégralité du dépôt applicatif et la consolidation de `c0e94a1c9be92282f04e0e2f1db647277e10b2b1`, pas un patch à appliquer séparément. Le commit final exact et chaque empreinte de source figurent dans BUILD.json du package. Runtime `3.0.2-dev.1`, distribution `3.0.2_Rev-X`, statut DEBUG.

La création de cette version suit la demande explicite de l’utilisateur. Le [rapport de consolidation 3.0.1](../Consolidation-3.0.1/FINAL_REPORT.md) documente les anomalies, étapes, racines persistantes, nettoyages et preuves initiales. Ses références de version et de qualification sont historiques ; la nouvelle version reçoit ses propres tests et artifacts.

## Travaux intégrés

- Dix Engines canoniques sous App/Engines/, 393 fichiers initiaux préservés ; Core, Router, UI et Frontend restent séparés. Aucun second Supervisor ou Trading Engine.
- Compatibilité de la base Fundamental existante et des définitions Indicators Custom/Quarantine ; aucune migration de données réelles.
- Auth21, signatures/rejeu, isolation propriétaire, consentement Risk, Firewall obligatoire, outbox et réconciliation préservés. Une indisponibilité du journal Trading reste bloquante et diagnostiquable, sans base de secours.
- Neuf snapshots de matrices redondantes supprimés : 1 740 614 octets bruts, récupérables au checkpoint c7a7841c. Les TAP, synthèses et matrice finale par commande restent conservés. Une sortie ignorée régénérée n’est pas comptée comme suppression Git.
- Exclusions Docker précises : attestation de sécurité et helpers Compose conservés ; données privées, node_modules hôte, artifacts et suites unitaires restent hors de l’image.
- VERSION, manifest, package/lockfile et current_release synchronisés pour 3.0.2 Rev-X ; constructeur complet existant et préflight adaptés. Les dépendances npm restent épinglées aux mêmes versions.
- Représentation des clés EVM/Bitcoin nouvellement générées complétée à 32 octets, sans changer le scalaire, l’adresse, le générateur ou les validations d’import. Contre-exemples déterministes et seconde passe IMPACT-004 documentés ; données existantes intactes. Ces dépendances sont incluses dans les empreintes financières et requalifiées.
- Versions des contrats conservées indépendamment de la version de l’application. Un test vérifie les 258 fonctions, permissions et schémas lors d’un changement de version ; aucun baseline historique modifié.
- Test graphique corrigé : attendre la stabilisation des timestamps et géométries des rendus après redimensionnement, tout en conservant les assertions de pan/zoom/alignement et l’absence de recalcul inutile.

## Qualification bloquante

Le workflow **IA-TB 3.0.2 Rev-X complete build qualification** répète l’audit complet, les imports, Python/Shell/JSON/YAML, versions, Compose, les deux builds Docker hors exécution de services, la qualification intégrale de sécurité/CP1/80 scénarios et Chromium desktop/mobile, ainsi que les 69 fichiers d’unités Engine. Les suites se recoupent ; les comptes ne sont pas présentés comme des cas uniques additionnés.

Il reconstruit deux fois l’archive, vérifie son inventaire et son SHA-256 puis lance la qualification CP1 depuis les sources réellement extraites. Le résultat attaché au commit de BUILD.json est la qualification définitive. Le workflow fournit les JSON/TAP/captures, la matrice des 258 contrats et les mesures exactes du checkout/ZIP, avec gains négatifs explicitement traités comme croissance.

Rapports : [qualification](QUALIFICATION.md), [continuité CP1](CP1_CONTINUITY.md), SOURCE_INVENTORY.json et ENGINE_INVENTORY.json. Les preuves précédentes restent dans Documentation/Consolidation-3.0.1/ et Documentation/Architecture/Rev3/.

## Limites et rollback

Validation financière exclusivement simulée, pas de preuve de disponibilité de tous les instruments d’un compte OKX EU réel. Les commandes non qualifiées restent indisponibles aux agents. Pas de création libre d’indicateurs, d’autonomie financière nouvelle, d’ordre réel/Demo, d’appel OpenAI payant, de fusion dans les branches précédentes ni de déploiement VPS.

Conserver la release précédente, les données privées, les namespaces, journaux et opérations incertaines pour retour arrière. Les secrets/TLS/bases privées et dépendances installées ne sont pas distribués ; installer les dépendances épinglées et utiliser une release séparée. La recette sur le compte utilisateur et le déploiement constituent des opérations distinctes non effectuées.
