# Reprise et sauvegarde — 18 novembre 2026

**État : WIP récupéré, non qualifié pour une livraison financière.**

La reprise a commencé par une copie des différences index/arbre de travail et des nouveaux fichiers, puis par un commit intégral. Aucun fichier applicatif récupéré n'a été corrigé, remplacé ou supprimé pendant cette reprise.

## Sauvegarde vérifiée

- Source Rev1 : `41d9ea0b00ae0c59f3f58b0b403cde05d6fd8d58`.
- Commit local initial : `15a29a3937542495dbbcb087b18b9cfcf691afd7`.
- Commit publié : `e7a8dd72118b4cb5d0bf916dd256747142934438`.
- Arbre Git identique local/GitHub : `1b67c1a22fce256ebb43bec6d55806e5ac157934`.
- Branche : `feature/iatb-3.0.1-Rev1-advanced-okx-orders`.
- 39 fichiers modifiés et 18 nouveaux, soit 57 fichiers sauvegardés.
- Aucun merge vers `main` ou Rev1 ; aucun ordre réel ou Demo ; aucun déploiement VPS.

Le commit publié diffère du commit local par ses métadonnées Git ; leurs arbres sont strictement identiques. Le commit local initial reste conservé sur `recovery/advanced-okx-initial-local-20261118`.

## Résultats retrouvés et résultats perdus

Les rapports bruts AdvancedOKX étaient enregistrés dans `/tmp` et ne sont plus disponibles dans l'environnement repris. La recherche dans les worktrees retrouve les rapports historiques dev.6/dev.7 et Supervisor 3.0.1, mais pas les fichiers AdvancedOKX. Ces anciens rapports ne sont pas réétiquetés en preuves de cette extension.

Les sorties d'outils conservées dans l'historique de session mentionnent :

| Exécution antérieure | Résultat visible dans la session | Limite de preuve |
|---|---|---|
| T01–T65 complets | 65 scénarios réussis ; TAP 66 PASS, 0 FAIL, 0 SKIP, parent inclus | JSON/TAP bruts perdus ; des modifications ont suivi cette exécution |
| ChatBot et Core historique | 64 PASS, 0 FAIL, 0 SKIP | Contrat historique testé explicitement avec compatibilité legacy ; pas une qualification globale des nouveaux défauts |
| T51 + Q01–Q12 | TAP 12 PASS, 2 FAIL, 0 SKIP | Un scénario échoue, ainsi que son parent : Q12, conflit de réservation |
| Contrats avancés et outbox | Commande terminée avec code 0 ; 7 définitions de tests dans les sources | Décompte TAP brut non disponible |

Le fichier `recovered-session-evidence.json` est une transcription des preuves de conversation survivantes. **Ce n'est pas le rapport brut du simulateur**, et aucun PASS antérieur n'est attribué au commit récupéré sans nouvelle exécution.

Pendant cette reprise, seuls les contrôles statiques ont été exécutés : 55 vérifications de syntaxe JavaScript/JSON, toutes réussies. Node v24 sert ici uniquement de parseur ; aucune application ni suite runtime n'a été lancée. Le runtime applicatif demandé reste Node 22.

Les rapports Foundation déjà présents correspondent à leur ancien commit : le résumé local contient 314 PASS, 0 FAIL et 1 SKIP. Le succès CI de référence annoncé à 315 exécutions appartient à la qualification précédente ; il ne valide pas les changements AdvancedOKX.

## Inventaire des tâches

| Tâche | État à l'interruption | Éléments récupérés ou travail restant |
|---|---|---|
| Récupération de la bonne Rev1 | Terminée | Worktree et base obligatoire conservés |
| Audit initial et matrice | Réalisés, documentation provisoire | Deux documents de conception/capacités présents ; revue finale nécessaire |
| Contrats canoniques et décimales | Développés, qualification partielle | Validations par famille, conversion centralisée dans l'adaptateur OKX ; nouveaux contrôles à requalifier |
| Market/Limit/Post-only/IOC/FOK | Développés et raccordés | Scénarios antérieurs réussis ; état final à retester |
| Cancel/amend/état/fills | Développés et raccordés | Résolution exacte et distinction ACK/état ; pagination historique exhaustive non implémentée |
| TP/SL/OCO/Trigger/Trailing | Développés et raccordés | Cycle parent/protection et refus trailing amend présents ; qualification finale manquante |
| Levier et LONG/SHORT/fermetures | Développés, périmètre restreint | Contrats linéaires, scope marge/position, Margin mode 2 ciblé ; vérifier cohérence des refus pour les autres modes |
| LOCAL/OpenAI et clarifications | Développés | Même contrat structuré ; exemples et schémas étendus ; dernières modifications à retester |
| Risk informatif et acceptation | Développés | Null/N/C, accord explicite par demande, autorité Core et autorisation Risk liées à l'intention ; revue finale nécessaire |
| Firewall et CP1 | Partiellement terminés | Routes distinctes et contrôles présents ; qualifications et registres générés non actualisés après les dernières modifications |
| Outbox et historique durable | Développés, qualification partielle | File persistante, retries et déduplication ; dernier changement de livraison indépendante non requalifié intégralement |
| Réconciliation/reprise | Partiellement terminées | Recherche ciblée sans renvoi, tests de crash ; reprise des enfants de plans et libération de réservations à compléter |
| Plans et batch | Partiellement terminés | Plans finis et batch Spot même instrument, réponses individuelles ; cas supplémentaire Q12 échoue après le cas de plan dépendant |
| Portfolio propriétaire et valorisation | Partiellement terminés | Événements avec propriétaire et multiplicateur de contrats ; vérifier raccordement aux bases privées, sens NET, devise et signe des frais |
| Companion et notifications | Développés, tests partiels | Case d'acceptation, N/C, rafraîchissement et notifications ; parcours navigateur avancé non requalifié |
| Simulateur T01–T65 | Code conservé, exécution historique réussie | 65 définitions et 12 cas supplémentaires ; rapports bruts perdus, dernière révision non requalifiée |
| Non-régression complète 3.0.1 | Non exécutée sur l'état final | Relancer Foundation, mémoire, recovery, Auth21, CP1 et toute la suite pertinente |
| CI AdvancedOKX | Non commencée | Aucun nouveau workflow de qualification de cette extension sauvegardé ; workflows hérités conservés |
| Build complet AdvancedOKX | Non commencé | Constructeur Rev1 existant non adapté ; aucun ZIP AdvancedOKX ni SHA-256 de livraison |
| Documentation finale et preuves | Partiellement terminées | Deux documents provisoires ; inventaire de reprise ajouté séparément ; qualification finale absente |
| Publication Git de sauvegarde | Terminée pendant cette reprise | Premier snapshot publié ; inventaire et preuves de récupération publiés dans un second commit |
| Déploiement VPS / opérations réelles | Non effectués | Exclus de la reprise et de la qualification simulée |

## Points à résoudre avant une livraison qualifiée

1. **Dernier échec identifié : Q12.** La session a rapporté `MANUAL_CONFLICT_RECONCILIATION_REQUIRED` après le cas de protection dépendante Q11. Les enfants des plans peuvent conserver une réservation ; la réconciliation de la racine ne suffit pas à valider leur libération. Aucune correction n'est appliquée lors de cette sauvegarde.
2. **Portfolio propriétaire.** `portfolio.event.record` écrit dans l'Engine global ; les lectures propriétaires utilisent `owner_portfolio` et un store propriétaire. Le test avancé utilise notamment la lecture machine globale `portfolio.events` : cela ne prouve pas l'affichage des événements dans le Portfolio privé de l'utilisateur.
3. **Valorisations.** Les événements ont le multiplicateur des contrats linéaires, mais le traitement de `posSide=net`, le signe OKX des frais et leur devise demandent une revue du consommateur Portfolio. La disponibilité analytique et les montants doivent rester distincts des contraintes d'exécution.
4. **Qualifications CP1.** `nativeVerified` et les contrats ont changé ; les empreintes de qualification et les Function Registry générés ne sont pas encore recalculés et validés sur ce snapshot.
5. **Crashes.** T46 interrompt réellement Trading après réception simulée par le broker. T45 interrompt Trading avant la confirmation ; il faut encore renforcer la preuve du point précis « après réservation durable mais avant envoi ».
6. **Documents provisoires.** Les deux documents récupérés peuvent décrire le comportement visé et contiennent des assertions encore à vérifier. Le présent état de reprise prime sur toute lecture suggérant une livraison terminée.

## Reprise suivante conseillée

Partir du snapshot publié, conserver les sources intactes jusqu'à la création d'un nouveau commit de correction, résoudre les points ci-dessus puis enregistrer tous les résultats dans un dossier du dépôt ou `artifacts`, et non uniquement dans `/tmp`. Requalifier la suite entière et les contrats, vérifier le parcours navigateur, produire le ZIP complet et sa somme SHA-256, puis seulement rédiger la qualification finale. Les mutations restent confinées au serveur OKX fictif isolé.

## Fichiers sauvegardés

Les empreintes complètes sont dans `source-inventory.json`.

| Changement | Fichier | SHA-256 |
|---|---|---|
| Modifié | `App/Core/Clients/UserManagement/cp_bridge.js` | `213f3ecbf7ea127752b721a68282b740129ff40bc01e4028d3a0143eb118b715` |
| Modifié | `App/Core/Clients/UserManagement/http.js` | `13de513b80afdd03689fa6c70cede2c83e36b9c38cd147e0399944e3d84cb412` |
| Modifié | `App/Core/Clients/UserManagement/owner_ai.js` | `a42d77810f27d9b40ffe42daee30d38e9a4b47ab7304a0c48a7c360d205ffa12` |
| Modifié | `App/Core/Clients/UserManagement/owner_policy.js` | `86549e8996c3b76c31747b59cdc9b9b4700a7196f9bc4d43bd629c492844df91` |
| Modifié | `App/Core/Clients/UserManagement/trading_vault.js` | `b2e55aad41ae1f6026bca392a343eeb1b8a7db66d99801fac22580936e4edb7d` |
| Modifié | `App/Core/Communication/ProtocolRegistry/risk.json` | `d15252ccafcd304382f8d7a2e43fadb434f295c0cbb14975fee3977e2c7b2b3c` |
| Modifié | `App/Core/Communication/ProtocolRegistry/trading.json` | `9a9fba63a39a2984fa477282d1766259a3edb31dda799fe1742b4c4dbf620459` |
| Modifié | `App/Core/Communication/communication_protocol_v1.js` | `87c053109e593288c905138a4d53f31a0e264a6dbb91f53aa4bbb8fbd451f05c` |
| Nouveau | `App/Core/Execution/advanced_contract.test.js` | `b9187e7bcf5f996261fc6fd65b3aea3c28727e89e48826e0d8f4814d23a2f13d` |
| Modifié | `App/Core/Execution/config.json` | `330b6aab1ce3f749e90f05a29308ff8bce7011eaacad4e84911ac57dbd074c9a` |
| Nouveau | `App/Core/Execution/manual_authority.js` | `9cc72adc20412483a10380fa274c0f8df18ddab891d94345b896a9edac8cc201` |
| Nouveau | `App/Core/Execution/manual_contract.js` | `1b223afa1a087672c9809a422a2bd63c69273c0ff827c7fa4cc33229527c795c` |
| Modifié | `App/Core/Execution/manual_orders.js` | `3877900270cca106a3d4bb4c16f44b529ba54bbd8b72a27ceb7498ccf102b058` |
| Modifié | `App/Core/Execution/manual_orders.test.js` | `3c7b82df083a2bc5c4bec026fe5c53bf667495397f203a4151cd5916fc5a16aa` |
| Nouveau | `App/Core/Execution/manual_plans.js` | `fb87f5f4472b46c102134e66f9e4ae065b2704f0babe307e5af18f2caa25a7b9` |
| Nouveau | `App/Core/Execution/manual_preview.js` | `d5e2eb6692fc452e1bf27078f40ac33f6b31099b5a6484917da733129df48a58` |
| Nouveau | `App/Core/Execution/manual_workflow.js` | `bfe83024eda6155fa097db52dfae47ef32a676503c4fa77d22f79672ab722e95` |
| Modifié | `App/Core/Execution/messages.js` | `eaf45835bfd515a3786e8934a6bf41590bcd5a3c19854e6374fc75036f2089f6` |
| Modifié | `App/Core/Execution/order_scenarios.test.js` | `30ee6ed2538c0f209dda0b822fbea4078e6edf6aeeb8ed770a853d3d53b5c06f` |
| Modifié | `App/Core/Firewall/Config/Trading/whitelist.json` | `001b730b22f2e779ef3eb3dde57729eee2650f44700eb866047f7121e97efb3f` |
| Modifié | `App/Core/Firewall/Protection/trading_firewall.js` | `42c38e70317324e3e8ec7ba19a4585f7cce6c0bc0752a97c2fc94923ef4ba14f` |
| Modifié | `App/Core/Firewall/firewall_service.js` | `004ac05d777a3324cf16ec90a01b0b9dd5a52af258300290df11c7d874837dba` |
| Modifié | `App/Core/FunctionRegistry/Control/catalog.js` | `0623b55da494958650bf5d2a72fcf46e2e59bbfecc537ee7da26ec2aeaab988d` |
| Modifié | `App/Core/Server/companion_cognitive_bridge.js` | `07466621f43e2b427b5c61d49194574dfc9f737138aa278c60cfb9ca8d1fadeb` |
| Modifié | `App/Frontend/JS/companion_v1.0.js` | `0444971b950437b3ee7ec19c5346b946129e1a4ed8052f623199328bebb5d21a` |
| Nouveau | `App/Portfolio/Tests/advanced_orders.integration.test.js` | `3a6e65a9504dda308cfa3521c77836b0641925960ddba4ad65dd4f31fbab6d0d` |
| Modifié | `App/Portfolio/Tests/manual_order_pipeline.integration.test.js` | `d63912a00b4905984bca4038c2e887207445e8ae07b3925fe888061ca80363c7` |
| Modifié | `App/Risk/Engine/risk_gate.js` | `c05746d4ec6179868dfea02d1a3ac08aaae9cdc75a28744c7cdc7b2d7b1709c2` |
| Modifié | `App/Risk/Engine/risk_service.js` | `4628cf4a64b3cf953fee7677f4424d4f44f84e5bcdfee5f20ce0b7b73c4a2269` |
| Modifié | `App/Supervisor/ChatBot/Contracts/index.js` | `b41872bd2243c16ef45973ac652b9efbb0852ab49efe98ed0021f1cd90c19e8b` |
| Modifié | `App/Supervisor/ChatBot/Intents/account.json` | `04209637b2ddeca1744e535a0f8843b88bfa7f7c365c4d00adcde36decc6a7e6` |
| Modifié | `App/Supervisor/ChatBot/Intents/algorithms.json` | `970a58d02bb117058748f3e63042499baeffce99e47c91e510517ba2dddfd2f4` |
| Modifié | `App/Supervisor/ChatBot/Intents/orders.json` | `1ab6ddd73c9c4179bb502df9e6ebcc1395147f43bd9962304fd9cbd64ba03c98` |
| Modifié | `App/Supervisor/ChatBot/Intents/positions.json` | `242c3fe90a7e1c5d59ea926aa55f9c91d92e2574f4dd3a728b8b7c25a51ec64c` |
| Nouveau | `App/Supervisor/ChatBot/Resolver/advanced.js` | `a366778741a9e4c3cd5fbb952a821215a73fbe5a251b3c551b277e987d6b9715` |
| Modifié | `App/Supervisor/ChatBot/Resolver/index.js` | `b3590d6c99ec9fb4b20f1c79f83f55eae124be69e85614f74158a27ded940dd5` |
| Modifié | `App/Supervisor/ChatBot/Tests/hybrid.test.js` | `79f887e4eaf7d3fdafb585a8b8fe8902d245e0282c91f2b5aa41f97fe968fa40` |
| Modifié | `App/Supervisor/ChatBot/index.js` | `c18c6727447f0e4d7d050b5111f00adbd7916f1617456c342c0b582cb35fc998` |
| Modifié | `App/Supervisor/ChatBot/llm.js` | `4b0f389c25746758fd7a45e7ccb6fbb389c71d4281582037e3d1f9d423dd95c8` |
| Modifié | `App/Supervisor/ChatBot/procedures.js` | `536f045ab865fec712c221dc5c5a37c2334161aad76f433b02daf4102bc2221b` |
| Modifié | `App/Supervisor/ChatBot/state.js` | `21afe943aa6678e3fb4b7463304fedd09a69e61d9efeaf09b6c4cea6ba870fef` |
| Nouveau | `App/Tools/Tests/SupervisorSimulator/advanced_auth_fixture.js` | `965239bcbf6902882d1911eb3655ab4e6ef8dfcab693faf60ff8ba2eaf9ed5a3` |
| Nouveau | `App/Tools/Tests/SupervisorSimulator/advanced_network.js` | `3a1cb9452f1a35946e4a16977c23318534418c8c6036755c76bdee0b46bef33f` |
| Nouveau | `App/Tools/Tests/SupervisorSimulator/advanced_okx_fixture.js` | `61ae6d092bc214e5b02ae40c910769ab704959598da728339dec1952b9e3fa90` |
| Nouveau | `App/services/trading-engine/delivery-outbox.js` | `e6b16714fbcf9da71eb50019b66e2a9eab49e637c76192bb8f69665abaa4f48f` |
| Modifié | `App/services/trading-engine/exchange-adapters/okx/capabilities.json` | `66c6b96da1c014f180964a5097ff810e0341ad8b6810ef7717778b2d8311f626` |
| Nouveau | `App/services/trading-engine/exchange-adapters/okx/manual.js` | `de691ea0753a6dc373905b52ccf4a15aba44ab3c1278c28adc659b0ba5b6c6ee` |
| Nouveau | `App/services/trading-engine/exchange-adapters/okx/order-model.js` | `f6ed91ecbb2733b743811eed6fa353ea6077b0e78469c124fcf5a9e76af3095c` |
| Modifié | `App/services/trading-engine/history-store.js` | `a1596b2a59be8c9fe0f552f8066b8dd72365bb3779b677fef9c79c7ac56393c7` |
| Nouveau | `App/services/trading-engine/manual-lifecycle.js` | `9774903f8b5aeea44ad1a8eee2380926590ef2659315b6e2b2904d4d06d946e5` |
| Nouveau | `App/services/trading-engine/tests/manual_outbox.test.js` | `5775ceebdc2e17507e746b02d79e3f611b743bb2e1287182b80fccdb34832d28` |
| Modifié | `App/services/trading-engine/trading-engine.js` | `d50812f57f2bff96dc3aba1f8d513c354254ac7d0d158177f0c5cad609ae9e42` |
| Modifié | `App/services/trading-engine/trading_logs_v2.js` | `b0425f375cf551c84af102d883c9160dceb6c3481467bff02f31695e4d7c2a3c` |
| Modifié | `App/services/trading-engine/trading_service.js` | `f30b6732bec83069f3b7d8f69d5da92be92b0ec8e9452d19419886c72d37bb0f` |
| Modifié | `App/services/trading-engine/vault-client.js` | `c776a6fc5b34abebfb90bd074f02b5e34c5f49892ae73ff351faa6646badbb3c` |
| Nouveau | `Documentation/Trading/ADVANCED_OKX_INTEGRATION_3.0.1_REV1.md` | `e1dc7be840a24c71a457424e1e91e14aa2903d1c4b6cfe055e860ce30c6ca662` |
| Nouveau | `Documentation/Trading/OKX_CAPABILITY_MATRIX.md` | `3507b2fde5a9f8598d07a6be3670dcc8a4c910a2d6c065aeff120235831f9864` |
