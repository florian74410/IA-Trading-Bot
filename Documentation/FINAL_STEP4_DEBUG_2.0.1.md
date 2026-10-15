# Correctif final DEBUG 2.0.1 — Étape 4/4

## Livraison et périmètre

Branche existante `debug-v2.01`, parent `edfe0c8ed6f63d5b3ba0cf622382c76f940688ca`. Version applicative **2.0.1** conservée. Étapes 1–3 déclarées validées sur GEN-1 par Overflow. Aucun déploiement exécuté ici. La validation réelle de cette étape et l’accord d’Overflow restent nécessaires avant toute préparation de 2.0.2.

Router, authentification, client/règles Firewall, Provider/Collector DexScreener et son contrat de persistance restent inchangés. Aucun démarrage du Trading Engine, aucune migration/destruction d’historique, aucune nouvelle dépendance applicative. Les fixtures restent dans les tests, exclus de l’image par `.dockerignore`.

## CoinGecko : cause et correction

Le registre parcourait deux pages toutes les 60 s ; CeFi avait un TTL de 45 s, vérifié chaque minute. L’enrichissement exchanges pouvait aussi relancer immédiatement les deux appels global/markets. La file CoinGecko ne regroupait pas les URL identiques et la valeur explicite `maxRetries:0` retombait sur la valeur par défaut. Cela pouvait multiplier les tentatives, y compris après un 429.

- Registre : 1 h par défaut, plancher 30 min lors de la lecture des anciennes configurations. CeFi : TTL minimal 30 min. Enrichissement exchanges : 30 min ; seule l’acquisition initiale d’une couverture absente peut demander une publication immédiate. Les mises à jour suivantes attendent le prochain cycle CeFi dû. DeFi reste indépendant.
- Une URL identique en attente/en cours = un appel HTTP, réponses copiées pour chaque consommateur. Aucun cache de réponses brutes avant Firewall. Les caches applicatifs conservent seulement les données déjà validées.
- Espacement par défaut 3 s ; zéro retry par défaut, aucun retry automatique sur 429 même avec retries configurés. Pause commune à tous les endpoints : maximum de `Retry-After` et **15 min** ; l’en-tête est transmis même sur réponse interrompue. La dernière pause 429 est récupérée dans la télémétrie SQLite après redémarrage.
- Garde locale persistante : au plus 20 admissions/minute et 8 000 sur 30 jours glissants, par défaut (limite 10 000, réserve 2 000). Tentatives échouées incluses, phases dédupliquées par request_id. L’historique incomplet/indisponible bloque les nouveaux appels. Les admissions comptées avant le transport natif peuvent être plus nombreuses que les appels effectivement transmis : protection conservatrice.
- La limite et la réserve sont réglables via `IATB_COINGECKO_MONTHLY_LIMIT` et `IATB_COINGECKO_RESERVE`, selon le contrat réel. Cette politique locale ne connaît pas les appels des autres stacks/IP/comptes. Elle ne garantit pas l’absence de 429 dus à un quota partagé ; elle empêche les boucles de répétition locales. Ne pas effacer la télémétrie pour récupérer du budget.
- Avec les paramètres par défaut, la cadence régulière cible environ 8 appels/heure (5 760/30 jours), hors démarrage, recherches, conversions et demandes explicites. Une ancienne configuration registre 60 s est ramenée à 30 min, soit environ 10 appels/heure avec deux pages. Le garde persistant reste applicable à tous ces usages.
- Un échec de collecte CeFi conserve la famille précédemment validée et sa date, sans remplacement par un snapshot partiellement nul. L’enrichissement brut passe aussi le Firewall avant son cache. La lecture UI immédiate pendant le rafraîchissement et les limites de rendu de l’étape 3 restent en place.

`marketdata.health.coingecko` expose tentatives de la session, déduplications, file, pause, budget et dernière erreur. Le statut ne signifie pas que le quota global du compte/IP est connu.

## Liquidations : quantité, prix, conversion et couverture

Les workers publiaient `prix × quantité` comme USD pour certains contrats, mais le Collector reconstruisait l’événement sans unité ni métadonnées et ne conservait finalement aucun notionnel. OKX fournissait des contrats, non une quantité de tokens. L’ancien calcul de statistiques passait par au plus 500 événements récents ; l’UI filtrait BTC au lieu de montrer les flux suivis.

| Source | Calcul désormais admis | Limites explicites |
| --- | --- | --- |
| Binance Futures USDⓈ-M | Dernière quantité exécutée `l` × prix moyen publié `ap`, puis taux observé de la devise vers USD | Jamais la taille initiale `q` ou le cumul `z` comme nouvel événement. Sans prix moyen/dernière taille exploitables : N/D. Le flux public peut échantillonner les événements ; pas de total mondial exhaustif. |
| Bybit linéaire USDT/USDC | Taille exécutée `v` × prix de faillite `p`, puis taux observé vers USD | `Buy` correspond à une position longue liquidée. Prix de faillite, pas preuve du prix d’exécution. Contrats inverses non pris en charge : N/D. Abonnements limités aux symboles suivis. |
| OKX linéaire | Nombre de contrats × `ctVal` en actif de base × `bkPx`, puis taux observé de la quote vers USD | Métadonnées exactes de l’instrument requises. Prix de faillite ; pas prix d’exécution garanti. |
| OKX inverse USD | Nombre de contrats × `ctVal` en USD | Seulement `ctType=inverse`, `ctValCcy=USD`. Multiplicateur autre que vide/1 ou devise non supportée : N/D. |

La conversion utilise le registre de devises et le résolveur déjà présents ; **USDT/USDC ne valent jamais automatiquement 1 USD**. Le dernier prix d’actif d’un snapshot CeFi encore frais est réutilisé ; sa date de famille est conservée même si DeFi a actualisé le snapshot global. Ce prix peut dater d’environ 30 min avec la politique par défaut : valorisation aux prix observés et datés, pas conversion exécutable à l’instant de la liquidation. En cas d’absence de prix frais ou de quota, événement conservé avec montant N/D et raison explicite. Succès/échecs de résolution regroupés et conservés 60 s pour éviter une requête par événement.

OKX `/api/v5/public/instruments?instType=SWAP` est le seul endpoint supplémentaire, chez un fournisseur existant : indispensable pour connaître la valeur des contrats. Réponse via le transport existant et le Firewall, puis cache 24 h ; résolution concurrente dédupliquée, nouvelle tentative après échec espacée d’au moins 60 s. Pas de nouvelle source de prix, pas de modification du réseau WebSocket existant.

Chaque événement brut traverse le Firewall ; l’événement enrichi le traverse une seconde fois avant SQLite/cache. Provenance, champs bruts utiles, unité, prix de référence, reçu de conversion et décision Firewall sont enregistrés. Déduplication pendant la normalisation, dans le tampon et à la relecture SQLite, y compris les identifiants fournisseur des anciens enregistrements. Sans identifiant unique fournisseur, une empreinte des champs publics déduplique les replays : la précision reste limitée à ces champs.

Les statistiques agrègent désormais **toute la fenêtre SQLite**, sans plafond 500 ni substitution par le tampon. Elles exposent nombre d’événements, nombre valorisé/N/D, montant observé par source, raisons d’indisponibilité et bornes temporelles. Les anciens enregistrements sans reçu sont préservés, comptés comme non vérifiés et ne sont pas recalculés rétroactivement avec les prix actuels.

`coveredNotionalUsd=null` lorsqu’aucun montant n’est fiable ; `totalNotionalUsd=null` lorsqu’une partie manque. L’UI indique `≥` pour un montant partiel, compte les événements distinctement, montre toutes les paires suivies et les sources/statuts des flux. Même complet pour les événements reçus, le montant n’est jamais présenté comme un total de marché.

Références officielles utilisées pour les unités : [CoinGecko — erreurs et limites](https://docs.coingecko.com/docs/errors-and-rate-limits), [Binance — streams Futures](https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/All-Market-Liquidation-Order-Streams), [OKX — instruments et liquidation-orders](https://www.okx.com/docs-v5/en/), [Bybit — All Liquidation](https://bybit-exchange.github.io/docs/v5/websocket/public/all-liquidation).

## Tests locaux — fixtures uniquement

Node 22.23.3, SQLite temporaire, vrais contrôles du Data Firewall pour les scénarios de frontière, serveurs HTTP locaux. Aucun appel fournisseur réel ni injection GEN-1. Firefox headless 153.0 via Playwright de l’environnement QA, aucune dépendance ajoutée au runtime.

| Suite | Résultat |
| --- | --- |
| `test_coingecko_limits_v2.js` | 7/7 : déduplication, copies indépendantes, absence de cache brut, 429/Retry-After/pause, zéro retry, budget persistant, ancien réglage rapide, maintien CeFi, Firewall de l’enrichissement, absence de refresh redondant |
| `test_liquidations_usd_v2.js` | 7/7 : unités/côtés, base/linéaire/inverse, conversion et métadonnées dédupliquées, double contrôle Firewall, replays simultanés/après redémarrage, erreurs/N/D, 600 événements agrégés, anciens reçus absents, contrats non supportés et prix d’ordre seul |
| `test_financial_cached_read_v2.js` | 3/3 : contrats UI/fresh/force et échec Firewall conservés |
| `test_dex_liquidity_boundary_v2.js` | 9/9 : contrat de l’étape 2, cache/expiration/SQLite/refus conservés |
| `test_statistics_ui_v2.js` | 8/8 Firefox : régressions étape 3 + liquidations toutes paires, montant partiel, comptes, sources, N/D explicite ; résolutions 1440/1024/768/390 pour les pools |
| Scripts complémentaires | 26 PASS / 29 exécutés ; détails ci-dessous |

Trois échecs préexistants reproduits à l’identique sur l’archive du parent `edfe0c8...` et sur le correctif : `test_risk_gate_boundary.js` (« Risk verification must route through Router CP1 »), `test_client_action_ack_v1.js` (`chart.add_indicator` absent), `test_router_normalization_v1.8.12.js` (ACTIVE au lieu de RESERVED). Aucun masquage ni modification de ces tests. Le nouveau test Firefox a d’abord échoué parce qu’il ne déclenchait pas le chemin de relecture des données ; corrigé et suite 8/8 réexécutée.

Commandes principales depuis la racine, Node 22 :

```bash
node --test App/MarketData/Tests/test_coingecko_limits_v2.js \
  App/MarketData/Tests/test_liquidations_usd_v2.js \
  App/MarketData/Tests/test_financial_cached_read_v2.js \
  App/MarketData/Tests/test_dex_liquidity_boundary_v2.js
node --test App/UI/Tests/test_statistics_ui_v2.js
```

La suite Firefox demande Playwright/Firefox dans l’environnement QA. `IATB_FIREFOX_CONTAINER=1` adapte seulement les préférences du navigateur de test aux conteneurs sans namespaces. Le validateur GEN-1 est contrôlé syntaxiquement ici ; son résultat réel n’est pas revendiqué.

## Déploiement manuel GEN-1 — Overflow uniquement

Reprendre le Compose DEBUG local `compose.debug-v2-01.yml` utilisé pour les étapes précédentes ; ce fichier spécifique à GEN-1 n’est pas versionné dans ce dépôt. Ne pas le remplacer par un autre Compose. Router inchangé : seuls **marketdata et ui** sont recréés, avec leur namespace Router actuel. Les autres services/projets/volumes restent en place.

```bash
cd ~/IA-TB-debug-v2-01
bash <<'DEPLOY'
set -euo pipefail
test "$(git branch --show-current)" = debug-v2.01
git diff --exit-code HEAD -- App
git pull --ff-only origin debug-v2.01
test "$(cat App/VERSION)" = 2.0.1
test -f compose.debug-v2-01.yml
sudo docker build -t iatb:debug-v2.01 -f App/Dockerfile.app App
export IATB_UID="$(id -u)" IATB_GID="$(id -g)"
sudo --preserve-env=IATB_UID,IATB_GID docker compose \
  -p iatb-debug-v2-01 -f compose.debug-v2-01.yml --profile manual-stack \
  up -d --no-deps --no-build --pull never --force-recreate marketdata ui
DEPLOY
```

Après démarrage, attendre l’enrichissement exchanges initial s’il n’est pas encore disponible (délai habituel au moins 2 min). Contrôle rapide réel :

```bash
sudo docker exec -i -w /opt/iatb/App iatb-debug-v2-01-marketdata-1 node - \
  < App/MarketData/Tests/validate_step4_gen1.js
```

`GEN1_STEP4_SMOKE_PASS` exige un snapshot CeFi validé/exchanges disponibles, trois lectures UI non forcées, des événements valorisés avec reçus et décision Firewall, et égalité avec une connexion SQLite en lecture seule. Code retour 2 / `GEN1_STEP4_PENDING` si aucune nouvelle liquidation valorisable ou pause/erreur CoinGecko ; attendre les événements réels puis relancer. Ne pas injecter de fixture, simuler un 429, forcer des appels ou réécrire l’historique.

Observation passive des cycles normaux (65 min, terminal ouvert) :

```bash
sudo docker exec -i -e IATB_STEP4_OBSERVE_MS=3900000 -w /opt/iatb/App \
  iatb-debug-v2-01-marketdata-1 node - < App/MarketData/Tests/validate_step4_gen1.js
```

Résultat attendu : `GEN1_STEP4_OBSERVATION_PASS`, HTTP 200 global/markets réellement observés dans la période, date CeFi renouvelée et exchanges conservés, pas de nouveau 429. Les conditions PENDING initiales restent signalées : si elles disparaissent pendant l’observation, refaire le contrôle rapide et joindre les deux sorties. Examiner les chemins HTTP et comparer les compteurs avant/après les trois lectures ; une collecte périodique indépendante peut tomber dans cet intervalle. Une ancienne configuration à 20 pages/cycle ou des recherches intensives peuvent consommer la réserve : réduire la demande dans les réglages existants, pas le garde. Les échecs restent affichés avec le dernier snapshot validé.

Pour un vrai 429 survenant naturellement : conserver la sortie avec `cooldownUntil`, vérifier l’absence d’appels CoinGecko pendant la pause et la conservation des valeurs/dates CeFi ; après la pause vérifier la reprise des 200. La persistance de pause est testée localement ; ne pas redémarrer GEN-1 uniquement pour provoquer ce cas. Vérifier le budget partagé avec les autres stacks si le fournisseur refuse encore les requêtes.

Non-régression réelle DexScreener :

```bash
sudo docker exec -i -w /opt/iatb/App iatb-debug-v2-01-marketdata-1 node - \
  < App/MarketData/Tests/validate_dex_liquidity_gen1.js
```

Résultat attendu : `GEN1_DEX_LIQUIDITY_PASS` (ce test réel effectue la collecte et attend l’expiration du cache selon le protocole validé à l’étape 2).

## Vérifications Firefox et accord final

1. `Ctrl+Maj+R`, Statistiques CeFi : volumes, parts exchanges, historique et OI toujours lisibles. Les lectures snapshot utilisent `force:false`, `staleWhileRevalidate:true` ; navigation/période ne provoque pas de refresh forcé.
2. Liquidations : « observées · 24 h », toutes paires ; montant observé et `≥` si partiel, nombre d’événements valorisés/N/D, montants/sources et état des flux. Comparer aux champs `stats` du validateur. Pas de zéro USD inventé et pas d’affirmation d’exhaustivité mondiale. Vérifier largeur 390/768/1024/1440 et zoom 125 %.
3. Prix de faillite OKX/Bybit annoncé, pas prix d’exécution garanti. Un événement sans taux/métadonnées/reçu reste N/D ; sa raison figure dans `unavailableReasons`. Les anciens montants ne deviennent pas fiables au redémarrage.
4. DeFi : Top Pools, coût d’exécution et historiques inchangés, ETH/USDC avec provenance DexScreener et validation Firewall. Console sans nouvelle erreur ; absence de `UI_READ_DENY`.
5. Vérifier le Trading Engine toujours arrêté et les autres stacks inchangées. Joindre sorties rapides/observation/DexScreener et captures à Overflow. Attendre sa validation puis son accord explicite avant de préparer 2.0.2.

## Liste exacte des régressions complémentaires

| Script | Résultat |
| --- | --- |
| `App/MarketData/Tests/test_firewall_cache_boundary_v1.js` | PASS |
| `App/MarketData/Tests/test_liquidity_pipeline_v1.js` | PASS |
| `App/MarketData/Tests/test_financial_async_fastlane_v1.js` | PASS |
| `App/MarketData/Tests/test_financial_family_scheduler_v1.js` | PASS |
| `App/MarketData/Tests/test_financial_data_contract_v2.js` | PASS |
| `App/MarketData/Tests/test_open_interest_currency_normalization_v1.js` | PASS |
| `App/MarketData/Tests/test_currency_registry_v1.js` | PASS |
| `App/MarketData/Tests/test_phase1_provider_profiles_v1.js` | PASS |
| `App/MarketData/Tests/test_phase2_weighted_budget_v1.js` | PASS |
| `App/MarketData/Tests/test_phase3_special_limits_v1.js` | PASS |
| `App/MarketData/Tests/test_api_request_orchestrator_shadow_v1.js` | PASS |
| `App/MarketData/Tests/test_native_http_429_interrupted_v1.js` | PASS |
| `App/MarketData/Tests/test_native_http_429_cooldown_v1.js` | PASS |
| `App/MarketData/Tests/test_native_retry_after_v1.js` | PASS |
| `App/MarketData/Tests/test_native_http_failclosed_v1.js` | PASS |
| `App/MarketData/Tests/test_native_budget_safety_v1.js` | PASS |
| `App/MarketData/Tests/test_native_lite_cache_dedup_v1.js` | PASS |
| `App/MarketData/Tests/test_native_http_enforcement_v1.js` | PASS |
| `App/MarketData/Tests/test_native_http_dispatcher_v1.js` | PASS |
| `App/MarketData/Tests/test_native_transport_bridge_v1.js` | PASS |
| `App/MarketData/Tests/test_transport_budget_bridge_v1.js` | PASS |
| `App/UI/Tests/test_ui_contract_v2.js` | PASS |
| `App/UI/Tests/test_architecture_boundaries_v2.0.js` | PASS |
| `App/Core/Firewall/Tests/market_data_firewall.test.js` | PASS |
| `App/Core/Firewall/Tests/trading_firewall.test.js` | PASS |
| `App/Core/Communication/Tests/test_ui_dex_liquidity_read_v2.js` | PASS |
| `App/Core/Firewall/Tests/test_risk_gate_boundary.js` | ÉCHEC PRÉEXISTANT |
| `App/Core/Communication/Tests/test_client_action_ack_v1.js` | ÉCHEC PRÉEXISTANT |
| `App/Core/Communication/Tests/test_router_normalization_v1.8.12.js` | ÉCHEC PRÉEXISTANT |

## Fichiers modifiés

- `App/CHANGELOG.md`
- `App/Frontend/JS/statistiques_v1.0.js`
- `App/Frontend/Pages/statistiques_v1.0.html`
- `App/MarketData/Collectors/liquidation_stream_manager.js`
- `App/MarketData/Collectors/microstructure_collector.js`
- `App/MarketData/Config/market_data_settings.js`
- `App/MarketData/Financial/financial_collector.js`
- `App/MarketData/Normalizer/liquidations.js`
- `App/MarketData/Provider/coingecko_provider.js`
- `App/MarketData/Provider/http_json.js`
- `App/MarketData/Provider/microstructure_provider.js`
- `App/MarketData/Storage/api_telemetry_store.js`
- `App/MarketData/Storage/microstructure_store.js`
- `App/MarketData/Tests/test_coingecko_limits_v2.js`
- `App/MarketData/Tests/test_liquidations_usd_v2.js`
- `App/MarketData/Tests/validate_step4_gen1.js`
- `App/MarketData/Workers/binance_liquidations_worker.js`
- `App/MarketData/Workers/bybit_liquidations_worker.js`
- `App/MarketData/Workers/okx_liquidations_worker.js`
- `App/MarketData/market_data_service.js`
- `App/UI/Tests/test_statistics_ui_v2.js`
- `Documentation/FINAL_STEP4_DEBUG_2.0.1.md`
