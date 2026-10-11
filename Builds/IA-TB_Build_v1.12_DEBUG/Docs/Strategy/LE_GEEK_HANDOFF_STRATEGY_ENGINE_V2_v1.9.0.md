# Handoff Le Geek — IA-TB v1.9

## Statut
IA-TB v1.9 finalise la migration Strategy Engine v2. Strategy v1 n'est plus un runtime du Core.

## Architecture
UI -> Router CP/1 (READ_ONLY) -> Strategy Engine v2.
Supervisor futur -> Router CP/1 -> Strategy Engine v2.

L'UI n'a aucun droit WRITE/EXECUTE sur le protocole. Le Router applique une allowlist stricte et retourne `UI_WRITE_DENY` pour toute commande non lecture.

## Commandes Strategy lisibles par l'UI
`strategy.health`, `strategy.capabilities`, `strategy.catalog`, `strategy.stats`, `strategy.state`.

## Strategy v2
Service 8018, CP/1, intentions BUY/SELL/HOLD, scoring, expiration, dry-run, statistiques, `strategy.signal/2.0`, aucune exécution Exchange.

## Travail GitHub pour Le Geek
1. Enregistrer v1.9 comme version majeure fonctionnelle Strategy v2.
2. Mettre à jour README, ROADMAP, Wiki Architecture et Wiki Admin.
3. Documenter la règle UI `READ_ONLY` et `UI_WRITE_DENY`.
4. Déposer le build complet fourni dans `/builds/v1.9/`.
5. Conserver le patch `v1.8.13 -> v1.9` dans la zone Updates/Patches appropriée.
6. Mentionner que le prochain chantier majeur prévu est Risk Manager v2 avant Supervisor.

## Invariant
Le visuel existant n'est pas redesigné par cette migration. Les changements app_v1.0.html concernent uniquement la source des données Strategy et la neutralisation des écritures UI.
