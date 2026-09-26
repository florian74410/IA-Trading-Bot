# Architecture générale — DEBUG 1.12

## Vue d'ensemble

IA-TB suit une architecture **multi-processus locale**. Les responsabilités sont volontairement séparées : l'acquisition d'une donnée ne donne pas le droit d'exécuter un ordre, et l'IA ne reçoit pas automatiquement des droits d'administration.

```text
                         ┌──────────── UI :8000 ────────────┐
                         │ Trading / Fundamental / Portfolio│
                         │ Strategy / Settings / Admin / IA │
                         └───────────────┬──────────────────┘
                                         │
                                  Core :8001
                                         │
                               Router CP/1 :8021
          ┌──────────┬──────────┬────────┼─────────┬──────────┐
          ▼          ▼          ▼        ▼         ▼          ▼
 Indicator:8012 Market:8013 Liquidity:8014 Fund.:8015 Strategy:8018
          │          │          │        │         │
          └──────────┴──────────┴────────┴─────────┤
                                                   ▼
                                              Risk :8019
                                                   │
                                              Portfolio:8020
                                                   │
                     Router ──► Firewall :8017 ──► Trading :8016
                                                       │
                                                Exchange adapters
```

## Couches

### 1. Présentation
Le service UI 8000 sert les pages. La UI ne possède pas les données de marché : elle consomme des états en lecture et envoie des intentions de navigation/visualisation. Le graphique Trading IA reste le moteur natif IA-TB.

### 2. Core
Core 8001 porte les fonctions applicatives communes : Settings, pipeline OpenAI, Update Manager, usage ledger et passerelles nécessaires à l'interface. Il ne remplace pas les Engines.

### 3. Communication
Router 8021 est le **bus de communication**. Il charge ProtocolRegistry, valide cible/action/arguments, protège contre le replay, signe les appels internes et vérifie les réponses. Il ne résume pas et ne score pas les sorties des Engines.

### 4. Données
Market Data est l'entrée universelle READ des données financières. Il normalise symboles, timeframes, OHLCV et provenance. La Financial Data Layer étend le contrat aux données CEX, DEX, agrégateurs, RPC on-chain et DeFi.

### 5. Analyse
Indicator calcule les indicateurs ; Liquidity produit zones/order book/liquidations ; Fundamental transforme des publications en événements et preuves ; Strategy v2 agrège les snapshots pour produire une intention ; Risk calcule l'exposition et les métriques de risque.

### 6. État financier
Portfolio conserve événements d'exécution, balances, positions, statistiques et coûts. Les connexions wallet utilisées par l'interface sont conçues en lecture/confirmation externe : aucune seed ou clé privée ne doit entrer dans IA-TB.

### 7. Exécution
Les commandes Trading sensibles sont routées vers **Firewall 8017**, qui inspecte puis relaie vers **Trading Engine 8016**. Trading Engine sélectionne l'adapter Binance/OKX/Kraken/GMX et conserve LIVE à OFF par défaut.

## Flux de décision cible

```text
Market + Indicators + Fundamental + Portfolio
                    │
                    ▼
               Strategy v2
                    │
             strategy.signal
                    │
                    ▼
                 Risk
                    │
          analyse / garde-fous
                    │
                    ▼
        Supervisor IA (futur)
                    │
                    ▼
                 Router
                    │
                    ▼
                Firewall
                    │
                    ▼
             Trading Engine
                    │
                    ▼
                 Exchange
```

**Important :** dans DEBUG 1.12, Strategy est actif, mais le **Supervisor autonome reste RESERVED**. Le flux ci-dessus représente donc la séparation architecturale prévue ; il ne faut pas présenter le Supervisor comme déjà opérationnel.

## Philosophie

IA-TB privilégie les contrats explicites : un Engine expose des capacités déclarées, pas son implémentation interne. Cela permet de remplacer un provider ou un moteur sans réécrire le Router, et facilite le passage du Mac local au futur VPS.
