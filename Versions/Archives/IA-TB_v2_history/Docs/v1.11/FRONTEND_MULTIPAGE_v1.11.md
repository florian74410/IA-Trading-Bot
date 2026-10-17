# IA-TB v1.11 — Frontend Multipage

Objectif: supprimer la dépendance de routage entre Trading IA, Settings et Strategy.

Routes physiques:
- `/ia-trading` -> `Frontend/Pages/app_v1.0.html`
- `/settings` -> `Frontend/Pages/settings_v1.11.html`
- `/strategy` -> `Frontend/Pages/strategy_v1.11.html`
- `/chart-viewer` -> TradingView existant

Garanties:
- Settings et Strategy sont des documents HTML indépendants; ils ne contiennent ni `chartBox`, ni `tvChart`, ni le dashboard Trading IA.
- Settings dialogue uniquement avec les contrats API exposés par UI Gateway. USER_WRITE reste autorisé par la politique serveur.
- Strategy dialogue avec Strategy Engine v2 via `/communication/v1/ui/read` et reste READ_ONLY.
- Le visuel reprend les composants/classes de la v1.10.1 pour conserver l'identité IA-TB.
