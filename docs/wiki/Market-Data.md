# Market Data

Le Market Data Engine fournit aux autres modules les données de marché normalisées tout en conservant leur provenance. La v1.7.9 étend ce rôle avec des sources complémentaires, un Collector multi-source et une source virtuelle de consensus `ƒx`.

## Principes

- aucune source ne remplace silencieusement une autre ;
- les symboles peuvent être normalisés, mais la provenance originale reste attachée aux données ;
- aucun volume absent n'est fabriqué ;
- les données complémentaires ne deviennent pas artificiellement des OHLCV d'exchange ;
- le cache reste borné et séparé par provider / symbole / timeframe.

## Types de providers

IA-TB distingue les providers API et les providers `SOCKET`. Depuis la v1.7.8, `SOCKET` désigne un provider utilisant un flux WebSocket persistant pour les mises à jour temps réel ; une API HTTP peut rester utilisée pour l'historique ou les métadonnées.

Hyperliquid est le premier provider `SOCKET` intégré.

## Sources v1.7.9

### CoinGecko — API

CoinGecko est une source complémentaire `COINGECKO`. Sa provenance reste explicite et séparée des données natives CEX/DEX. L'application ne transforme pas une donnée CoinGecko en volume d'exchange lorsqu'un tel volume n'existe pas.

L'état du provider expose notamment la dernière réussite, la dernière erreur et l'état d'authentification. La clé API éventuelle est configurée dans `Settings > API`, stockée par le coffre existant et transmise au service Market Data uniquement en mémoire.

### Blockchain.com — API

Le provider `BLOCKCHAIN` utilise actuellement le flux public Blockchain.com Exchange, notamment le canal WebSocket `prices`. Les OHLCV et volumes reçus restent natifs, les timeframes non supportés sont refusés plutôt qu'approximés et la provenance `BLOCKCHAIN.COM` est conservée.

La v1.7.9 prévoit encore de recentrer cette source sur son rôle Bitcoin / on-chain afin d'éviter un doublon inutile avec les sources Exchange.

### DefiLlama — API

`DEFILLAMA` est une source analytique complémentaire et déclare `candleCapable:false`. Elle ne doit donc jamais remplacer silencieusement les chandeliers CEX/DEX.

Les familles de données intégrées couvrent : TVL protocoles et chaînes, prix tokens actuels/historiques/chart/variations, stablecoins, pools de rendement et historiques APY/TVL, volumes DEX et options, open interest, fees et revenue. La provenance est `DEFILLAMA_PUBLIC_API`.

## Hyperliquid / SOCKET

Le provider Hyperliquid charge l'historique OHLCV via `candleSnapshot`, maintient les chandeliers avec l'abonnement WebSocket `candle` et dispose également des abonnements `trades` et `l2Book`. Les volumes natifs Hyperliquid sont conservés avec leur provenance et le cache provider est borné.

## Market Data Collector

Le Collector v1.7.9 rend les sources de prix explicites. Kraken fournit OHLCV et prix live. GMX fournit OHLC et prix Oracle ; aucun volume GMX absent n'est fabriqué.

### Prix consensus

`GET /price/consensus` calcule un prix consensus à partir des sources valides, Kraken et GMX étant les sources par défaut actuelles. Le résultat conserve les prix individuels, leur provenance, le nombre de sources et le spread entre sources.

Le calcul utilise la moyenne des sources valides. À partir de trois sources, un filtre d'outliers autour de la médiane permet d'écarter une valeur incohérente avant le consensus.

## Source virtuelle ƒx / consensus OHLCV

La source virtuelle `FX`, affichée `ƒx Consensus`, est calculée directement dans le Collector et n'ajoute aucun service réseau.

`GET /candles/consensus` produit les bougies synthétiques à la demande :

- Open, High, Low et Close = moyenne arithmétique des bougies sources valides et alignées ;
- Volume = somme des volumes natifs comparables réellement disponibles ;
- correspondance stricte de la paire canonique ;
- alignement des timestamps par bucket de timeframe ;
- conservation des sources prix, sources volume, volumes par source, sources exclues et motifs d'exclusion.

Le proxy Core `GET /api/market/fx-klines` permet au navigateur de rester sur le canal local existant. Le rafraîchissement `ƒx` est léger, à 15 secondes, sans historique consensus supplémentaire conservé en mémoire.

## Catalogue des commandes

Le catalogue central couvre GMX, Kraken/Reference, Hyperliquid, CoinGecko, Blockchain.com et DefiLlama, tout en signalant les connecteurs historiques Binance/Coinbase/OKX.

Les états de capacité sont :

- `IMPLEMENTED` : commande branchée dans le runtime courant ;
- `LEGACY_IMPLEMENTED` : fonction disponible dans une intégration historique ;
- `UPSTREAM_AVAILABLE` : possibilité connue côté fournisseur mais non branchée ici.

`GET /capabilities` expose le catalogue complet, `GET /capabilities?provider=...` le filtre par provider et `POST /command` exécute les commandes analytiques génériques actuellement branchées. Les opérations privées de compte, trading et retrait restent hors de ce catalogue Market Data.

La référence technique détaillée des commandes v1.7.9 se trouve dans `Update/v1.7.9/MarketData/API_COMMANDS.md`.

## Diagnostic et cache

Les endpoints `/providers`, `/health`, `/active`, `/refresh` et `/cache/clear` permettent de suivre l'état des providers et des contextes actifs. Les historiques importants restent chargés à la demande afin de limiter l'empreinte mémoire.

## Validation restante v1.7.9

Les providers CoinGecko, Blockchain.com et DefiLlama ainsi que Kraken/GMX et `ƒx` doivent encore être validés end-to-end sur la machine cible. La documentation décrit l'état fonctionnel actuel sans transformer ces validations restantes en succès acquis.
