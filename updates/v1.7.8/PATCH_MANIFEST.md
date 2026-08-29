# IA-Trading-Bot - Patch v1.7.8

Base cible : v1.7.7

## Objectif

Introduire le type de Provider `SOCKET` pour les flux temps reel persistants et intégrer Hyperliquid comme premier Provider MarketData de ce type.

## Integration realisee

- `MarketData/Provider/socket_provider.js`
  - transport WebSocket generique
  - reconnexion automatique avec backoff borne
  - envoi JSON et statut de connexion

- `MarketData/Provider/hyperliquid_provider.js`
  - Provider `HYPERLIQUID`, type `SOCKET`
  - endpoint `wss://api.hyperliquid.xyz/ws`
  - abonnements candle / trades / l2Book
  - cache memoire borne a 1000 bougies par serie
  - mise a jour temps reel des bougies
  - bootstrap historique via l API publique Hyperliquid `candleSnapshot`
  - OHLCV et volumes natifs Hyperliquid normalises vers le contrat MarketData interne
  - health/debug : connected, coin, interval, subscriptions, cachedSeries, lastEventAt, lastError

- `MarketData/Provider/provider_registry.js`
  - registre multi-provider
  - `REFERENCE` / Kraken conserve comme provider par defaut
  - `HYPERLIQUID` disponible sans casser le comportement historique

- `MarketData/market_data_service.js`
  - prise en charge du parametre `provider`
  - `/candles?provider=HYPERLIQUID&symbol=BTCUSD&interval=1h`
  - `/refresh?provider=HYPERLIQUID...`
  - nouvel endpoint `/providers`
  - `/health` expose maintenant la liste et l etat des Providers
  - cache et contextes actifs isoles par provider
  - variable `IATB_MARKET_PROVIDER` pour choisir le provider par defaut
  - variable `IATB_HYPERLIQUID_WS` pour surcharger l endpoint WebSocket

- `MarketData/package.json`
  - dependance legere `ws@8.18.0`, compatible Node.js 16

- `install_runtime.command`
  - conserve Node.js v16.20.2
  - installe automatiquement les dependances MarketData si `ws` est absent

- `MarketData/Tests/test_hyperliquid_socket.js`
  - test du contrat Provider/SOCKET sans reseau
  - test live optionnel avec `IATB_LIVE_HYPERLIQUID_TEST=1`

## Compatibilite

- macOS High Sierra / Intel cible conservee
- Node.js v16.20.2 conserve
- Kraken reste le comportement par defaut
- Hyperliquid ne necessite aucune cle API pour les donnees publiques de marche
- aucune donnee d authentification n est codee en dur

## Etat

INTEGRATION CODE TERMINEE SUR LA BRANCHE PATCH.

Avant de promouvoir en build officielle v1.7.8 :
1. appliquer le contenu de `Update/v1.7.8/` sur une copie de la v1.7.7 ;
2. executer `install_runtime.command` ;
3. executer le self-test local puis le test live Hyperliquid ;
4. verifier `/health`, `/providers` et `/candles?provider=HYPERLIQUID` ;
5. verifier Chart Viewer / Indicator Engine avec le provider Hyperliquid ;
6. seulement ensuite creer `Build/v1.7.8`, mettre a jour `VERSION` et produire l archive de release.
