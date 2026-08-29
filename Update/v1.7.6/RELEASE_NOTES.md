# IA-TB v1.7.6 — Trading Engine normalization

Source version: `1.7.5`
Target version: `1.7.6`

## Architecture

`Supervisor -> Router <-> Risk Manager -> Trading Engine -> Exchange`

## Ajouts

- Trading Engine normalisé.
- Communication Protocol adapter.
- Refus automatique des exécutions sans `risk_approval_id`.
- Registry d'Executors par exchange.
- Exchange Adapters organisés par exchange et catégories de requêtes.
- Capabilities déclaratives par exchange.
- SecretProvider prévu pour `Settings > API`.
- Live execution désactivable globalement.
- Normalisation uniforme des retours d'exécution.
- Binance Executor : Spot + USDⓈ-M Futures.
- OKX Executor : API v5.
- Kraken Executor : Spot REST.
- GMX Executor : workflow API-relayé avec signer wallet.
- Documentation et self-test.

## Important

Le patch fournit les moteurs/adapters et leurs contrats.
Le raccord exact au bootstrap Router actuel devra être effectué sur la copie source installée,
car le dépôt GitHub expose actuellement la source applicative principale sous forme d'archive binaire.
