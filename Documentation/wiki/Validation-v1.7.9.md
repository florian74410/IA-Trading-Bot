# Validation v1.7.9

Validation exécutée le 30 août 2026 sur `builds/v1.7.9` avec Node.js 16.20.2 dans GitHub Actions.

## Résultat global

**État : BLOQUÉ — le build exécutable actuel fonctionne sur les tests présents, mais il n'est pas encore cohérent avec toutes les fonctionnalités marquées comme intégrées dans `ROADMAP.md`.**

## Tests réussis

- [x] Build `builds/v1.7.9` présent.
- [x] Fichier `VERSION` du build = `1.7.9`.
- [x] Installation des dépendances Market Data réussie (`ws@8.18.0`).
- [x] Vérification syntaxique de **118 fichiers JavaScript** : aucune erreur.
- [x] Self-test UserData / Vault / Auth : PASS.
- [x] **13/13 tests JavaScript détectés** dans le build : PASS.
- [x] API publique Kraken joignable.
- [x] API publique CoinGecko joignable.
- [x] API publique DefiLlama joignable.
- [x] Endpoint Oracle GMX joignable.
- [x] Service Market Data démarré avec succès et `/health` répond.
- [x] Échantillon mémoire Market Data sur runner Linux : **43 888 Ko RSS** (~42,9 Mio).
- [x] Intégrité ZIP du patch v1.7.9 : PASS.
- [x] Test d'installation UpdateManager **v1.7.8 -> v1.7.9** : PASS.
- [x] Les fichiers utilisateur protégés restent intacts pendant le test d'installation.

### Tests JavaScript exécutés

1. `Core/Admin/Tests/test_admin_backend.js`
2. `Core/Communication/Tests/test_client_action_ack_v1.js`
3. `Core/Communication/Tests/test_communication_protocol_v1.js`
4. `Core/Communication/Tests/test_communication_router_v1.js`
5. `Core/Communication/Tests/test_runtime_registry_v1.js`
6. `Core/Services/Tests/test_fundamental_ai_synthesis_v1.js`
7. `Indicators/Tests/test_indicator_analysis_v1.js`
8. `Indicators/Tests/test_indicator_engine.js`
9. `Indicators/Tests/test_indicator_settings_v1.js`
10. `Liquidity/Tests/test_liquidity_engine.js`
11. `MarketData/Tests/data_request_contract_test.js`
12. `MarketData/Tests/test_hyperliquid_socket.js`
13. `UserData/self_test.js`

## Blocages détectés

Les contrôles d'intégrité par rapport à la ROADMAP ont échoué sur les points suivants :

- [ ] `builds/v1.7.9/manifest.json` annonce encore la version `1.7.8`.
- [ ] `builds/v1.7.9/MarketData/package.json` annonce encore la version `1.7.8`.
- [ ] Provider CoinGecko absent du `MarketData` du build courant.
- [ ] Provider Blockchain.com absent du `MarketData` du build courant.
- [ ] Provider DefiLlama absent du `MarketData` du build courant.
- [ ] Endpoint `/price/consensus` absent du build courant.
- [ ] Endpoint `/candles/consensus` absent du build courant.
- [ ] Proxy `/api/market/fx-klines` absent du build courant.
- [ ] Endpoint `/capabilities` absent du `MarketData` du build courant.
- [ ] Test `test_fx_consensus_v1.7.9.js` absent du build courant.

En conséquence, la case globale **`Tests automatiques réussis` ne doit pas encore être cochée** : les tests réellement présents passent, mais plusieurs éléments annoncés par la ROADMAP ne sont pas présents dans le build à tester.

## Tests restant obligatoirement sur la machine cible

Les tests GitHub Actions ne remplacent pas les tests sur le Mac cible. Restent donc ouverts :

- validation réelle sur macOS High Sierra / Node 16 ;
- comportement réseau des providers depuis la machine cible ;
- validation end-to-end du mode `ƒx` avec les vrais flux ;
- consommation mémoire et stabilité longue durée sur la machine cible ;
- validation UI réelle du prix consensus et des sources.

## CI

Workflow de validation : `.github/workflows/v179-roadmap-validation.yml`.

La suite est conçue pour continuer les contrôles après une erreur afin de produire un diagnostic complet plutôt que de s'arrêter au premier échec.
