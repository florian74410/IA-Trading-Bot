# IA-TB v1.11.7 — Fundamental Event Engine Integration

- Integrated Le Geek Fundamental Event/Scoring patch originally targeting v1.11.1 onto current v1.11.6 base.
- Fundamental Event Engine and Corroboration/Scoring remain internal subprocesses: no new service and no new port.
- Fundamental database schema migration v5 (additive).
- Extended Fundamental CP/1 commands/events while preserving historical commands.
- Fundamental remains INFORMATION_ONLY and has no trading authority.
- Preserves v1.11.2–v1.11.6 Trading-IA, Market Data, timeframe and health stabilization changes.

# v1.11.6 — Timeframe & Health Stabilization

- Force un rafraîchissement Market Data lors d’un changement de symbole/timeframe afin d’éviter toute réutilisation d’un snapshot précédent.
- Vérifie l’espacement réel des bougies contre le timeframe demandé côté Market Data Provider. Une réponse incohérente est refusée au lieu d’afficher silencieusement des bougies 1m sous 1h/4h.
- Le statut Trading IA affiche maintenant le timeframe demandé et reçu.
- Les labels temporels 1h/4h affichent date + heure afin de rendre le changement d’échelle visible.
- Stabilise les probes Admin: timeout porté à 2,6 s pour les Engines, 4 s pour l’UI et 4,2 s pour Core/Router, avec une seconde tentative sur timeout/reset.
- Un timeout de probe est marqué DEGRADED au lieu d’être présenté comme un arrêt certain.

# v1.11.5 — Native Chart Render Repair

- Répare la jonction directe Router/Market Data -> UI Trading-IA -> Moteur Graphique IA-TB.
- Corrige la panne racine du Canvas v1.1: perte du contexte `this` pendant le calcul de l’échelle des séries prix, qui levait une TypeError dès qu’une bougie devait être dessinée.
- Le graphique accepte et dessine désormais un snapshot d’une seule bougie au lieu de rester vide.
- Le polling réinjecte le lot complet de bougies reçu et peut donc reconstruire/backfiller l’historique après une réponse partielle.
- Normalisation OHLCV défensive côté UI sans ajouter de service, Engine ni port.
- Le changement de contexte efface les anciennes bougies afin d’éviter un affichage périmé.
- Ajoute un état de diagnostic de rendu: reçues, normalisées, acceptées et rendues.
- Le statut Market Data affiche le nombre réel de bougies reçues.
- Native Chart Engine passe en v1.2.0.
