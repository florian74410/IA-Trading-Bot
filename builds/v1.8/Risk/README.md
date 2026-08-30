# Risk Engine — IA-TB v1.8 DEV

Le Risk Engine est un moteur **strictement analytique**. Il calcule une représentation quantitative des risques pour le Supervisor mais ne valide, ne refuse, ne modifie et n'exécute aucun ordre.

## Communication

Toutes les communications inter-modules passent en **CP/1 via le Router**. Le Risk Engine ne contacte jamais directement un CEX/DEX, Market Data, Indicator Engine, Portfolio ou Trading Engine.

Dépendances :
- `market_data / market_data.get` : requise pour l'analyse de marché ;
- `indicator / indicator.analyze` : contexte optionnel, mode dégradé si absent ;
- `portfolio / portfolio.snapshot` : contrat provisoire et optionnel tant que le Portfolio Module n'est pas finalisé.

## Capacités CP/1

- `risk.health`
- `risk.list_capabilities`
- `risk.position.analyze`
- `risk.portfolio.analyze`
- `risk.strategy.analyze`
- `risk.snapshot`

## Mesures

Notionnel, marge, levier, perte théorique au stop, capital à risque, exposition brute, concentration, PnL latent, drawdown, volatilité logarithmique/annualisée, VaR historique 95/99 %, Expected Shortfall 95/99 %, score synthétique et avertissements.

Port par défaut : **8019** (`IATB_RISK_ENGINE_PORT`). Node.js 16, zéro dépendance npm.

Les seuils du score synthétique sont des heuristiques de développement et devront être calibrés avant une version STABLE.