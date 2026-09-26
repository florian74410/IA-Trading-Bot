# IA-TB v1.11.2 — Native Chart Repair

Scope strict: moteur graphique de **Trading IA**. Les pages Settings/Strategy multipages et le Chart Viewer TradingView externe ne sont pas modifiés.

## Correctifs

- La barre supérieure pilote réellement le contexte du moteur natif: exchange, symbol, timeframe, nombre de bougies et niveaux S/R.
- Chaque changement symbol/timeframe incrémente une génération Market Data. Toute réponse d'une ancienne génération est ignorée afin qu'un ancien poll 1m ne puisse plus réécrire un nouveau graphique 1h/4h.
- Le choix 100/150/200/300/500 bougies appelle directement `setVisibleCount()`.
- Le changement de contexte vide les overlays Indicator Engine devenus obsolètes et force une nouvelle analyse sur le contexte courant.
- Les indicateurs `display.pane=separate` disposent de panneaux dédiés, distincts du volume.
- Les bornes déclarées par l'Indicator Engine sont respectées (`0..100`, `-100..0`) et les autres indicateurs utilisent une échelle dynamique.
- Le volume conserve un panneau séparé.

## Chemin de données conservé

`Trading IA -> UI Gateway -> Router -> Firewall Data -> Market Data Collector -> Native Chart Engine`

L'Indicator Engine reste l'unique calculateur des indicateurs. Le moteur graphique n'exécute aucun ordre et ne recalcule pas les indicateurs métier.
