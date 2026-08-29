# Liquidity Engine

Le Liquidity Engine analyse les informations de liquidité disponibles pour le marché sélectionné.

## Objectif

Fournir un contexte complémentaire aux indicateurs de prix : activité, profondeur ou informations de liquidité lorsque le connecteur les expose.

## Source

Comme pour Market Data, toute métrique reste rattachée à son exchange ou protocole. Une liquidité provenant de GMX, Binance, Coinbase ou OKX ne doit pas être présentée comme une donnée globale sans agrégation explicitement définie.

## Intégration

Le contexte d'exchange choisi dans le Chart Viewer et le Trading Engine doit être propagé au Liquidity Engine lorsque l'analyse concerne ce marché.
