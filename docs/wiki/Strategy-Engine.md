# Strategy Engine v2

## État

Dans **DEBUG 1.12**, Strategy v2 est **ACTIVE** sur **8018**. Il remplace le moteur historique pour les communications machine-to-machine.

## Rôle

Strategy reçoit des snapshots `market`, `indicators`, `fundamental` et `portfolio`, évalue une ou plusieurs stratégies et produit une agrégation BUY/SELL/HOLD ainsi qu'un éventuel `strategy.signal/2.0`.

## Invariant de sécurité

Le moteur **n'exécute aucun ordre** et ne contient aucun adapter Exchange. Les signaux portent `execution.allowed=false`.

```text
Market + Indicators + Fundamental + Portfolio
                     │
                     ▼
                Strategy v2
                     │
              strategy.signal
                     │
                     ▼
                  Risk / Supervisor
```

## CP/1

`strategy.health`, `capabilities`, `catalog`, `validate`, `evaluate`, `dry_run`, `stats`, `state`, `reload`, `pause`, `resume`, `reset_stats`.

Les événements sont `strategy.signal.generated` et `strategy.evaluation.completed`.

## Compatibilité

Les stratégies schema v1 d'`Annexes/Strategies` sont converties en mémoire vers v2 sans réécrire automatiquement le fichier original.

## Supervisor-ready

Le moteur est conçu pour être appelé via Router par le futur Supervisor. Le Supervisor ne doit pas dépendre des anciennes routes Core de stratégie.
