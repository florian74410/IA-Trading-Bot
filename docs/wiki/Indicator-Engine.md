# Indicator Engine

L'Indicator Engine calcule les indicateurs techniques à partir des données normalisées fournies par Market Data.

## Principe

Le moteur reçoit un contexte comprenant au minimum la source, la paire, le timeframe et les chandeliers.

Les indicateurs basés uniquement sur le prix utilisent les OHLC/OHLCV de la source sélectionnée. Les indicateurs utilisant le volume doivent utiliser le volume correspondant à cette même plateforme, sauf stratégie explicitement conçue pour comparer plusieurs sources.

## Exemples d'indicateurs

- moyennes mobiles ;
- RSI ;
- MACD ;
- Ichimoku ;
- ATR ;
- bandes de Bollinger ;
- indicateurs volume lorsque les données nécessaires sont disponibles.

## Règle de reproductibilité

Un signal doit être traçable : source, paire, timeframe et données utilisées doivent pouvoir être retrouvés dans les logs ou le contexte de calcul.
