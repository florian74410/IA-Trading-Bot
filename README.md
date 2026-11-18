# IA-Trading-Bot — 3.0.2 Rev-X DEBUG

Consolidation du build Advanced OKX le plus récent et migration des dix Engines vers `App/Engines/`. Le runtime reste `3.0.2-dev.1` ; `App/REVISION` identifie la distribution `3.0.2_Rev-X`. La consolidation est intégrée à la version 3.0.2 demandée par l’utilisateur, sans nouvelle autonomie financière.

[Rapport de consolidation](Documentation/Consolidation-3.0.2/FINAL_REPORT.md) · [Qualification et limites](Documentation/Consolidation-3.0.2/QUALIFICATION.md) · [Second audit](Documentation/Consolidation-3.0.1/POST_CONSOLIDATION_AUDIT.md) · [Requalification CP1](Documentation/Architecture/Rev3/CP1_REQUALIFICATION.md)

## Architecture active

| Composant | Chemin | Responsabilité |
|---|---|---|
| Core / Auth21 | `App/Core/` | Identité, coffre propriétaire, autorisations et délégations signées |
| Router CP1 | `App/Core/Router/` | Transport contrôlé Core → Router → Engine → réponse |
| Function Registry | `App/Core/FunctionRegistry/` | Contrats, empreintes, découverte et qualifications |
| Firewall | `App/Engines/Firewall/` | Frontière de protection Trading et MarketData |
| Fundamental | `App/Engines/Fundamental/` | Sources, publications et contexte informationnel |
| Indicators | `App/Engines/Indicators/` | Calculs et définitions déclaratives, sans JavaScript arbitraire |
| Liquidity | `App/Engines/Liquidity/` | Analyse de liquidité |
| MarketData | `App/Engines/MarketData/` | Collecte et données de marché |
| Portfolio | `App/Engines/Portfolio/` | Ledger et projections privées par propriétaire/compte |
| Risk | `App/Engines/Risk/` | Diagnostics et contraintes d'exécution |
| Strategy | `App/Engines/Strategy/` | Définitions et évaluations, sans ouverture automatique d'ordres |
| Supervisor | `App/Engines/Supervisor/` | Supervisor Engine, ChatBot LOCAL/HYBRID, Gateway, mémoire et CognitiveRuntime |
| Trading | `App/Engines/Trading/` | Ordres manuels confirmés, adaptateurs, outbox et réconciliation |
| Interfaces | `App/UI/` et `App/Frontend/` | Gateway et Companion ; restent hors des Engines |

Les points d'entrée et ports sont définis par `App/Core/ProcessRegistry/manifests/`. Il n'existe aucun deuxième Supervisor ou Trading Engine. Les anciennes copies exécutables ont été retirées.

## Données et compatibilité

Le déplacement du code ne déplace pas les données : `IATB_DATA_ROOT`, les namespaces propriétaires et les bases existantes conservent leur sens. Fundamental retrouve `Shared Data/Fundamental/fundamental.db`. Les anciennes données locales Fundamental et les dossiers partagés Indicators Custom/Quarantine restent des emplacements de données explicitement reconnus, sans ancienne implémentation exécutable.

Les informations inconnues restent `null` et `N/C`. Les avertissements Risk manuels requièrent un consentement explicite lié à la demande exacte ; authentification, signatures, fonds/instruments nécessaires, arrêt d'urgence et ambiguïtés pouvant dupliquer une mutation restent impératifs.

## Développement et qualification

Node.js **22.x** et les dépendances de `App/package-lock.json` sont requis. Depuis le dépôt :

```bash
cd App
npm ci --omit=dev --no-audit --no-fund
node Tools_validate_release_version.js
```

La qualification complète est orchestrée par `node App/Tools/qualify_revision.js artifacts/consolidation-validation` depuis la racine. Les outils de parsing Acorn/acorn-walk et le navigateur sont installés séparément du runtime ; le workflow [qualification 3.0.2 Rev-X](.github/workflows/iatb-302-revx.yml) donne les versions et variables exactes. Il répète aussi les audits, vérifie les scripts VPS en mode source uniquement, construit deux ZIP identiques et requalifie les services depuis le package extrait.

Tous les tests financiers utilisent un broker, des identités, clés et prix fictifs. Les tests du LLM utilisent MOCK ; aucun ordre réel/Demo, appel OpenAI payant ou déploiement VPS n'est effectué par cette qualification.

## Build et démarrage

```bash
python3 Tools/Build/build_rev1_full_source.py
python3 Tools/Build/verify_source_bundle.py artifacts/IA-TB-3.0.2_Rev-X_Consolidated_FULL-SOURCE_VPS.zip
```

Le nom historique du constructeur est conservé pour les appelants existants ; il valide la révision et l'inventaire complet. `BUILD.json` lie la distribution au commit et aux empreintes des sources. Les bases privées, secrets, dépendances installées et sorties générées ne sont pas embarqués. Les résumés de qualification et les sources des tests sont distribués ; les logs détaillés sont disponibles dans Git et les artifacts CI.

Le lancement local existant passe par `App/start_auth21_local_safe.command` et les scripts VPS documentés dans [Deploy/VPS/README-3.0.2_Rev-X.md](Deploy/VPS/README-3.0.2_Rev-X.md). Ils exigent les données Auth21 et TLS propres à l'installation. Lire le rapport et les prérequis avant une installation ; aucun démarrage VPS n'est réalisé pendant cette livraison.

## Capacités et limites

[Trading manuel OKX](Documentation/Trading/OKX_CAPABILITY_MATRIX.md) : Market/Limit/Post-only/IOC/FOK compatibles, gestion d'ordres et algorithmes, levier et positions éligibles, plans confirmés. La qualification simulée ne prouve pas l'accès d'un compte réel OKX EU à tous les marchés. Les agents restent interdits de mutation financière autonome.

Les commandes non qualifiées restent indisponibles aux agents CP1. La création libre d'indicateurs pilotée par le Supervisor et les autres développements métier futurs ne sont pas ajoutés pendant cette consolidation. Les versions historiques des composants et les contrats indépendants restent documentés dans leurs archives.

[Anomalies et décisions](Documentation/Consolidation-3.0.1/ANOMALIES.md) · [Suppressions et restauration](Documentation/Consolidation-3.0.1/DELETIONS.md) · [Inventaire des Engines](Documentation/Consolidation-3.0.1/ENGINE_INVENTORY.md)
