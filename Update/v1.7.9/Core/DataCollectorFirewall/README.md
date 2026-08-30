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

## Settings

La configuration utilisateur est prévue dans :

```text
Settings
└── Protection
    └── Firewall
        ├── Trading Firewall
        └── Data Collector Firewall
```

Le Data Collector Firewall expose sa page locale sur `127.0.0.1:8018/settings`. Cette page peut être intégrée dans Settings et permet à la fois de configurer **chaque règle** et de lancer le debug du Firewall sans quitter la page de paramètres.

Les réglages sont persistés dans `Parametres/data_collector_firewall.json` et rechargés au démarrage.

## Modes

- `PROTECTION` : une donnée invalide est rejetée avant le Supervisor.
- `OBSERVATION` : la donnée est laissée passer mais le Firewall rapporte qu'elle aurait été rejetée.
- `enabled=false` : inspection désactivée, passage direct.

## Règles configurables

Chaque contrôle possède son interrupteur indépendant dans Settings :

- contrôle de taille du payload ;
- whitelist des providers ;
- whitelist des types de données ;
- provenance obligatoire ;
- fraîcheur / timestamp ;
- validation du symbole / paire ;
- validation du schéma et des invariants OHLCV ;
- prix strictement positif ;
- saut de prix maximal ;
- cohérence bid/ask ;
- spread maximal ;
- protection anti-doublon.

Les seuils associés sont également modifiables :

- `maxMessageAgeMs` ;
- `maxFutureSkewMs` ;
- `maxPayloadBytes` ;
- `duplicateWindowMs` ;
- `maxPriceJumpPct` ;
- `maxSpreadPct` ;
- `providerWhitelist` ;
- `typeWhitelist`.

## Debug depuis Settings

La page de configuration contient :

- un éditeur JSON de message de test ;
- `Inspecter ce message` pour faire passer un échantillon dans le moteur réel ;
- `Auto-test Firewall` pour tester plusieurs cas valides et invalides ;
- `Réinitialiser stats` ;
- affichage des décisions `PASS`, `WARN`, `REJECT`, motifs, anomalies et compteurs.

Le debug ne produit aucun ordre de trading. Il n'utilise que le moteur de validation du Data Collector Firewall.

## Technologie

Le service reste léger : Node.js natif (`http`, `crypto`, `fs`), aucune dépendance supplémentaire et aucune base de données.

Le service écoute par défaut sur `127.0.0.1:8018`. Les appels inter-services peuvent être protégés par la clé interne existante via `x-ia-tb-internal-key` (`IATB_INTERNAL_SERVICE_KEY`). La page de Settings utilise une session locale éphémère dédiée, limitée au service loopback.

Contrairement au Trading Firewall, le Data Collector Firewall ne signe pas chaque donnée par HMAC. Son rôle principal est la validation sémantique et structurelle des données.

## API locale

- `GET /settings`
- `GET /health`
- `GET /status`
- `GET /rules`
- `POST /configure`
- `POST /inspect`
- `POST /debug/self-test`
- `POST /debug/reset`

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

- `PASS` : donnée valide ;
- `WARN` : anomalie non bloquante ou mode Observation ;
- `REJECT` : donnée bloquée en mode Protection.

Le branchement définitif doit garantir que tout flux `Market Data Collector → Supervisor` passe par ce composant avant livraison au Supervisor.
