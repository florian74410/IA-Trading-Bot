# Risk Engine

## Rôle

**Risk Engine :8019** est un moteur analytique de risque. Dans DEBUG 1.12, son manifeste runtime est actif et dépend du Router, avec Market Data, Indicator et Portfolio comme dépendances optionnelles.

Il ne possède aucun adapter Exchange.


> **Lecture rapide :** l'essentiel est ci-dessus. Les détails sont disponibles sans quitter la page.

<details>
<summary><b>➕ En savoir plus — détails techniques</b></summary>

## Calculs

Le cœur calcule notamment : risque d'une position, perte théorique au stop, capital à risque, notionnel/marge/levier, exposition brute, concentration, PnL latent, drawdown historique, volatilité logarithmique/annualisée, VaR historique 95/99 %, Expected Shortfall et score synthétique 0–100.

Le résultat porte un niveau **VERY_LOW / LOW / MODERATE / HIGH / CRITICAL** et des warnings selon les seuils configurés.

> Le score est une mesure analytique, pas une prédiction de performance.

## CP/1

- `risk.position.analyze`
- `risk.portfolio.analyze`
- `risk.strategy.analyze`
- `risk.snapshot`
- `risk.settings.get/set`
- `risk.list_capabilities`

Il consomme `portfolio.snapshot`, `market.candles` et `indicator.analysis`, puis produit `risk.analysis/0.1`.

## Position dans la chaîne

Le code Risk porte encore la mention `ANALYTICAL_ONLY` / `NO_ORDER_APPROVAL_OR_BLOCKING`. Parallèlement, Trading exige un `risk_approval_id` pour ses commandes mutantes. Le Wiki distingue donc **analyse Risk actuelle** et **chaîne d'approbation d'exécution**, qui doit rester explicitement orchestrée par les couches supérieures plutôt que supposée.


</details>
