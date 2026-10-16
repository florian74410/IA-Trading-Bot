# DEBUG 2.0.4 — Rendu des indicateurs Trading IA

## Base et périmètre

Travail sur la branche existante `debug-v2.01`, depuis le commit GitHub `9d674c808bf43cc080acaa0b15cc364dbe168522`. La copie locale a été avancée jusqu’à ce commit avant modification. Les correctifs Statistiques, sélecteurs réseau/DEX, CoinGecko, liquidations et DexScreener publiés après l’étape 4 précédente sont conservés.

Version applicative portée de **2.0.2.1 à 2.0.4 DEBUG**, conformément à la nouvelle mission. Aucun changement du Router, des autorisations, de l’authentification, du Firewall, de l’Indicator Engine mathématique, des fournisseurs ou des données persistantes. Aucun ajout de dépendance runtime. Aucun déploiement GEN-1 effectué et aucun Trading Engine démarré.

## Causes reproduites

1. Les feuilles de style cachaient `#chartArea > #indicatorDock`, le seul dock créé par le HTML/JavaScript actuel. Elles ciblaient un remplacement `#iatbIndicatorDock` / `#tdIndicatorDockBody` absent du DOM. Le test Firefox reproduit un calcul RSI/MACD réussi avec panneau invisible sur le parent.
2. Le renderer natif parcourait `Object.keys(this.series)` avec une fonction qui utilisait `this.series` sans conserver `this`. Firefox levait « can't access property series, this is undefined » pendant le dessin. Un HTTP 200/calcul READY ne garantissait donc pas un dessin terminé.
3. Le contrôleur et le lecteur JSON reconstruisaient le même panneau ; l’UI appelait le contrôleur directement puis à nouveau par événement. Le lecteur séparé utilisait l’index complet des résultats plutôt que la fenêtre temporelle réellement visible des bougies.
4. Des règles de hauteur plus spécifiques pouvaient encore couper le bas du dock après rétablissement de sa visibilité. Le bouton Restaurer était aussi masqué en mode agrandi par une règle CSS plus spécifique.
5. Les rafraîchissements pendant un calcul pouvaient être abandonnés comme BUSY ; une réponse ancienne pouvait ensuite être appliquée après changement de marché/timeframe/sélection. Le contexte du contrôleur ne distinguait pas deux exchanges affichant le même symbole/timeframe.

## Comportement livré

- Le dock existant reste visible sous les bougies, entièrement compris dans la zone graphique. Sa hauteur est bornée, ses panneaux sont accessibles par défilement ; aucun nouveau dock concurrent ni refonte générale.
- Le contrôleur dessine les superpositions de prix ; un seul lecteur possède le DOM des sous-graphiques. L’API `applyIndicatorBatch` reste disponible et actualise les deux surfaces. Chaque batch UI est appliqué une fois.
- Les oscillateurs utilisent les timestamps des bougies visibles, normalisés en secondes depuis les timestamps moteur en millisecondes. Alignement horizontal réel avec les bougies, suivi du pan/zoom/redimensionnement, sans nouveau calcul pour un simple déplacement de fenêtre.
- RSI/MACD et les autres panneaux séparés gardent leur propre échelle ; les bornes nulles ne deviennent pas zéro, les bornes explicites zéro sont respectées. Histogramme MACD avec origine zéro, sorties points/markers/area/bars prises en charge dans le lecteur JSON.
- EMA, moyennes, Bollinger, Ichimoku et autres superpositions restent sur les prix ; SAR est dessiné en points. Les trous de chauffe restent nulls, les sorties `chart:false` sont exclues. Aucun calcul technique ajouté au navigateur : les valeurs proviennent toujours de l’Indicator Engine.
- Le contexte comprend exchange, paire, timeframe et une révision lors de ses changements. Les réponses tardives d’un ancien contexte/sélection sont écartées. Une mise à jour normale de la bougie courante ne fait pas rejeter indéfiniment un calcul valide du même contexte.
- Les calculs simultanés identiques partagent la même requête. Une demande différente pendant un calcul est reprise après celui-ci. Un résultat identique peut être réutilisé 15 s pour éviter les recalculs sur une simple réaffichage.
- Trading IA attend ses propres bougies avant le calcul ; il ne bascule pas silencieusement sur les bougies d’une autre source. Les sous-graphiques sans valeurs, en chauffe ou en erreur restent explicites. Si MFI manque de volume, RSI peut toujours être affiché.
- Le panneau distingue désormais **calculs reçus** et **tracés/superpositions réellement disponibles**, sans remplacer une valeur manquante par zéro.
- Les paramètres de cache des assets changés sont renouvelés ; la référence partagée du Chart Viewer est renouvelée aussi. Les sélections restent dans la même clé de préférences existante.

## Vérifications locales

Node **22.23.3**, Firefox headless **153.0** via Playwright installé uniquement dans l’environnement QA. Le test Trading utilise les vrais HTML/CSS/JS et le vrai calcul Indicator Engine sur des bougies locales synthétiques. Le transport HTTP y est simulé ; aucun appel réel fournisseur ni ordre n’est exécuté. Ce résultat ne constitue pas une validation GEN-1.

| Suite | Résultat |
| --- | --- |
| `App/UI/Tests/test_trading_indicators_v204.js` | **11/11** : dock visible/non coupé, pixels MACD et superpositions, 20 indicateurs natifs, timestamps/pan/zoom/redimensionnement 1440/1024/768/390, chauffe/null/bornes, modes JSON, erreurs, concurrence, source/paire/timeframe, retrait pendant calcul, agrandir/restaurer/recharger, volume manquant partiel |
| Six tests locaux `App/Indicators/Tests/test_*.js` hors CP/1 serveur | **6/6 scripts PASS** : moteur, analyse, registre complet, IIL, IR, paramètres |
| CoinGecko, liquidations, lecture financière en cache, frontière DEX, volume global extrême | **28/28 scénarios PASS**, suites existantes inchangées |
| Régressions complémentaires hors les six scripts Indicator ci-dessus | **12 PASS / 15 scripts**, trois échecs historiques ci-dessous |
| Firefox Statistiques `test_statistics_ui_v2.js` | **7/8**, même résultat sur le parent GitHub |
| Syntaxe des JS modifiés et cohérence des quatre métadonnées de version | PASS ; `git diff --check` PASS |

Échecs préexistants reproduits sur une archive de `9d674c80` :

- `test_risk_gate_boundary.js` : assertion textuelle « Risk verification must route through Router CP1 ».
- `test_client_action_ack_v1.js` : `chart.add_indicator` absent dans la représentation attendue par le test historique du registre Router. Ce test ne vérifie pas le rendu sélectionné dans la fenêtre ƒx ; aucun élargissement de permissions n’a été réalisé pour le faire passer.
- `test_router_normalization_v1.8.12.js` : ACTIVE au lieu de RESERVED.
- `test_statistics_ui_v2.js`, premier scénario : attend l’ancien texte `COÛT TOTAL` immédiatement suivi de `Indisponible`, alors que les modifications déjà publiées affichent `COÛT TOTAL · NON CHIFFRABLE`. Le même échec existe avant ce correctif. Aucun fichier de production Statistiques ni son test n’est modifié.

Commandes depuis la racine, avec Node 22 et Playwright/Firefox disponibles côté QA :

```bash
node --test App/UI/Tests/test_trading_indicators_v204.js
node --test App/MarketData/Tests/test_coingecko_limits_v2.js \
  App/MarketData/Tests/test_liquidations_usd_v2.js \
  App/MarketData/Tests/test_financial_cached_read_v2.js \
  App/MarketData/Tests/test_dex_liquidity_boundary_v2.js \
  App/MarketData/Tests/test_coingecko_global_volume_hotfix_v201.js
```

`IATB_FIREFOX_CONTAINER=1` adapte uniquement le navigateur de test aux conteneurs QA sans namespaces. Le test CP/1 historique `test_indicator_cp1_v2.js`, qui exige des services démarrés, n’a pas été exécuté comme test local autonome. Un contrôle réel est fourni ci-dessous. Les tests et le validateur ne sont pas inclus dans l’image applicative (`.dockerignore`).

## Déploiement manuel sur GEN-1

À exécuter par Overflow dans le checkout DEBUG habituel, après vérification du SHA livré. Le fichier `compose.debug-v2-01.yml` est celui présent sur GEN-1, non versionné ici : ne pas le remplacer par les autres Compose du dépôt.

Le correctif fonctionnel concerne l’UI. Pour afficher **2.0.4** de façon cohérente dans les health/status des services, la procédure ci-dessous recrée uniquement les services déjà démarrés de cette stack DEBUG, y compris ceux qui partagent le namespace Router. Elle refuse une liste contenant Trading. Brève interruption de cette stack, sans suppression de volume ni arrêt d’une autre stack.

```bash
cd ~/IA-TB-debug-v2-01
bash <<'DEPLOY'
set -euo pipefail
test "$(git branch --show-current)" = debug-v2.01
git diff --exit-code HEAD -- App
git pull --ff-only origin debug-v2.01
git log -1 --oneline
test "$(cat App/VERSION)" = 2.0.4
test -f compose.debug-v2-01.yml
sudo docker build -t iatb:debug-v2.01 -f App/Dockerfile.app App
export IATB_UID="$(id -u)" IATB_GID="$(id -g)"
dc=(sudo --preserve-env=IATB_UID,IATB_GID docker compose
    -p iatb-debug-v2-01 -f compose.debug-v2-01.yml --profile manual-stack)
mapfile -t services < <("${dc[@]}" ps --services --status running)
test "${#services[@]}" -gt 0
for service in "${services[@]}"; do
  case "$service" in *trading*) echo 'Trading présent : vérifier la stack avant cette procédure.' >&2; exit 1;; esac
done
for required in router core ui firewall marketdata; do
  [[ " ${services[*]} " == *" $required "* ]]
done
"${dc[@]}" stop "${services[@]}"
"${dc[@]}" up -d --no-deps --no-build --pull never --force-recreate "${services[@]}"
DEPLOY
```

## Validation réelle et Firefox

Contrôle du parcours de données réellement utilisé par le graphique, sans bougies synthétiques :

```bash
sudo docker exec -i -w /opt/iatb/App iatb-debug-v2-01-ui-1 node - \
  < App/Indicators/Tests/validate_trading_indicators_gen1.js
```

Résultat attendu : `GEN1_INDICATOR_DATA_PASS`, trois calculs READY (RSI/MACD/EMA), timestamps identiques aux bougies réelles et source conservée. Le script vérifie les données, **pas les pixels dans Firefox**. Source/paire/timeframe réglables via `docker exec -e IATB_VALIDATE_SOURCE=... -e IATB_VALIDATE_SYMBOL=... -e IATB_VALIDATE_TIMEFRAME=...` ; choisir une paire réellement disponible chez ce fournisseur. Aucun démarrage de service, aucune injection en base et aucun appel Trading.

Dans Firefox via le tunnel habituel :

1. Recharger `/ia-trading` avec `Ctrl+Maj+R`. Vérifier les assets modifiés `?v=2040` dans Réseau et la version runtime 2.0.4 après recréation des services.
2. Sélectionner RSI et MACD dans ƒx Indicateurs. Voir le dock sous les bougies ; faire défiler son contenu pour atteindre MACD. Le compteur indique les tracés, les courbes sont visibles et MACD possède un histogramme autour de zéro.
3. Ajouter EMA/Bollinger/SAR : courbes/points sur le prix, pas un second graphique de prix dans le dock. Retirer un indicateur ; sa courbe et son panneau doivent disparaître.
4. Déplacer et zoomer le graphique : les panneaux suivent exactement la même fenêtre de temps. Changer rapidement exchange, paire et timeframe pendant un calcul ; aucune réponse de l’ancien contexte ne doit remplacer les nouveaux indicateurs.
5. Tester 1440/1024/768/390 px, Agrandir puis Restaurer et un rechargement : dock accessible, défilement possible, sélection conservée. Console sans nouvelle exception `this.series`.
6. Si les bougies sont insuffisantes ou le volume manque, vérifier l’état explicite plutôt qu’une fausse courbe à zéro. Une erreur d’indicateur ne doit pas faire disparaître les bougies ni les autres calculs réussis.
7. Vérifier Statistiques CeFi/DeFi et les sélecteurs réseau/DEX déjà publiés ; vérifier le Trading Engine toujours arrêté et les autres stacks inchangées.

Cette validation visuelle/fonctionnelle GEN-1 reste à effectuer. Le correctif de rendu est testé localement ; aucune réussite GEN-1 n’est revendiquée par cette livraison.

## Liste exhaustive des fichiers modifiés

- `App/CHANGELOG.md`
- `App/Frontend/CSS/trading_ia_v2.css`
- `App/Frontend/JS/chart_controller_native_v1.2.js`
- `App/Frontend/JS/indicator_json_reader_v2.0.js`
- `App/Frontend/JS/indicator_ui_v2.0.js`
- `App/Frontend/Pages/app_v1.0.html`
- `App/Frontend/Pages/chart_viewer_v1.0.html`
- `App/Indicators/Tests/validate_trading_indicators_gen1.js`
- `App/UI/Tests/test_trading_indicators_v204.js`
- `App/VERSION`
- `App/manifest.json`
- `App/package-lock.json`
- `App/package.json`
- `Documentation/INDICATORS_DEBUG_2.0.4.md`

## Scripts complémentaires exécutés

| Script | Résultat |
| --- | --- |
| `App/Indicators/Tests/test_indicator_analysis_v1.js` | PASS |
| `App/Indicators/Tests/test_indicator_language_v2.js` | PASS |
| `App/Indicators/Tests/test_indicator_engine.js` | PASS |
| `App/Indicators/Tests/test_indicator_complete_v2.js` | PASS |
| `App/Indicators/Tests/test_indicator_ir_v2.js` | PASS |
| `App/Indicators/Tests/test_indicator_settings_v1.js` | PASS |
| `App/UI/Tests/test_ui_contract_v2.js` | PASS |
| `App/UI/Tests/test_architecture_boundaries_v2.0.js` | PASS |
| `App/UI/Tests/test_ui_routes_v2.js` | PASS |
| `App/UI/Tests/test_engine_http_surface_v2.0.js` | PASS |
| `App/Core/Communication/Tests/test_ui_dex_liquidity_read_v2.js` | PASS |
| `App/Core/Firewall/Tests/market_data_firewall.test.js` | PASS |
| `App/Core/Firewall/Tests/trading_firewall.test.js` | PASS |
| `App/MarketData/Tests/test_financial_async_fastlane_v1.js` | PASS |
| `App/MarketData/Tests/test_financial_family_scheduler_v1.js` | PASS |
| `App/MarketData/Tests/test_financial_data_contract_v2.js` | PASS |
| `App/MarketData/Tests/test_liquidity_pipeline_v1.js` | PASS |
| `App/MarketData/Tests/test_open_interest_currency_normalization_v1.js` | PASS |
| `App/Core/Firewall/Tests/test_risk_gate_boundary.js` | ÉCHEC PRÉEXISTANT |
| `App/Core/Communication/Tests/test_client_action_ack_v1.js` | ÉCHEC PRÉEXISTANT |
| `App/Core/Communication/Tests/test_router_normalization_v1.8.12.js` | ÉCHEC PRÉEXISTANT |
