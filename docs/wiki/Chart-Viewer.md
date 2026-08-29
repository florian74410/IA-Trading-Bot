# Chart Viewer

Le Chart Viewer affiche les séries de marché fournies par le Market Data Engine.

## Sélection

L'utilisateur choisit au minimum :

- la plateforme / source ;
- la paire ;
- le timeframe.

## Sources

Les connecteurs intégrés ou prévus dans l'architecture actuelle comprennent notamment Binance, GMX, Coinbase et OKX.

Le Chart Viewer doit utiliser les OHLC/OHLCV du connecteur sélectionné et afficher clairement la provenance des données.

## Cohérence avec les indicateurs

Lorsque l'utilisateur change d'exchange, le contexte transmis à l'Indicator Engine doit changer avec lui. Un graphique Coinbase ne doit pas calculer silencieusement ses indicateurs sur des chandeliers Binance.

## Volumes

Lorsque le connecteur fournit des volumes, ils sont ceux de la plateforme sélectionnée et restent distincts de ceux des autres marchés.

## Performance

Le graphique doit pouvoir apparaître rapidement sans précharger inutilement un historique massif. L'historique supplémentaire est récupéré selon les besoins de navigation et d'analyse.
