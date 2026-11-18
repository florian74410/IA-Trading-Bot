# Rapport final — IA-TB 3.0.1 Rev3 consolidée

## Références et périmètre

Source récente reprise : `1b6a01f012169bfd4d1034c0d9d19b20b2fc9284`. Référence qualifiée préservée : Rev2 `ef425e04182619e9992aa8a7368db2a30b2a0f87`. Branche : `maintenance/iatb-3.0.1-full-consolidation`. Le commit distribué exact est consigné dans BUILD.json et validé par le workflow CI attaché à ce commit.

Aucune véritable 3.0.2 identifiable n'a été trouvée ; le runtime reste 3.0.1-dev.1 et la distribution est 3.0.1_Rev3. Aucun Engine parallèle, fonction métier nouvelle, nouvelle autonomie financière, fusion dans main/Rev1/Rev2 ou déploiement VPS.

## Travaux terminés

Les dix Engines sont sous App/Engines/ : Trading, Firewall, Fundamental, Indicators, Liquidity, MarketData, Portfolio, Risk, Strategy et Supervisor. Les 393 fichiers du relevé Rev2 sont conservés dans leur emplacement cible. Les imports, racines de ressources, Process Registry, registres, lanceurs, CI, Docker et build sont adaptés. Les paramètres des ports et autorisations sont préservés.

Le blocage de base Fundamental est corrigé par restauration du chemin existant, sans migration de données. Les racines Indicators et ses données Custom/Quarantine sont séparées du code. Le calcul d'empreintes couvre désormais Core/Shared/paths.js. Un séparateur logique interprété comme chemin a été restauré par comparaison AST avec Rev2 ; un test interdit sa réintroduction. Les descriptions CP1 ont été restaurées exactement, sans masquer une divergence dans les baselines.

L'inventaire initial porte sur 1 225 fichiers suivis, 12 134 nœuds de fonctions, 372 sites d'exports et 1 497 liens d'import statiques. Ces mesures décrivent une analyse statique ; elles ne prétendent pas à une preuve formelle de chaque fonction ou chargement dynamique. L'inventaire courant et les cas conservés pour revue sont dans SOURCE_INVENTORY.json. Les exports déclarés des 301 fichiers JavaScript d’Engine comparés sont conservés ; les deux cycles statiques préexistants sont inchangés, aucun nouveau cycle détecté.

## Anomalies, deuxième passe et nettoyage

Les douze anomalies confirmées et leurs tentatives sont dans ANOMALIES.md/json. Le rapport IMPACT-001 étudie la persistance avant application : correction de compatibilité choisie, déplacement général de données écarté. IMPACT-002 traite le journal Trading inaccessible : diagnostic disponible, mutations bloquées et aucune base de secours. Les anciennes assertions de tests sont alignées sur le comportement actuel, sans modifier les permissions. IMPACT-003 corrige des exclusions Docker qui supprimaient l’attestation de sécurité et des helpers Compose ; les deux images sont construites et leur contenu vérifié en CI, sans démarrer les services. Les nouvelles fonctionnalités d'indicateurs/Supervisor et le packaging runtime séparé de l'ancienne branche d'audit restent hors du périmètre de consolidation ; le package complet demandé est livré.

Neuf fichiers suivis de résultats redondants ont été retirés, pour 1,740,614 octets bruts. La sortie de tests App/artifacts était déjà ignorée et régénérée ; elle n’est pas comptée comme suppression Git ni comme gain net. Les matrices intermédiaires intégrales sont récupérables au checkpoint Git `c7a7841c7c47ac63edf19f0a7973ec3ecf5a1ab3`. Les TAP de toutes les étapes, échecs compris, les synthèses de digests et la matrice détaillée finale restent conservés. Aucun fichier métier, test pertinent, migration SQL, base privée ou secret supprimé. Les fichiers anciens encore utilisés sont conservés.

Les gains bruts ne sont pas présentés comme une réduction nette de toute la documentation : les nouveaux inventaires et preuves ont un coût. SIZE_METRICS.json donne les périmètres locaux mesurés ; le workflow fournit package-metrics.json avec les octets exacts du checkout et du ZIP finaux. Le checkpoint avant nettoyage est plus volumineux en sources suivies, mais le ZIP enrichi de rapports et de correctifs peut grandir : une valeur négative de gain y désigne cette croissance. Les sorties de tests sont exclues du package exécutable, sans retirer les tests eux-mêmes.

## Qualification et comparaison

| Critère | Avant consolidation | Après corrections locales |
|---|---|---|
| Test de base Fundamental préexistante | FAIL reproduit | PASS, données retrouvées |
| Qualification globale | 407 PASS / 1 FAIL / 1 SKIP | 414 PASS / 0 FAIL / 1 SKIP |
| Scénarios Advanced OKX inclus | 80/80 PASS | 80/80 PASS |
| Contrats des dix Engines | 258 commandes / 51 qualifiées | 258 / 51, permissions et schémas conservés |
| Unités existantes des Engines | 3 échecs initiaux / assertions obsolètes, puis défaut SQLite atteint | 133 PASS / 0 FAIL, réseau loopback-only |
| Tests complémentaires calendrier | Référence Rev2 | 23 PASS |
| Racines et disposition | Migration partielle, défauts confirmés | Dix points d'entrée canoniques, audit PASS |
| Anciennes copies exécutables | Présentes avant reprise | Aucune après migration |
| Docker | Exclusions préexistantes trop larges | Contrôle du contenu et builds réels obligatoires en CI |
| Navigateur et package extrait | Non exécutables localement / à construire | Obligatoires en CI, résultats attachés au commit livré |

Le SKIP local concerne un UID OS non privilégié non disponible. Le workflow Ubuntu exécute ce cas et les deux parcours Chromium, puis vérifie l'archive extraite avec la suite CP1 réelle et un broker fictif. Les nombres sont des exécutions, certaines suites se recoupent ; les 80 scénarios ne sont pas ajoutés une seconde fois au total.

La qualification locale porte sur le working tree corrigé ; les empreintes de ses sources sont conservées. La validation définitive de la livraison est le résultat du workflow **IA-TB 3.0.1 Rev3 full consolidation qualification** pour le commit de BUILD.json. Le rapport local n'est pas attribué rétroactivement au commit de reprise. Les sources runtime sont gelées pour cette validation.

## Preuves et livraison

- [Second audit](POST_CONSOLIDATION_AUDIT.md), [arborescence](ARCHITECTURE_VALIDATION.md), PATH_MIGRATION.json.
- [Requalification CP1](../Architecture/Rev3/CP1_REQUALIFICATION.md), CP1_FINAL_COMPARISON.json, matrice par commande et synthèses intermédiaires.
- [Qualification](QUALIFICATION.md), Results/final-local/summary.json, SOURCE_INVENTORY.json, ENGINE_INVENTORY.md/json et FEATURE_MATRIX.json.
- [Suppressions](DELETIONS.md) et DELETIONS.json, ANOMALIES.md/json et IMPACT_REPORTS/.
- [Workflow GitHub Actions](https://github.com/florian74410/IA-Trading-Bot/actions/workflows/iatb-301-consolidation.yml).

Le constructeur produit IA-TB-3.0.1_Rev3_Consolidated_FULL-SOURCE_VPS.zip, son SHA-256 et BUILD.json. Deux constructions doivent être identiques ; les empreintes de chaque fichier sont vérifiées. Les rapports synthétiques et sources de tests sont inclus ; les JSON/TAP/captures générés sont fournis séparément par Git et les artifacts CI. Les sources extraites font l'objet d'une nouvelle qualification CP1 avec les dépendances épinglées.

## Limites et retour arrière

Validation exclusivement simulée : aucun ordre réel ou Demo, aucune utilisation de clé personnelle, aucun appel OpenAI payant. L'accès effectif d'un compte OKX EU à chaque instrument n'est pas prouvé ; les limites Advanced OKX Rev2 demeurent. Les commandes non qualifiées restent refusées aux agents. La création libre d'indicateurs par le Supervisor n'est pas ajoutée.

Le rollback utilise une release séparée et la version précédente conservée, après arrêt propre de la nouvelle. Ne pas restaurer aveuglément une ancienne base si une opération était incertaine ; conserver les journaux, réservations, namespaces et données privées. Aucun déplacement de données réelles ou intervention VPS n'est effectué ici.
