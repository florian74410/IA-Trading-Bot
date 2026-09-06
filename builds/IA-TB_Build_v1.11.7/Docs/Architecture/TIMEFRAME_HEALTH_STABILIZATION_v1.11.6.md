# IA-TB v1.11.6 — Timeframe & Health Stabilization

## Trading IA / timeframe

Le changement de timeframe reste dans la chaîne existante, sans nouveau service ni nouveau port :

`Trading IA -> UI Gateway -> Router -> Firewall Data -> Market Data Collector -> Provider -> Chart Engine`

Lors d'un changement de symbole ou de timeframe, le premier chargement force maintenant un refresh du contexte Market Data. Le Provider mesure l'espacement médian entre les timestamps des bougies et le compare au timeframe demandé. Une réponse incohérente (par exemple 1 minute reçue pour une requête 1 heure) est refusée au lieu d'être dessinée sous un mauvais label.

Le statut Trading IA expose `demandé <tf> / reçu <tf>` et les axes 1h/4h affichent date + heure.

## Health Admin

Les probes Admin étaient trop courts pour le Mac cible. v1.11.6 utilise 2,6 s pour les Engines, 4 s pour l'UI et 4,2 s pour Core/Router, avec une seconde tentative sur timeout/reset. Un timeout final est classé `DEGRADED` plutôt qu'un arrêt certain.
