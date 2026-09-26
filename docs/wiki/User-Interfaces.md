# Interfaces et navigation

## Principe

La UI est un service distinct sur **8000**. Elle dépend de Core et Router mais ne doit pas réimplémenter les Engines. Les pages sont des vues spécialisées sur les mêmes services backend.

## Trading IA
Workspace marché : exchange/market de référence, graphique natif, indicateurs et mosaïque. Voir [Trading IA](Trading-IA.md).

## Fundamental
Vue événements, sources, contexte, diagnostics et synthèses du Fundamental V3. Elle présente l'information ; elle ne transforme pas un article en ordre.

## Strategy
Interface de consultation/gestion Strategy v2. Le moteur canonique reste le service :8018 via Router.

## Portfolio
Vue balances, positions, historique et statistiques. Les connexions wallet restent soumises aux confirmations externes.

## Settings
Configuration applicative et coffre API. Les secrets ne doivent pas être renvoyés aux autres pages.

## Admin
Supervision des services, CP/1, logs, Firewall et diagnostics. La documentation opérateur détaillée est dans [Administration](Administration.md).

## Companion
Le widget IA est global, déplaçable et contextualisé par page sans hériter automatiquement des privilèges de la page Admin.

## Chart Viewer
Le build conserve aussi des composants Chart Viewer historiques. Le workspace Trading IA v1.12 utilise le **moteur graphique natif IA-TB** pour son flux principal ; les documents historiques TradingView ne doivent pas être confondus avec ce chemin actif.
