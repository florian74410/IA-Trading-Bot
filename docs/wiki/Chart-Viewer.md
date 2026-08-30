# Chart Viewer

Le Chart Viewer affiche les séries de marché fournies par le Market Data Engine en conservant leur source.

## Sélection

L'utilisateur choisit au minimum la plateforme / source, la paire et le timeframe.

## Sources natives

Les connecteurs intégrés ou historiques comprennent notamment Binance, GMX, Kraken, Coinbase, OKX et Hyperliquid. Le graphique doit utiliser les OHLC/OHLCV de la source sélectionnée et afficher clairement leur provenance.

Lorsque le connecteur fournit un volume natif, ce volume reste celui de la plateforme sélectionnée et n'est pas fusionné silencieusement avec celui d'un autre marché.

## Source virtuelle ƒx — v1.7.9

Le sélecteur Exchange du graphique Trading IA propose désormais `ƒx`. Cette source ne représente pas un exchange : elle affiche les bougies consensus calculées à la demande par le Market Data Collector.

En mode `ƒx` :

- OHLC = moyenne des bougies sources valides et temporellement alignées ;
- volume = somme des volumes natifs comparables disponibles ;
- la paire canonique doit correspondre strictement ;
- la provenance des sources utilisées et exclues reste disponible côté Market Data ;
- le navigateur passe par `GET /api/market/fx-klines` ;
- le rafraîchissement est fixé à 15 secondes afin de rester léger.

Le graphique n'invente jamais un volume pour une source qui n'en fournit pas.

## Prix consensus

Le Collector expose également `GET /price/consensus`, qui conserve les prix individuels et leur provenance. L'affichage UI détaillé du prix consensus et des prix sources reste un objectif à intégrer/valider dans la v1.7.9.

## Cohérence avec les indicateurs

Lorsque l'utilisateur change de source, le contexte transmis aux moteurs consommateurs doit changer avec lui. Un graphique Coinbase ne doit pas calculer silencieusement ses indicateurs sur des chandeliers Binance.

## Performance

Le graphique doit apparaître rapidement sans précharger un historique massif. L'historique supplémentaire est récupéré selon les besoins. La source `ƒx` ne conserve pas d'historique consensus supplémentaire en mémoire.

## Validation restante v1.7.9

Le mode `ƒx` doit encore être validé end-to-end avec les flux réels sur la machine cible et revérifié à mesure que Binance, Coinbase, OKX et d'autres connecteurs rejoignent le registre courant du Collector.
