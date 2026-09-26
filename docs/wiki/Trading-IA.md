# Trading IA

## Ce que voit l'utilisateur

Trading IA est le workspace central de marché. Dans DEBUG 1.12, la colonne **Exchange / Market** à droite sert de référence pour toute la page.

```text
┌─────────────────────────────────────────────┬──────────────┐
│ Marché / paire / timeframe                  │ Exchange     │
│                                             │ Markets      │
│          IA-TB Native Chart                 │              │
│                                             │              │
├─────────────────────────────────────────────┤              │
│ Dock indicateurs externes au graphique      │              │
├─────────────────────────────────────────────┤              │
│ Mosaïque horizontale : données/trades/etc.  │              │
└─────────────────────────────────────────────┴──────────────┘
```

## Flux des bougies

```text
Provider → Market Data → Firewall Data → route UI → Trading IA → Chart natif
```

Il n'existe volontairement **aucun raccourci provider→graphique**. OHLCV appartient au Market Data Collector ; la UI est read-only vis-à-vis des candles.

## Changement d'exchange

La sélection d'exchange pilote le catalogue de symboles et les requêtes Market Data. Les données affichées doivent garder leur provenance. Le changement symbole/timeframe force le rafraîchissement nécessaire pour éviter de réutiliser un snapshot de contexte précédent.

## Chart Engine

Le moteur natif IA-TB gère candles, zoom/pan, séries/panes d'indicateurs, niveaux et marqueurs. Il accepte un snapshot d'une seule bougie et peut reconstruire l'historique à partir des lots reçus.

## Commandes IA visuelles

L'IA peut demander des changements **déclaratifs** : symbole, timeframe, viewport, indicateurs, niveaux, marqueurs ou disposition de mosaïque. Elle ne peut pas modifier les valeurs OHLCV. Les actions navigateur utilisent le mécanisme Browser ACK lorsqu'elles passent par le Router.

## Mosaïques

La zone basse est destinée aux modules d'information de la paire et des trades. Les définitions de mosaïque sont déclaratives ; HTML/CSS/JS arbitraires sont interdits dans le format de stockage.
