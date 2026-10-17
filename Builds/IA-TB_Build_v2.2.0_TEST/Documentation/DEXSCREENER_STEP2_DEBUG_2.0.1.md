# DEBUG 2.0.1 — Étape 2/4 : DexScreener → Firewall → cache → SQLite

## État et périmètre

Étape 1 validée par Overflow sur GEN-1 : HTTP 200, CP/1 OK, 27 pools ETH/USDC, environ 9,33 M USD, Firewall PASS/VALID, provenance DexScreener, cache MISS.

La livraison de l’étape 2 corrige le code et fournit une validation GEN-1 exécutable. **L’étape 2 reste à valider sur GEN-1.** Aucun déploiement, démarrage Trading, changement de branche ou passage en 2.0.2 n’a été effectué. Les étapes 3 et 4 restent hors périmètre.

## Audit et corrections

| Point | Constat initial | Comportement livré |
| --- | --- | --- |
| Contrat fournisseur | Une panne de toutes les recherches pouvait devenir `ok:true` avec zéro pool | `DEXSCREENER_PROVIDER_FAILED`, `DEXSCREENER_POOLS_EMPTY` ou erreur explicite de format ; succès partiels conservés avec `partial` et `errors` |
| Identité de paire | ETH/USDC était toujours canonisé ETH/USD | La quote réelle est conservée, y compris dans la clé SQLite |
| Cache | ETHUSDC et ETH/USDC avaient des clés distinctes ; les objets imbriqués étaient partagés | Clé canonique commune ; copies indépendantes à l’admission et à la lecture |
| Firewall | Seuls les agrégats DEX traversaient la frontière | Le snapshot complet, dont les pools, traverse le client HTTP existant ; contrôle DEX spécifique du nombre, des identifiants, des valeurs et des sommes |
| Décision | Une décision absente était remplacée par PASS | PASS/WARN explicite requis ; bypass et avertissements contenant des erreurs de validation refusés |
| Cache/SQL | Un échec SQLite pouvait rester invisible après admission en cache | Erreur `DEX_LIQUIDITY_STORAGE_FAILED:…` ; pas de nouvelle admission en cache lorsque la persistance échoue |
| Persistance | L’insertion ne vérifiait pas la présence du résultat Firewall | Une validation Firewall datée est exigée ; la limitation de fréquence existante reste conservée |
| Observabilité | Le nombre d’instantanés DEX était calculé, mais absent du statut | `dexLiquidity.storage` et `dexLiquiditySnapshots` sont exposés dans la santé Market Data |
| Prix inversé | Le prix USD du token base renvoyé par l’API pouvait être attribué au token demandé après inversion | Prix laissé à null pour ces pools ; aucune estimation inventée |

Le Firewall conserve ses contrôles existants (provenance, timestamp, fournisseur, taille, etc.). Les contrôles supplémentaires concernent uniquement `MARKET_ANALYTICS` de `DEXSCREENER`. CeFi/DeFi et les protections Trading ne sont pas modifiés.

Le cache conserve son TTL existant (30 s par défaut). Une lecture HIT ne relance ni le fournisseur, ni le Firewall, ni une écriture. Une expiration provoque une nouvelle collecte et une nouvelle validation. Une collecte forcée contourne le cache mais jamais le Firewall. Si elle échoue, une ancienne entrée encore valide reste disponible jusqu’à son expiration ; aucune donnée périmée n’est renvoyée en secours.

SQLite conserve son intervalle de persistance (60 s par défaut, minimum 15 s). Chaque MISS ne crée donc pas nécessairement une nouvelle ligne. Les tables et volumes existants sont conservés. Les anciennes lignes enregistrées sous ETH/USD ne sont pas réattribuées automatiquement : leur quote historique n’est pas déductible de façon fiable à partir de cette clé.

Les budgets, le transport HTTP et ses limites existantes restent réutilisés : recherches fournisseur parallèles, timeout 10 s par requête, limite 4 MiB ; client Firewall timeout 8 s, limite 1 MiB. Le Router garde son timeout CP/1 existant de 12 s : lors d’un ralentissement cumulé fournisseur + Firewall, une requête UI peut expirer avant la fin du traitement. Aucun relèvement de timeout ni nouvelle politique de retry n’est introduit dans cette étape.

## Vérifications locales — fixtures, jamais données GEN-1

Environnement : Node.js **22.23.3**, dépendances existantes installées par `npm ci`, vrai SQLite `better-sqlite3`. Aucun ajout de dépendance.

Commande dédiée, depuis la racine :

```bash
node --test App/MarketData/Tests/test_dex_liquidity_boundary_v2.js
```

Résultat attendu et obtenu : **9/9 scénarios réussis**. Fournisseur HTTP local avec fixtures, vrai client HTTP Firewall et vraies règles Firewall, vraie base SQLite temporaire :

1. MISS → HIT avec alias de paire → collecte forcée → expiration ; calcul des sommes, contrôle Firewall, absence d’appel fournisseur sur HIT, protection contre la mutation du cache, throttle SQLite et relecture après réouverture de connexion.
2. Réponse vide, erreur HTTP fournisseur, format invalide et succès partiel.
3. Refus Firewall des pools invalides, sommes incohérentes, compte erroné, provenance vide et volume négatif ; aucune admission cache/SQL.
4. Refus d’une décision absente, REJECT, bypass et WARN avec erreurs de validation.
5. Échec d’écriture sur une vraie connexion SQLite configurée en lecture seule : erreur explicite, aucune nouvelle entrée cache/SQL.
6. Refus de stockage d’un snapshot sans preuve de validation.
7. Timeout et JSON Firewall invalide : erreur explicite sans cache/SQL.
8. Pas de réutilisation d’un cache expiré après panne fournisseur ; conservation limitée à l’ancien HIT encore valide en cas de collecte forcée échouée.
9. Prix d’une pool inversée laissé inconnu plutôt qu’attribué au mauvais actif.

Le test utilise un vieillissement contrôlé de l’entrée pour vérifier le TTL sans attendre 30 s. Le script GEN-1 ci-dessous attend réellement le TTL et l’intervalle de persistance.

Régression : **13/16 scripts réussis** :

| Script | Résultat |
| --- | --- |
| `Core/Communication/Tests/test_ui_dex_liquidity_read_v2.js` | PASS |
| `MarketData/Tests/test_firewall_cache_boundary_v1.js` | PASS |
| `MarketData/Tests/test_liquidity_pipeline_v1.js` | PASS |
| `MarketData/Tests/test_financial_async_fastlane_v1.js` | PASS |
| `MarketData/Tests/test_financial_family_scheduler_v1.js` | PASS |
| `MarketData/Tests/test_financial_data_contract_v2.js` | PASS |
| `MarketData/Tests/test_native_lite_cache_dedup_v1.js` | PASS |
| `MarketData/Tests/test_native_lite_data_integrity_v1.js` | PASS |
| `MarketData/Tests/test_defillama_public_surface_v2.js` | PASS |
| `Core/Firewall/Tests/market_data_firewall.test.js` | PASS |
| `Core/Firewall/Tests/trading_firewall.test.js` | PASS |
| `UI/Tests/test_ui_contract_v2.js` | PASS |
| `UI/Tests/test_architecture_boundaries_v2.0.js` | PASS |
| `Core/Firewall/Tests/test_risk_gate_boundary.js` | FAIL préexistant : assertion textuelle « Risk verification must route through Router CP1 » |
| `Core/Communication/Tests/test_client_action_ack_v1.js` | FAIL préexistant : capacité `chart.add_indicator` absente |
| `Core/Communication/Tests/test_router_normalization_v1.8.12.js` | FAIL préexistant : Supervisor ACTIVE au lieu de RESERVED |

Les trois échecs ont été reproduits sur une extraction isolée du commit initial `3d05e93c1823ba0281b288758cd3d790d12b481f`, sous Node 22.23.3. Ils n’ont pas été masqués ni corrigés hors périmètre. Le nouveau test échoue sur ce même code initial pour les défauts corrigés.

Ces vérifications démarrent uniquement des serveurs HTTP locaux de test ; elles ne lancent aucun Engine Trading et n’envoient aucun ordre. Le script de validation réelle n’a pas été exécuté depuis cet environnement, qui n’a pas d’accès GEN-1.

## Déploiement DEBUG manuel sur GEN-1

Depuis le checkout existant, avec les variables de lancement habituelles encore exportées :

```bash
cd ~/IA-TB-debug-v2-01
test "$(git branch --show-current)" = debug-v2.01
git diff --exit-code HEAD -- App
git pull --ff-only origin debug-v2.01
```

Les commandes suivantes reconstruisent l’image et recréent **uniquement Firewall et Market Data**. Le helper reprend les fichiers Compose déclarés par le conteneur existant et vérifie l’image cible avant toute action. Aucun `down`, aucune suppression de volume, aucun démarrage du Trading Engine. Le Router déjà validé à l’étape 1 reste en place.

```bash
python3 - <<'PY'
import json, os, pathlib, subprocess

def output(args):
    return subprocess.check_output(args, text=True)

assert output(['git', 'branch', '--show-current']).strip() == 'debug-v2.01'
subprocess.run(['git', 'diff', '--exit-code', 'HEAD', '--', 'App'], check=True)
assert pathlib.Path('App/VERSION').read_text().strip() == '2.0.1'
container = json.loads(output(['sudo', 'docker', 'inspect', 'iatb-debug-v2-01-marketdata-1']))[0]
labels = container['Config']['Labels']
assert labels['com.docker.compose.project'] == 'iatb-debug-v2-01'
files = labels['com.docker.compose.project.config_files'].split(',')
assert files and all(pathlib.Path(f).is_file() for f in files), 'Fichiers Compose originaux introuvables'
env = os.environ.copy()
uid, gid = container['Config']['User'].split(':')
env.setdefault('IATB_UID', uid)
env.setdefault('IATB_GID', gid)
preserve = ','.join(sorted(k for k in env if k.startswith('IATB_')))
cmd = ['sudo', '--preserve-env=' + preserve, 'docker', 'compose', '-p', 'iatb-debug-v2-01']
for f in files:
    cmd += ['-f', f]
cmd += ['--profile', 'manual-stack']
config = json.loads(subprocess.check_output(cmd + ['config', '--format', 'json'], env=env, text=True))
for service in ['firewall', 'marketdata']:
    assert config['services'][service]['image'] == 'iatb:debug-v2.01', 'Conserver les overrides DEBUG habituels'
subprocess.run(['sudo', 'docker', 'build', '-t', 'iatb:debug-v2.01', '-f', 'App/Dockerfile.app', 'App'], check=True)
subprocess.run(cmd + ['up', '-d', '--no-deps', '--force-recreate', 'firewall', 'marketdata'], env=env, check=True)
PY
```

Si la résolution Compose échoue faute d’autres variables, réexporter les variables du lancement DEBUG habituel et relancer. Ne pas substituer une autre configuration. Ne pas publier le contenu de `docker compose config` : il peut contenir des valeurs privées.

## Validation réelle GEN-1

Les tests QA sont exclus de l’image Docker ; le script versionné est transmis sur stdin au conteneur existant. Aucun fichier fournisseur fictif ni configuration de test n’est installé sur GEN-1.

```bash
sudo docker exec -i -w /opt/iatb/App iatb-debug-v2-01-marketdata-1 node - \
  < App/MarketData/Tests/validate_dex_liquidity_gen1.js
```

Le script vérifie : collecte réelle activée, Firewall activé sans bypass, requête via UI → Router → Market Data, ETH/USDC canonique, pools et somme cohérents, provenance et décision Firewall, premier MISS forcé puis HIT avec données identiques. Il attend ensuite réellement `max(TTL, intervalle SQL) + 1 s` (environ 61 s par défaut), exige un nouveau MISS et compare intégralement ce snapshot avec l’historique CP/1 et une nouvelle connexion SQLite en lecture seule. Il ne modifie ni TTL ni règles, et ne relance aucun service. Des accès concurrents à ETH/USDC peuvent perturber le contrôle exact MISS/HIT ; fermer les diagnostics concurrents pendant le test.

Résultat exigé : **`GEN1_DEX_LIQUIDITY_PASS`**, code de sortie 0. Un HTTP 200 seul ne suffit pas. Transmettre les sorties à Overflow pour validation de l’étape 2 avant toute étape 3. Les erreurs fournisseur, refus Firewall et pannes SQLite sont simulés uniquement dans la suite locale, jamais provoqués dans la stack GEN-1.
