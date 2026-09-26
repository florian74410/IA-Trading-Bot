# Connecteurs CEX / DEX

IA-TB sépare **provider de données** et **adapter d'exécution**. Un exchange peut donc être utilisé pour lire le marché sans recevoir de droit de trading.

## Market Data

DEBUG 1.12 contient des providers Kraken, Binance, OKX et GMX ainsi que CoinGecko, DeFi et RPC on-chain. Les providers produisent des données normalisées avec provenance.


> **Lecture rapide :** l'essentiel est ci-dessus. Les détails sont disponibles sans quitter la page.

<details>
<summary><b>➕ En savoir plus — détails techniques</b></summary>

## Trading Engine

Les adapters d'exécution présents sont :
- **Binance** — Spot + USDⓈ-M Futures selon capabilities ;
- **OKX** — Spot / Margin / Swap / Futures ;
- **Kraken** — Spot / Margin ;
- **GMX** — flux préparé autour du wallet/signature selon l'adapter.

Chaque adapter possède `capabilities.json`, un `executor.js` et des contrats de requêtes. Les formats natifs de l'exchange restent confinés dans l'adapter.

## Secrets

Les secrets viennent du coffre Settings/API via le secret provider. Ils ne sont pas stockés dans les dossiers adapters et ne transitent pas dans les pages Wiki/logs.

## Wallet / GMX

Le protocole UI historique prévoit `wallet.connect`, refresh, switch Arbitrum et préparation GMX. Les confirmations/signatures externes du wallet ne doivent pas être contournées ; seed et clé privée ne sont jamais exposées à IA-TB.

## Ajouter un exchange

Un nouvel exchange doit définir séparément : provider Market Data si nécessaire, normalisation symboles/timeframes, capabilities Trading, executor, secrets requis, tests, provenance et documentation. Il ne doit pas introduire de raccourci direct UI→Exchange qui contourne Router/Firewall.


</details>
