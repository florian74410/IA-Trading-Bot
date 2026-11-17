# 2.6.0-dev.6 DEBUG — ordres manuels OKX Spot Market

Configuration livrée : `App/Core/Execution/config.json`, `live: true`. Les variables d’environnement explicites restent prioritaires : ne pas lancer ce candidat avec les anciens profils Docker de qualification qui imposent `IATB_TRADING_LIVE=0`. Aucun déploiement VPS ni appel à un compte OKX réel n’est effectué par cette livraison.

## Continuité réellement câblée

1. Navigateur : `POST /api/companion/chat`, mode `hybrid`, session Auth21 et CSRF.
2. Core : pont propriétaire → Router `POST /communication/v1/request` → `supervisor.user.request` / `supervisor.chatbot.message`. Le Supervisor reconnaît l’intention et conserve une préparation privée par session.
3. Le pont du compagnon dans Core construit l’ordre manuel à partir de cette préparation serveur ; `risk.user.request` / `risk.snapshot.create` passe par Router. Risk collecte MarketData et Portfolio ; les lectures privées OKX traversent Router, Firewall, Trading et le coffre Core propriétaire. Le récapitulatif est conservé durablement dans Core et retourné à la notification.
4. Le bouton Confirmer fait `POST /api/companion/confirm` avec `preparation_id` et `digest`. Core réserve atomiquement la demande, demande au Supervisor de confirmer la préparation exacte par Router, puis calcule un nouveau snapshot Risk propriétaire. Changement de prix au-delà de la limite de slippage du récapitulatif ou changement de taux de frais : nouvelle confirmation nécessaire.
5. Core délègue `risk.user.request` / `risk.order.authorize`. Risk vérifie propriétaire, compte, hash d’intention, décision, métriques indispensables et expiration du snapshot. Le chemin historique `risk.gate.evaluate` sans snapshot vérifié ne peut pas autoriser une intention manuelle.
6. Core conserve les identifiants puis envoie `trading.execute` par Router. Le Router envoie au Firewall ; celui-ci vérifie sa liste blanche, la liaison entre les paramètres réellement exécutés et l’intention approuvée, puis appelle `risk.gate.verify` par Router et consomme le jeton à usage unique.
7. Trading exige le transfert signé du Firewall, l’état RUNNING et la même liaison d’ordre. Il récupère les clés du compte par le coffre Auth21, revalide ce compte et émet `POST /api/v5/trade/order` signé vers le domaine régional OKX.
8. Trading journalise son résultat et publie l’événement Portfolio existant. Core conserve aussi le résultat corrélé au plan. `GET /api/companion/order-history` donne la liste du propriétaire. Le statut ACKNOWLEDGED signifie accepté par OKX ; aucun fill ni frais réalisés n’est inventé.

Core reste l’autorité des sessions et des clés. Le Supervisor confirme l’intention ; Core porte les délégations vers Risk et Trading après cette confirmation. Il ne s’agit pas d’appels arbitraires du modèle aux Engines. Les commandes financières restent interdites au catalogue générique des agents ANALYZE.

## Premier ordre et valeurs nulles

Dans le contexte explicite `strategy_type=manual_order`, l’absence d’historique de stratégie, de PnL journalier, de pic de portefeuille ou de stop proposé n’est pas remplacée par zéro. Les statistiques indisponibles restent `null`, figurent dans les avertissements et sont séparées des métriques indispensables. Le snapshot peut être PARTIAL et recevable uniquement si sa décision autorise l’ordre et si aucune métrique indispensable n’est absente.

Solde disponible, instrument, prix/carnet, frais, provenance, fraîcheur et limites restent obligatoires. BLOCK, REVIEW ou UNAVAILABLE interdisent l’ordre. Les positions Spot existantes sans stop sont évaluées de façon conservatrice à leur notionnel entier pour le risque de perte ; aucun stop actif n’est supposé. Les positions dérivées non modélisées restent bloquées. Les limites de taille/exposition/liquidité de Risk s’appliquent aussi aux petits ordres.

## EU et US

| Région | API REST | Documentation |
|---|---|---|
| EU/EEA — compte de l’utilisateur | https://eea.okx.com | https://my.okx.com/docs-v5/en/ |
| US | https://us.okx.com | https://app.okx.com/docs-v5/en/ |

Source officielle : https://www.okx.com/docs-v5/en/ ; le domaine dépend du site d’enregistrement du compte. Le profil Auth21 OKX doit porter `apiRegion=EEA` et `demoMode=false` pour le parcours réel EU. Les clés restent exclusivement dans le coffre de l’application.

L’adaptateur renseigne `tdMode=cash`, `sz`, `tgtCcy=base_ccy` ou `quote_ccy`, un `clOrdId` stable et `banAmend=true`. Il vérifie HTTP, `code`, `sCode` et `ordId`. Le montant et son unité sont explicites ; aucun transfert ni retrait n’est ajouté.

## Mise en service du candidat

- Installer le build avec Node 22 et `npm ci --omit=dev` dans App. Conserver la configuration Auth21, TLS, identités CP1, clés IPC, Router et répertoires persistants du déploiement authentifié existant.
- Utiliser `IATB_TRADING_LIVE=true`, `IATB_TRADING_ENGINE_ENABLED=1`, `IATB_AUTH_MODE=authenticated` dans Core et Trading ; les autres services conservent leurs identités CP1 distinctes. L’exemple d’environnement ne provisionne ni clés ni certificats.
- Configurer son compte OKX EU dans le profil : compte activé, SPOT, actions read/execute, région EEA, Demo désactivé, clés Read + Trade. Pas de clé dans le chat. Choisir une paire effectivement proposée à ce compte et autorisée par la liste blanche du Firewall ; aucun ajout silencieux à cette liste.
- Démarrer Trading par la commande ADMIN START authentifiée et confirmée existante. La nouvelle implémentation accepte uniquement STOPPED, vérifie Firewall et Risk, refuse les opérations ambiguës et passe RUNNING. Une configuration LIVE=true ne contourne pas un arrêt d’urgence ni un état nécessitant réconciliation.
- Exemple de demande : « Achète [montant] EUR de BTC-EUR Spot Market Live sur OKX compte [identifiant] ». Vérifier la notification puis cliquer Confirmer. Le minimum d’ordre, le solde, les frais et les limites Risk peuvent refuser un montant de quelques euros ; rien n’est augmenté automatiquement.

## Garanties locales et limites

La suite `manual_order_pipeline.integration.test.js` utilise les vrais processus Router, Supervisor, Risk, Firewall, Trading, Portfolio et Core/TLS. Le seul transport fournisseur est fictif : il vérifie le domaine EU, les paramètres et la signature HMAC puis retourne un ACK OKX artificiel. Le cycle de vie Trading est initialisé RUNNING par la fixture isolée, pas par une activation de production. Le START ADMIN est testé séparément avec le contrôleur et le cycle de vie SQLite réels.

Double confirmation : un seul envoi. Propriétaire différent : refus. États réservés et résultats persistants. Après timeout, crash ou réponse ambiguë : aucune nouvelle tentative automatique ; le compte est bloqué pour de nouvelles préparations tant que cet état reste à réconcilier. La réconciliation automatique avec le broker et le suivi automatique des fills ne sont pas livrés ici ; ne pas modifier manuellement la base pour relancer un ordre ambigu sans vérifier OKX.

Ce candidat n’implémente que les achats/ventes simples SPOT MARKET LIVE confirmés. Limit, levier, SL/TP demandés, modifications, annulations et plans multi-ordres ne sont pas activés par ce parcours. Ces demandes sont refusées explicitement. Les anciennes APIs historiques ne sont pas déclarées qualifiées pour ce nouveau parcours.

Qualification locale ≠ essai sur un broker réel. Restent à vérifier par l’utilisateur : compte réel, permissions, paire régionale, minimums, connexion réseau/TLS de son installation et résultat réellement observé sur OKX. Aucun appel payant OpenAI ni ordre réel n’a été envoyé pour les tests.

## Résultats de livraison

Node v22.23.5 : suite complète de 118 tests sur 35 fichiers, zéro échec, ignoré ou annulé. Qualification CP1 : 12/12 tests sur les processus isolés. La route manuelle est comprise dans cette suite ; son test dédié passe également séparément. Après la suite complète, un test supplémentaire de bouton Confirmer a été ajouté et exécuté : les 3 tests frontend passent (les 2 précédents + ce nouveau test), CSRF et double clic compris. Les 5 tests du nouveau service d’ordres passent aussi séparément. Rapports sous `Results-dev6/`.

La recette navigateur visuelle n’est pas déclarée refaite : Chromium local reste indisponible dans cet environnement. Le frontend est exercé avec DOM simulé ; les services et la requête broker sont vérifiés par le test entre processus. Les rapports historiques dev.4/dev.5 conservent leurs propres périmètres et ne décrivent pas la configuration LIVE de dev.6.
