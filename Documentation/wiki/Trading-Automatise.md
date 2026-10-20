# Trading automatisé — architecture cible IA-TB

> **Statut (2026-10-20) : spécification de conception, non implémentée entièrement.** Ne change pas l'état du déploiement R1. Les essais de nouvelles fonctions se feront d'abord en local. Le trading réel reste désactivé.

## Objectif

Permettre deux origines de décision (stratégie automatisée et futur **Direct AI Trading**) sans dupliquer le moteur d'exécution, sans contourner Risk ni le Trading Firewall, et sans imposer une refonte à chaque nouveau broker.

## Parcours commun validé

```text
Strategy Engine ───────┐
                       ├→ Supervisor → Router → Risk Manager
Direct AI Trading ─────┘                      │
                                    Autorisation / refus
                                             │
                                          Router
                                             │
                                       Trading Firewall
                                             │
                                        Trading Engine
                                             │
                                         Broker / API
                                             │
                              événements → Portfolio Engine
```

Les retours, notifications et communications interservices empruntent le Router selon les contrats CP/1. `ORDER_ACCEPTED` n'est **pas** synonyme d'ordre exécuté ; suivre aussi exécutions partielles, rejets, confirmations et états finaux.

## Responsabilités

| Composant | Responsabilités |
|---|---|
| Strategy / Direct AI (futur) / Supervisor | Produire et porter une intention de trading |
| Router | Transport/routage CP/1, corrélation |
| Risk Manager | Limites, exposition, décision et autorisation de risque |
| Trading Firewall | Authenticité, permissions, fraîcheur, politiques de sécurité et filtrage des requêtes |
| Trading Engine | Ordres et annulations, normalisation, validation technique exchange, suivi des fills, idempotence effective, réconciliation |
| Portfolio | Comptabilisation des positions, soldes et événements confirmés |
| Journal local Trading Engine | Traçabilité technique/métier locale des étapes d'exécution |

Le contrôle de doublon métier doit être conçu comme **une seule responsabilité logique** et ne pas recalculer deux fois coûteusement la même empreinte : le Firewall filtre les requêtes suspectes, le Trading Engine garantit durablement l'**idempotence effective**, y compris après crash et ambiguïté réseau.

## Brokers : état existant et compléments

**Existant** : `executor_catalog.json` + `registry.js` chargent les exécutants des adaptateurs Binance, OKX, Kraken, GMX ; chaque adaptateur possède un `executor.js` et un `capabilities.json`. Pour intégrer un nouvel exchange standard, créer l'adaptateur, déclarer ses capacités et l'enregistrer au catalogue : pas de modification nécessaire du noyau tant que le contrat courant suffit.

**À renforcer** : tests de conformité systématiques (capabilités réellement implémentées, modes de marché et erreurs), support des particularités CEX/DEX et des futures sans généraliser abusivement les contrats.

## Trading logs v2 — objectif local au Trading Engine

Actuellement `history-store.js` écrit des événements normalisés en `trading_history.jsonl` et les transmet à Portfolio via CP/1. Il **ne stocke pas les communications CP/1 complètes en base SQLite**. La persistance interne du Portfolio n'est pas documentée ici comme vérifiée.

Évolution future : module versionné **`trading_logs_v2.js`**, base **`trading_logs.db`** en SQLite WAL, conservation des messages métier utiles et états d'exécution horodatés, index de corrélation (`trace_id`, `decision_id`, `risk_approval_id`, `request_id`, `client_order_id`, `exchange_order_id`, `execution_id`). Ajouter un formatter qui transforme les enregistrements bruts en timeline lisible sans altérer le journal source. Filtrer secrets, jetons et données sensibles. Gérer reprise, migrations, rétention et robustesse aux erreurs disque avant activation.

Ce journal n'est **pas** un registre d'audit transverse ; les autres Engines pourront y être reliés lors de leur amélioration ultérieure.

## Gestion des clés et GMX

Le `SecretProvider` du Trading Engine n'est actuellement qu'une interface qui rejette `get(exchange)` : le lien vers le coffre API de l'application **reste à construire**. Viser un accès minimal, borné par utilisateur, compte, broker, opération et durée, autorisé côté serveur, sans révéler les secrets dans CP/1 ou les logs. Un signataire isolé est préférable lorsqu'il est adapté à l'exchange.

GMX demande un signataire wallet EIP-712 encore non injecté dans le moteur. Son branchement est différé à l'itération WalletConnect / intégration wallet, avec validation des permissions, du réseau, des frais et des confirmations.

## Runtime et gouvernance

Prévoir un service Trading Engine autonome, supervisé, arrêt propre et contrôle d'administration limité au rôle **ADMIN**. Une désactivation explicite par ADMIN ne doit pas déclencher de redémarrage automatique intempestif. Tests locaux avant déploiement, et aucun ordre réel durant la phase de conception.

## Convention de nommage transversale

**snake_case (`_`) pour les noms internes de fichiers/dossiers de tout IA-TB lors d'une future itération**, avec inventaire complet des chemins et références (imports, `require`, manifests, packaging, scripts, CI, tests, Compose, documentation). Ne pas renommer les identifiants externes et contrats d'API par simple cosmétique. Migration atomique + tests complets. Voir `ROADMAP.md`.
