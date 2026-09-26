# IA-TB Strategy Engine v2 — v1.9.0

Strategy Engine v2 remplace le moteur de stratégie historique comme moteur canonique pour les communications machine-to-machine. Les anciennes API Core restent temporairement présentes uniquement pour compatibilité avec l'interface existante.

## Invariant de sécurité

Strategy Engine v2 produit uniquement des intentions `strategy.signal/2.0`. Il ne contient aucun adapter Exchange, n'exécute aucun ordre et marque chaque signal `execution.allowed=false`. Toute exécution future doit passer par Router → Risk Manager → Trading Firewall → Trading Engine.

## Interface Supervisor-ready

Port local: 8018. Transport: CP/1. Cible Router: `strategy`.

Commandes: `strategy.health`, `strategy.capabilities`, `strategy.catalog`, `strategy.validate`, `strategy.evaluate`, `strategy.dry_run`, `strategy.stats`, `strategy.state`, `strategy.reload`, `strategy.pause`, `strategy.resume`, `strategy.reset_stats`.

Événements: `strategy.signal.generated`, `strategy.evaluation.completed`.

`strategy.evaluate` accepte les snapshots `market`, `indicators`, `fundamental` et `portfolio`, ainsi qu'une liste facultative `strategy_ids`. La réponse contient l'agrégation BUY/SELL/HOLD, le détail par stratégie et éventuellement un signal standardisé.

## Compatibilité v1

Les stratégies `schema_version: 1` stockées dans `Annexes/Strategies` sont converties en mémoire vers le modèle v2. Les fichiers existants ne sont pas réécrits automatiquement.

## Futur Supervisor

Le Supervisor ne doit jamais appeler les anciennes routes `/api/strategy/*` du Core. Il devra émettre une requête CP/1 `strategy.evaluate` via le Router et transmettre le résultat au Risk Manager. `correlation_id` permet de suivre toute la chaîne.
