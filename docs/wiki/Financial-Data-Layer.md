# Financial Data Layer

## Objectif

La Financial Data Layer de DEBUG 1.12 étend Market Data au-delà des simples candles. **Market Data reste l'entrée READ universelle** ; les consommateurs reçoivent un contrat normalisé plutôt que des formats propriétaires.


> **Lecture rapide :** l'essentiel est ci-dessus. Les détails sont disponibles sans quitter la page.

<details>
<summary><b>➕ En savoir plus — détails techniques</b></summary>

## Familles de providers

- **CEX_MARKET** — marchés centralisés ;
- **DEX_MARKET** — pools/order books DEX lorsqu'un adapter existe ;
- **AGGREGATOR** — catalogue large type CoinGecko ;
- **ONCHAIN_RPC** — lecture blockchain JSON-RPC ;
- **DEFI_PROTOCOL** — positions VAULT/STAKING/LP/LENDING/BORROWING/FARM/LOCKED.

Aucun agrégateur n'est supposé complet. La largeur de catalogue et le détail wallet/protocole sont deux problèmes différents.

## Schéma

Contrat canonique : `iatb.financial.data/1.0`. Les positions DeFi peuvent contenir chain, protocol, contract, wallet, asset, quantité/share, valeur USD, TVL, APR/APY, rewards, block et provenance. La liquidité peut contenir venue, market type, bid/ask/spread, depth, OI, TVL, volume et réserves.

## Sécurité RPC

Whitelist de lecture : `eth_call`, `eth_getBalance`, `eth_getBlockByNumber`, `eth_blockNumber`, `eth_getCode`, `eth_getLogs`.

Sont exclus : transaction/signature, clés privées, shell, JavaScript arbitraire. Chat et Supervisor ne reçoivent que des commandes READ.


</details>
