# Data Collector Firewall — v1.7.9

Le **Data Collector Firewall** protège le `Supervisor` contre des données de marché incohérentes, absurdes, périmées, mal formées ou provenant d'une source non autorisée.

## Position

```text
Providers / CEX / DEX
        ↓
Market Data Collector
        ↓
Data Collector Firewall
        ↓
Supervisor
        ↓
Indicator / Strategy / Risk / IA
```

Il reprend le même fonctionnement de base que le Trading Firewall :

> Intercepter → Lire → Comprendre → Comparer → Décider → Rapporter

Mais ses règles sont spécifiques aux données de marché. Il ne valide pas des ordres de trading.

## Modes

- `PROTECTION` : une donnée invalide est rejetée avant le Supervisor.
- `OBSERVATION` : la donnée est laissée passer mais le Firewall rapporte qu'elle aurait été rejetée.
- `enabled=false` : inspection désactivée, passage direct.

## Contrôles v1

- whitelist des providers ;
- whitelist des types de données ;
- provenance obligatoire ;
- fraîcheur et timestamp futur ;
- taille maximale du payload ;
- symbole valide ;
- validation des nombres ;
- prix strictement positif ;
- cohérence OHLC (`High >= O/C/L`, `Low <= O/C/H`) ;
- volume non négatif ;
- détection de saut de prix anormal par provider + symbole ;
- contrôle bid/ask et warning de spread excessif ;
- détection de doublons par empreinte SHA-256 dans une fenêtre courte.

## Technologie

Le service est volontairement léger pour le Mac cible : Node.js natif (`http`, `crypto`), aucune dépendance supplémentaire et aucune base de données.

Le service écoute par défaut sur `127.0.0.1:8018`. Les appels inter-services peuvent être protégés par la clé interne existante via `x-ia-tb-internal-key` (`IATB_INTERNAL_SERVICE_KEY`).

Contrairement au Trading Firewall, ce premier Data Collector Firewall ne signe pas chaque message par HMAC. Sa sécurité v1 repose sur l'isolation localhost + la clé de service interne ; son cœur est surtout la validation sémantique et structurelle des données.

## API locale

- `GET /health`
- `GET /status`
- `POST /configure`
- `POST /inspect`

## Format recommandé d'un message

```json
{
  "provider": "KRAKEN",
  "type": "OHLCV",
  "symbol": "BTC/EUR",
  "timeframe": "1m",
  "timestamp": 1788076800000,
  "provenance": "KRAKEN_NATIVE",
  "data": [[1788076800000, 100, 105, 99, 103, 12.5]]
}
```

## Décision

Réponse possible :

- `PASS` : donnée valide ;
- `WARN` : anomalie non bloquante ou mode Observation ;
- `REJECT` : donnée bloquée en mode Protection.

Le branchement définitif doit garantir que tout flux `Market Data Collector → Supervisor` passe par ce composant avant livraison au Supervisor.
