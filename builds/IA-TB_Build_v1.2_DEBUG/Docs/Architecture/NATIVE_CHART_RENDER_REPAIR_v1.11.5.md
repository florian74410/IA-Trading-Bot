# IA-TB v1.11.5 — Native Chart Render Repair

## Flux conservé

`Market Data Collector -> Router -> Firewall Data -> UI Gateway -> Trading-IA -> Native Chart Engine`

Aucun service, Engine ou port supplémentaire n’est créé.

## Contrat de rendu

Le frontend reçoit `candles[]` du Market Data Collector via le Router, valide uniquement la structure OHLCV de base, puis transmet directement les lignes au `IATBChartController`. Le renderer Canvas ne choisit pas l’exchange et ne récupère aucune donnée réseau lui-même.

## Réparation

La panne principale était dans `draw()`: un `forEach(function(){...})` utilisait `this.series` sans transmettre le contexte `this`. Dès qu’au moins une bougie arrivait, le renderer levait une `TypeError` avant de tracer le chandelier. La v1.11.5 lie explicitement le contexte du contrôleur.

La v1.11.4 pouvait afficher l’OHLC courant tout en laissant le graphique vide si la première réponse ne contenait qu’une bougie: `renderInteractiveChart()` exigeait au moins deux lignes et le polling ne consommait ensuite que la dernière bougie de chaque réponse. La v1.11.5 accepte une bougie et fusionne le lot complet retourné à chaque poll, ce qui permet de reconstituer l’historique dès qu’il devient disponible.

## Diagnostics

`window.IATBChartRenderState` et `IATBChartController.getRenderState()` exposent les compteurs reçus/acceptés/visibles/rendus pour isoler rapidement une rupture entre Market Data et Canvas.
