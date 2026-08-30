# CHANGELOG

## v1.7.9 — EN DÉVELOPPEMENT

### Market Data / CoinGecko
- Ajout du provider complémentaire `COINGECKO` au registre multi-provider.
- OHLC CoinGecko normalisés avec provenance explicite `COINGECKO_API`.
- Aucune donnée de volume d'exchange n'est fabriquée : `volumeAvailable=false`, `positiveVolumeRows=0`, `volumeSource=NONE`.
- État du provider enrichi : dernière réussite, dernière erreur, état d'authentification et présence d'une clé en mémoire.
- La clé CoinGecko optionnelle peut être ajoutée depuis `Settings > API`.
- La clé CoinGecko est stockée dans le coffre RSA-OAEP existant (`secrets_v2.dat`), comme les autres secrets API.
- Market Data ne persiste jamais la clé : elle est récupérée depuis le Core uniquement en mémoire via un canal interne authentifié.
- Si le coffre est verrouillé ou si aucune clé n'est configurée, CoinGecko conserve son fonctionnement public/non authentifié.
- Ajout d'un test CoinGecko depuis Settings et d'un test automatisé dédié dans `Update/v1.7.9/Tests/`.

### Market Data / Kraken et GMX
- Kraken devient une source explicite du Market Data Collector via l'adaptateur public local existant.
- Les OHLCV Kraken conservent le volume natif et la provenance `KRAKEN`.
- GMX devient une source explicite du Collector via l'Oracle Arbitrum.
- GMX fournit prix et OHLC ; aucun volume n'est fabriqué lorsque l'Oracle ne fournit pas de volume comparable.
- Ajout du prix consensus multi-source avec `GET /price/consensus`.
- Le prix consensus conserve les sources utilisées/rejetées et peut filtrer un outlier à partir de trois sources.

### Market Data / ƒx Consensus OHLCV
- Ajout de `MarketData/Aggregator/candle_consensus.js` comme calculateur léger exécuté dans le processus Market Data existant.
- Aucun nouveau service, port ou cache historique parallèle n'est introduit.
- Ajout de la source virtuelle `FX`, affichée `ƒx Consensus`.
- `Open`, `High`, `Low` et `Close` sont calculés par moyenne arithmétique des bougies valides de même paire et même timeframe.
- Le `Volume` synthétique est la somme des volumes natifs comparables disponibles, exprimée dans l'actif de base de la paire.
- Les volumes absents ne sont jamais estimés ni remplacés par zéro comme s'ils avaient été réellement observés.
- Une source dont la paire canonique diffère de la paire demandée est exclue avec la raison `PAIR_MISMATCH` ; par exemple `BTC/USD` n'entre pas dans `BTC/EUR`.
- Les timestamps sont alignés par bucket de timeframe avant agrégation.
- Les invariants OHLC sont restaurés après calcul afin que `High` reste supérieur ou égal à Open/Close et `Low` inférieur ou égal à Open/Close.
- La provenance peut inclure `sourcesUsed`, `sourcesExcluded`, `priceSources`, `volumeBySource`, `volumeSourcesUsed`, `volumeUnit`, `priceMethod` et `volumeMethod`.
- Ajout de `GET /candles/consensus` dans le Market Data Collector.
- Ajout de `GET /api/market/fx-klines` dans le Core comme proxy local vers le Collector.
- `GET /providers` expose `FX` comme provider virtuel `SYNTHETIC`.
- Ajout du test `Update/v1.7.9/Tests/test_fx_consensus_v1.7.9.js`.

### Market Data / Blockchain.com
- Ajout du provider complémentaire `BLOCKCHAIN` au registre multi-provider.
- Utilisation de l'API publique Blockchain.com Exchange via le WebSocket `prices`, sans authentification utilisateur, dans l'implémentation actuellement préparée.
- Conservation des bougies OHLCV et volumes natifs reçus depuis Blockchain.com ; aucune donnée de volume n'est fabriquée.
- Provenance explicite : `exchange=BLOCKCHAIN.COM`, `priceSource=BLOCKCHAIN_EXCHANGE_PRICES_SOCKET`, `volumeSource=BLOCKCHAIN_NATIVE` lorsque le volume est positif.
- Normalisation des symboles au format Blockchain.com (`BTC-USD`, `ETH-EUR`, etc.).
- Granularités supportées strictement : 60, 300, 900, 3600, 21600 et 86400 secondes ; les timeframes non supportés sont refusés explicitement.
- État du provider enrichi : connexion, dernière connexion, dernier événement, dernière réussite, dernière erreur, abonnements et séries en cache.
- Ajout de tests automatisés de normalisation des paires, granularités et conversion OHLCV dans `Update/v1.7.9/Tests/test_blockchain_v1.7.9.js`.
- La spécialisation finale Blockchain.com vers un rôle Bitcoin/on-chain reste à effectuer avant stabilisation de la v1.7.9.

### Market Data / DefiLlama
- Ajout du provider complémentaire `DEFILLAMA`.
- DefiLlama est explicitement déclaré `candleCapable:false` : ses métriques ne remplacent jamais les OHLCV natifs des CEX/DEX.
- Intégration des commandes gratuites TVL protocoles/chaînes, prix tokens, stablecoins, yields, volumes DEX/options, open interest et fees/revenue.
- Provenance explicite `DEFILLAMA_PUBLIC_API`, avec dernière réussite, dernière commande et dernière erreur.
- 29 commandes gratuites DefiLlama sont branchées via l'interface générique Market Data `/command`.
- Les endpoints Pro sont catalogués comme `UPSTREAM_AVAILABLE` avec authentification `PRO_API_KEY`, mais ne sont pas activés dans cette version.
- Ajout du test `Update/v1.7.9/Tests/test_defillama_v1.7.9.js`.

### Market Data / Catalogue des capacités API
- Ajout de `MarketData/Provider/capability_catalog.js`.
- Le catalogue couvre GMX, Kraken/Reference, Hyperliquid, CoinGecko, Blockchain.com et DefiLlama, avec visibilité des connecteurs historiques Binance/Coinbase/OKX.
- Chaque capacité est marquée `IMPLEMENTED`, `LEGACY_IMPLEMENTED` ou `UPSTREAM_AVAILABLE`.
- `GET /capabilities` retourne le catalogue complet ; `GET /capabilities?provider=...` filtre par provider.
- `POST /command` permet d'exécuter les commandes analytiques génériques effectivement branchées.
- `Update/v1.7.9/MarketData/API_COMMANDS.md` documente également la source virtuelle `ƒx` et ses règles d'agrégation.
- Le catalogue reste limité au périmètre Market Data/analytics ; les commandes privées de compte, trading et retrait restent séparées.

### Interface
- Ajout de CoinGecko à la section `Settings > API` avec champ secret masqué, état Configurée/Absente et bouton de test.
- Blockchain.com et DefiLlama n'exigent pas de clé pour les fonctions publiques utilisées par IA-TB v1.7.9.
- Le sélecteur d'exchange du graphique **Trading IA** propose maintenant `ƒx` en plus de GMX et Kraken.
- Quand `ƒx` est sélectionné, le graphique demande les données synthétiques au Core/Market Data au lieu de calculer une moyenne dans le navigateur.
- Le libellé OHLC affiche également le volume total en actif de base lorsqu'il est disponible.
- Le mode `ƒx` utilise un rafraîchissement léger de 15 secondes et masque les panneaux spécifiques d'exécution GMX/Kraken, car `ƒx` est une source de données et non un exchange de trading.
- Le Chart Viewer TradingView séparé reste inchangé : le mode `ƒx` concerne le graphique interne de Trading IA alimenté par IA-TB.

### Sécurité
- Réutilisation du mécanisme de coffre RSA existant pour CoinGecko ; aucun nouveau fichier de secret en clair.
- Transmission Core → Market Data protégée par la clé de service interne existante pour les secrets.
- Le proxy de lecture `ƒx` reste strictement local sur `127.0.0.1` et ne nécessite aucun secret supplémentaire.
- Les providers Blockchain.com et DefiLlama de cette version utilisent uniquement des fonctions publiques de données/analytics.

### Compatibilité / légèreté
- Le consensus OHLCV est calculé à la demande dans le Market Data Collector existant.
- Aucun nouveau daemon, port réseau, base de données ni copie permanente de l'historique consensus n'est ajouté.
- La structure reste compatible avec la cible macOS High Sierra / Node.js 16 et l'objectif de faible consommation mémoire.

### État de validation
- Intégrations techniques CoinGecko, Blockchain.com et DefiLlama préparées dans `Update/v1.7.9`.
- Intégration technique Kraken + GMX + `ƒx` préparée dans `Update/v1.7.9`.
- Le calcul pur `ƒx` moyenne OHLC + somme des volumes a été vérifié localement avec le cas 120 + 850 + 410 = 1380 BTC et exclusion d'une source de paire différente.
- Les tests end-to-end, flux réseau réels et validation sur la machine cible restent requis avant stabilisation de la v1.7.9.

## v1.7.8

### Market Data / Providers
- Nouveau type de Provider `SOCKET` pour les flux WebSocket persistants.
- Hyperliquid devient le premier Provider MarketData de type `SOCKET`.
- Historique OHLCV Hyperliquid via `candleSnapshot`, puis mise a jour temps reel par WebSocket.
- Volumes natifs Hyperliquid conserves et identifies par source.
- `/providers` et `/health` exposent le type, l'etat de connexion, le dernier evenement et les erreurs.
- Kraken reste le provider de reference par defaut.

### Interface
- Correction Mosaic : la mosaïque principale est masquee lorsqu'une surcouche Settings, Strategy ou Update est ouverte, afin d'eviter les chevauchements d'interface.

### Runtime
- Ajout de `ws@8.18.0` limite au module MarketData, compatible Node.js 16.
- `install_runtime.command` installe automatiquement la dependance si necessaire.

### Release / UpdateManager
- Patch cible : `1.7.7 -> 1.7.8`.
- Le package de mise a jour respecte le format natif UpdateManager : `update_manifest.json + payload/`.
- Les donnees utilisateur protegees restent exclues du payload.

### Compatibilite
- Base v1.7.7 conservee.
- macOS High Sierra / Intel et Node.js v16.20.2 conserves.

## v1.7.4

### Ajouts
- Coinbase : Market Data, OHLCV, volumes, Chart Viewer et configuration API.
- OKX : Market Data, OHLCV, volumes, Chart Viewer et configuration API.

### Modifications
- Market Data devient explicitement source-aware pour GMX, Kraken, Binance, Coinbase et OKX.
- Indicator Engine et Liquidity Engine utilisent l'exchange sélectionné.
- Les clés de cache incluent la provenance de l'exchange.

### Sécurité / Configuration
- Les paramètres privés Coinbase et OKX sont centralisés dans `Settings > API`.
- Les données publiques de marché peuvent fonctionner sans clés privées lorsque l'API concernée le permet.
- Le stockage des longues clés privées Coinbase reste compatible avec le coffre de secrets existant.

### Compatibilité
- Patch construit pour `1.7.3 -> 1.7.4`.
- Validation avec l'UpdateManager réel de la v1.7.3.
- Données utilisateur protégées non incluses du payload.

### Documentation
- Wiki impact : Connecteurs CEX/DEX, Market Data, Chart Viewer, Settings/API, Versionnage/Releases.
