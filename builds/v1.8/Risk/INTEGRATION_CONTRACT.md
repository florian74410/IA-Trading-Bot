# Risk Engine — contrat d’intégration v1.8

```text
Supervisor -> Router -> Risk Engine
Risk Engine -> Router -> Market Data Collector
Risk Engine -> Router -> Indicator Engine
Risk Engine -> Router -> Portfolio Module
Risk Engine -> Router -> Supervisor
```

Le Router est la frontière obligatoire et le normalisateur CP/1. Aucun appel Engine-to-Engine direct n’est autorisé.

Le Risk Engine produit uniquement des mesures, snapshots et avertissements. Il ne produit pas de BUY/SELL, APPROVE/REJECT et ne bloque pas le Trading Engine.

Market Data est requis pour une analyse complète. Indicator et Portfolio peuvent être absents pendant le développement : la réponse doit alors être signalée `DEGRADED` plutôt que fabriquer des données.

Le contrat `portfolio.snapshot` reste provisoire jusqu’à intégration du Portfolio Module v1.8.