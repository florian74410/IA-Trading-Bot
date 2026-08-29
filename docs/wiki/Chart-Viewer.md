# Chart Viewer

Le Chart Viewer affiche les séries de marché en conservant le choix explicite de la source CEX/DEX.

## Sélection des données

Le Chart Viewer doit pouvoir sélectionner :

- le connecteur / exchange ;
- la paire ;
- le timeframe ;
- les données OHLC/OHLCV fournies par le Market Data associé.

## Cohérence avec les moteurs

Lorsque le Chart Viewer utilise une source donnée, les moteurs d'analyse associés doivent recevoir la même identité de marché afin d'éviter les mélanges silencieux entre exchanges.

## Ajout d'un CEX / DEX

Tout nouveau connecteur doit être pris en charge par le Chart Viewer dans le même cycle de version que son intégration Market Data, lorsque ses données de marché permettent l'affichage de chandeliers.
