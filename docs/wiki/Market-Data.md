# Market Data Collector

## Rôle

**Market Data :8013** est l'entrée universelle READ des données de marché et financières. Il récupère les données des providers, les normalise, les met en cache et expose un contrat stable aux autres composants.

```text
Kraken / Binance / OKX / GMX / CoinGecko / RPC / DeFi
                         │
                         ▼
                   Market Data
              Normalizer + Registry + Cache
                         │
              Firewall Data (selon route)
                         │
        Router / UI / Indicator / Liquidity / IA
```


> **Lecture rapide :** la section ci-dessus donne l'essentiel. Ouvrez le bloc suivant pour le fonctionnement détaillé.

<details>
<summary><b>➕ En savoir plus — fonctionnement technique</b></summary>

## Providers DEBUG 1.12

Le build contient des providers **Kraken, Binance, OKX, GMX, CoinGecko**, un adapter DeFi, un provider RPC on-chain et un provider de référence. Une présence dans le code ne signifie pas qu'une source distante non testée doit être présentée comme disponible : chaque adapter doit annoncer sa provenance et ses capacités réelles.

Binance utilise les klines Spot publiques et renvoie du volume natif. OKX utilise les candles publiques, avec normalisation des paires et fallback USD→USDT. Les timeframes sont normalisés avant l'appel provider.

## CP/1

Commandes principales :
- `marketdata.health`
- `marketdata.providers`
- `marketdata.candles`
- `marketdata.financial.capabilities`
- `marketdata.registry.status/search/list/asset/query`

`marketdata.candles` exige `symbol` + `timeframe` et accepte notamment `limit`, `force`, `exchange` et `source`.

## Normalisation

Le Collector normalise **symboles, timeframes, candles et données financières**. Chaque réponse doit garder la provenance : provider, exchange/source, paire provider, timeframe, disponibilité du volume et source de prix.

Le graphique ne doit jamais inventer un volume absent. Une incohérence de timeframe est refusée plutôt que d'afficher silencieusement des bougies d'une autre granularité.

## Registry

Le Market Registry fournit une couche de découverte : recherche d'actifs, liste paginée, fiche d'actif et requêtes de catalogue. Il permet aux consommateurs de demander « où trouver cet actif ? » sans connaître l'implémentation d'un provider.

## Sécurité

La Financial Data Layer est READ_ONLY pour Chat/Supervisor. Le RPC on-chain autorise uniquement des méthodes de lecture sélectionnées ; aucune signature, clé privée ou `eth_sendTransaction` n'est exposée.

Voir aussi : [Financial Data Layer](Financial-Data-Layer.md), [Firewall](Firewall-Module.md), [Trading IA](Trading-IA.md).


</details>
