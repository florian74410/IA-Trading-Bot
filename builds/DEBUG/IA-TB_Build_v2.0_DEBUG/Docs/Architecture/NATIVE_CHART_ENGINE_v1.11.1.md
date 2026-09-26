# IA-TB Native Chart Engine v1.11.1

## Décision
IA Trading View n'utilise plus TradingView Lightweight Charts. Le rendu est maintenant assuré par un moteur Canvas2D propriétaire IA-TB.

## Sources de données
`UI /ia-trading -> UI Gateway -> Router CP/1 -> Firewall Data -> Market Data Collector`.
Le Trading Engine et IA Trading View continuent donc à travailler sur la même source de données de marché.

## Fonctions v1
- chandeliers OHLC ;
- volume ;
- zoom molette ;
- déplacement horizontal ;
- réinitialisation double-clic / Agrandir-Restaurer ;
- crosshair ;
- niveaux support/résistance ;
- lignes d'indicateurs Indicator Engine ;
- panneaux secondaires d'indicateurs ;
- zones de liquidité ;
- marqueurs IA/Strategy.

## Séparation avec Chart Viewer
La page `Chart Viewer` reste volontairement basée sur TradingView comme outil externe de consultation. Cette modification concerne uniquement `IA Trading View`.

## Sécurité
Le moteur graphique est une couche de visualisation. Il ne possède aucune capacité d'exécution d'ordre.
