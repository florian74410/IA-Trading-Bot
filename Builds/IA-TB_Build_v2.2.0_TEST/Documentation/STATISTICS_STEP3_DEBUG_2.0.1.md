# Statistiques — Étape 3/4 — DEBUG 2.0.1

## État de livraison

Branche `debug-v2.01`, version applicative 2.0.1. Étapes 1 et 2 validées sur GEN-1 par Overflow ; référence initiale `7561bdfe30b39d973cacb0ae4cecd4e11ab61fde`. Aucun déploiement GEN-1 exécuté ici. **L’étape 3 reste en attente de validation visuelle et fonctionnelle par Overflow sur GEN-1.** Étape 4 non commencée.

Le Provider DexScreener, son Collector, le client Firewall, ses règles et le stockage SQLite validés à l’étape 2 restent inchangés. Aucun fournisseur ni dépendance applicative ajouté. Les fixtures restent exclusivement dans les fichiers de test.

## Corrections et limites des sources

| Module | Comportement livré / limite |
| --- | --- |
| Top Pools | Listes réellement mises en page : rang, paire, protocole, réseau, valeur, source ; séparation des lignes, texte adaptable. Liquidité et volume en premier, puis TVL et APY. Rang limité aux pools reçues, pas à tout le marché. |
| Paire de référence | ETH/USDC, cohérente avec la validation GEN-1. Ces modules DeFi sont désormais dans l’onglet DeFi. |
| TVL / APY par pool | Snapshot actuel DeFiLlama : `yieldPools:[]`. DexScreener ne fournit pas ces métriques. Indisponibilité explicite ; la liquidité ne remplace pas la TVL et aucun rendement n’est inventé. Si un snapshot validé contient ces métriques, classement numérique, APY nul conservé, champ absent exclu. Aucun seuil arbitraire de TVL/APY. APR n’est pas déduit d’APY. |
| Coût d’exécution | Pool de référence = pool reçue ayant la plus grande liquidité positive, avec adresse/paire/DEX/réseau affichés. Montant simulé en USD. Aucun coût total fiable avec les sources actuelles : total affiché indisponible. |
| Impact théorique | Modèle de pool équilibrée x·y=k : `a / (L/2+a) × 100` (%), puis `a × impact/100` (USD), où `a` est le montant simulé et `L` la liquidité USD de **cette pool**, jamais l’agrégat DexScreener. Hypothèse pédagogique, inadaptée à une cotation de liquidité concentrée ; hors frais, gas, routage et MEV. Ce n’est pas une mesure du slippage réel. |
| Frais DEX / gas | Taux éventuel extrait d’un label API, clairement indicatif et non vérifié pour le swap. Sinon N/D. Gas N/D sans estimation RPC validée ; aucune composante n’est remplacée par zéro. Les petites valeurs monétaires ne sont plus arrondies abusivement à zéro. |
| TVL DeFi | Agrégat des chaînes fourni par le Collector DeFiLlama, avec limite de chevauchement signalée. Donut = catégories de protocoles suivies, avec son propre dénominateur affiché ; pas le total TVL des chaînes. |
| Volume DEX | KPI 24 h, protocoles et réseaux restent issus des snapshots DeFiLlama. Valeur absente = N/D. Historique 1H/24H = observations de volume **glissant 24 h** ; 7J/30J = série **journalière** DeFiLlama. Les boutons désignent une fenêtre d’observation, pas un volume recomputé sur cette fenêtre. |
| Historique CeFi | Même distinction pour le volume glissant 24 h de l’échantillon CEX CoinGecko. Les timestamps du fournisseur/famille sont utilisés et dédupliqués ; les points anciens/futurs sont exclus de la fenêtre sélectionnée. Aucun historique hors période n’est étiré pour remplir un graphique vide. Espacement horizontal proportionnel aux timestamps. |
| Stablecoins | Barres vertes/rouges = hausse/baisse **nette de capitalisation USD** entre observations datées. Dates, unités, source et montants dans les titres SVG. Ce ne sont pas des entrées/sorties brutes, ni un flux mesuré garanti sur 24 h. Aucun faux zéro pour une donnée absente. |
| Bridges | N/D : aucun fournisseur de volume bridge connecté. |
| CeFi exchanges | Volumes et parts CoinGecko conservés. Le score de confiance est nommé comme tel ; il n’est plus présenté comme une mesure de liquidité. Les volumes par actif CoinGecko ne sont pas décrits comme exclusivement centralisés. |
| Open Interest | Cause du refus UI corrigée : action existante désormais autorisée en READ_ONLY, avec uniquement `symbol`. Affichage OI BTC perpétuels en USD, nombre/noms des CEX et couverture partielle ; DEX exclus de la liste CEX. Erreurs fournisseur ou absence de venues visibles. |
| Liquidations | Actions existantes stats et état des flux autorisées en READ_ONLY avec paramètres limités. BTC, fenêtre 24 h, échantillon d’au plus 500 événements du contrat existant, sources et état des flux affichés. Notionnels incomplets marqués `≥`. Zéro événement n’est pas une preuve de zéro liquidation sur tout le marché : N/D. |

Des restrictions géographiques, déconnexions WebSocket, conversions de devises indisponibles ou réponses fournisseur manquantes peuvent encore limiter OI/liquidations. Ces limites sont affichées sans nouvelle source et sans contourner le Data Firewall. La couverture ne devient jamais un agrégat mondial par simple changement de libellé.

## Rafraîchissement et frontière technique

- Auparavant : six appels financiers simultanés à chaque chargement/changement de période CeFi, dont un snapshot forcé au premier chargement ; `Promise.all` bloquait tout le rendu jusqu’au fournisseur le plus lent.
- Désormais : trois lectures CP/1 pour une première vue DeFi (snapshot, historique DeFi, DexScreener), cinq pour CeFi (snapshot, historique CeFi, OI, liquidations, statut des flux). Les deux sondes UI/Core existantes sont conservées. La vue Serveur ne déclenche aucune collecte financière.
- Chaque source rend indépendamment. Les erreurs sont visibles, avec conservation des dernières données reçues. Déduplication des requêtes identiques en cours et réutilisation pendant 30 s. Un changement de période CeFi ne demande que son historique ; DeFi utilise les séries déjà reçues.
- Actualisation automatique toutes les 60 s uniquement pour la vue financière affichée et si la page est visible. Retour de visibilité/navigation : réutilisation des demandes récentes.
- Le snapshot financier accepte un **nouveau paramètre optionnel** `staleWhileRevalidate:true`, déclaré dans le registre CP/1 et limité dans le Router. S’il existe, le dernier snapshot déjà validé par Firewall/quality gate est renvoyé immédiatement avec ses timestamps d’origine, puis les familles périmées se rafraîchissent en arrière-plan. Pas de données en cache : contrat habituel, attente de la collecte validée. Les autres consommateurs et `force:true` gardent leur comportement existant.
- Quand les métadonnées indiquent un snapshot ancien, une seule relecture non forcée à 15 s permet d’afficher un rafraîchissement terminé. Pas de boucle de polling rapide. Si le fournisseur reste indisponible, les données gardent leur date et leur indication d’ancienneté.
- Timeout navigateur 15 s, Router CP/1 existant 12 s, proxy UI existant 20 s. Les requêtes lentes ne bloquent plus les autres modules ; aucun relèvement de timeout, changement de retry, de budget ou de quota global CoinGecko.

## Tests locaux exécutés

Node **22.23.3**, Firefox headless **153.0** via Playwright installé dans l’environnement QA, sans ajout dans `App/package.json`. Navigation globale isolée dans les tests de composant ; les vrais HTML/JS/CSS Statistiques sont utilisés. Les fixtures et serveurs locaux ne tournent pas sur GEN-1.

| Vérification | Résultat |
| --- | --- |
| `App/UI/Tests/test_statistics_ui_v2.js` | 7/7 scénarios : classements/TVL/APY manquants, frais et formule, historiques et signes/unités, fournisseur lent, erreurs/dernières données, navigation/déduplication, relecture bornée et valeurs nulles |
| Résolutions Firefox | 1440, 1024, 768, 390 px : pas de débordement horizontal des lignes/groupes/coût ni de la page ; captures inspectées |
| `App/MarketData/Tests/test_financial_cached_read_v2.js` | 3/3 : cache validé renvoyé avant refresh, contrats fresh/force inchangés, échec Firewall en cold start propagé |
| `App/Core/Communication/Tests/test_ui_dex_liquidity_read_v2.js` | PASS : transport CP/1 signé, trois nouvelles lectures + option snapshot autorisées, paramètres non autorisés refusés ; contrat DexScreener conservé |
| `App/MarketData/Tests/test_dex_liquidity_boundary_v2.js` | 9/9, régression étape 2 : vrai client/règles Firewall et vraie base SQLite temporaire |
| `test_firewall_cache_boundary_v1.js`, `test_liquidity_pipeline_v1.js` | PASS |
| `test_financial_async_fastlane_v1.js`, `test_financial_family_scheduler_v1.js`, `test_financial_data_contract_v2.js` | PASS |
| `test_ui_contract_v2.js`, `test_architecture_boundaries_v2.0.js` | PASS |
| `market_data_firewall.test.js`, `trading_firewall.test.js` | PASS |

Les dix scripts de régression ci-dessus passent. Trois échecs historiques déjà reproduits avant l’étape 3 ont été réexécutés et restent identiques : `test_risk_gate_boundary.js` (assertion textuelle « Risk verification must route through Router CP1 »), `test_client_action_ack_v1.js` (`chart.add_indicator` absent), `test_router_normalization_v1.8.12.js` (Supervisor ACTIVE au lieu de RESERVED). Ils ne sont pas masqués et restent hors de ce correctif.

Commandes QA (Playwright et son navigateur doivent être installés hors dépendances runtime) :

```bash
node --test App/UI/Tests/test_statistics_ui_v2.js
node --test App/MarketData/Tests/test_financial_cached_read_v2.js
node App/Core/Communication/Tests/test_ui_dex_liquidity_read_v2.js
node --test App/MarketData/Tests/test_dex_liquidity_boundary_v2.js
```

Dans un conteneur QA interdisant les namespaces Firefox, la suite dispose de `IATB_FIREFOX_CONTAINER=1` pour adapter uniquement le navigateur de test. Ce réglage ne concerne ni l’application ni le Firefox d’Overflow. Aucune fixture n’est installée dans l’image applicative ; les dossiers de tests sont exclus par `.dockerignore`.

## Déploiement manuel GEN-1

Ces commandes sont destinées à Overflow, pas exécutées par l’agent. La modification du Router exige de recréer aussi les services qui partagent son namespace réseau. Une simple recréation UI/Market Data laisserait des services attachés à l’ancien namespace.

Le bloc ci-dessous reprend le fichier Compose DEBUG confirmé sur GEN-1. Il mémorise les services **actuellement démarrés**, refuse une liste contenant Trading et ne touche qu’au projet `iatb-debug-v2-01`. Prévoir une brève interruption de cette stack DEBUG. Aucune suppression de volume ni arrêt d’une autre stack.

```bash
cd ~/IA-TB-debug-v2-01
bash <<'DEPLOY'
set -euo pipefail
test "$(git branch --show-current)" = debug-v2.01
git diff --exit-code HEAD -- App
git pull --ff-only origin debug-v2.01
test "$(cat App/VERSION)" = 2.0.1
sudo docker build -t iatb:debug-v2.01 -f App/Dockerfile.app App
export IATB_UID="$(id -u)" IATB_GID="$(id -g)"
dc=(sudo --preserve-env=IATB_UID,IATB_GID docker compose
    -p iatb-debug-v2-01 -f compose.debug-v2-01.yml --profile manual-stack)
mapfile -t services < <("${dc[@]}" ps --services --status running)
test "${#services[@]}" -gt 0
for service in "${services[@]}"; do
  case "$service" in *trading*) echo 'Trading présent : arrêter cette procédure et vérifier la configuration.' >&2; exit 1;; esac
done
for required in router core ui firewall marketdata; do
  [[ " ${services[*]} " == *" $required "* ]]
done
"${dc[@]}" stop "${services[@]}"
"${dc[@]}" up -d --no-build --pull never --force-recreate "${services[@]}"
DEPLOY
```

Contrôle de non-régression réelle étape 2 après déploiement :

```bash
sudo docker exec -i -w /opt/iatb/App iatb-debug-v2-01-marketdata-1 node - \
  < App/MarketData/Tests/validate_dex_liquidity_gen1.js
```

Résultat exigé : `GEN1_DEX_LIQUIDITY_PASS`. Ce contrôle effectue de vraies lectures, attend l’expiration et compare l’historique avec SQLite ; ne pas le confondre avec les fixtures QA.

## Contrôles Firefox sur GEN-1

1. Ouvrir le tunnel habituel, recharger avec `Ctrl+Maj+R`. Aller à `/statistiques#defi`. Vérifier que Top Pools et l’estimation sont dans DeFi ; volume/liquidité affichent la paire, le DEX, le réseau, les montants et DexScreener distinctement. TVL/APY expliquent leur absence si toujours non fournis.
2. Tester les largeurs 1440, 1024, 768 et 390 px (mode adaptatif Firefox) ainsi qu’un zoom 125 %. Pas de texte collé, débordement horizontal ou valeur masquée. Les listes peuvent naturellement augmenter la hauteur de la page.
3. Changer le montant simulé : valeur en USD, frais seulement si un label exploitable existe, impact théorique recalculé sur une seule pool, gas N/D, total indisponible. Comparer l’adresse affichée avec la pool reçue ; ne pas attendre une cotation exécutable.
4. Cliquer les périodes CeFi/DeFi 1H/24H/7J/30J : intitulés glissant/journalier corrects, dates dans la fenêtre, état explicite si trop peu de points. Aucun volume horaire ni point historique inventé.
5. Sur les stablecoins, survoler les barres : périodes datées et variation nette USD, vert pour hausse, rouge pour baisse. Bridges N/D, catégories et réseaux marqués DeFiLlama.
6. Dans CeFi, vérifier volumes/parts CoinGecko et OI BTC en USD avec noms/nombre des CEX réellement reçus. Une venue manquante doit rester signalée. Liquidations : couverture locale/partielle et statut des flux ; absence d’événement ≠ zéro mondial.
7. Dans Réseau (XHR/fetch), vérifier l’absence de `UI_READ_DENY` sur OI/stats/streams, `force:false` pour les snapshots, arrivée/rendu indépendant des réponses. Un changement de période CeFi ne doit recharger que l’historique ; navigation rapide ne doit pas dupliquer les demandes en cours.
8. Si un snapshot ancien est renvoyé : indicateur d’ancienneté visible, une seule relecture à 15 s, puis cycle normal 60 s. Un onglet masqué ou la vue Serveur ne lance pas de collecte financière périodique. Une source en échec affiche son erreur et conserve les dernières valeurs datées.
9. Vérifier l’absence d’erreur JavaScript dans la console, le Trading Engine toujours arrêté et les autres stacks inchangées. Transmettre les résultats/captures à Overflow avant d’ouvrir l’étape 4. Ne pas préparer ni annoncer 2.0.2.
