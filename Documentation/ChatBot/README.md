# IA-TB 2.6.0-dev.5 DEBUG — Hybrid ChatBot

Base : `integration/iatb-2.6.0-dev.4`, commit `1296471ca890ced81f653290f216a331caa3c8cb`. Livraison : `feature/iatb-2.6.0-dev.5-hybrid-chatbot`. Aucun déploiement, fusion dans main ou ordre réel.

## Fonctionnement

Le compagnon existant reçoit un onglet Hybride. Les onglets Supervisor cognitif, Actions UI, Engines, la voix, la mascotte et le sélecteur de modèle administrateur restent présents. La fenêtre est déplaçable et redimensionnable ; une préparation financière s’ouvre dans une fenêtre plus large et accessible au clavier.

Le réglage du profil Auth21 propose LOCAL, HYBRID (valeur initiale) et OPENAI. LOCAL interprète les intentions sans requête OpenAI. HYBRID privilégie le même résolveur ; le recours automatique au LLM pour une demande inconnue est désactivé initialement et nécessite l’option du profil. OPENAI utilise l’interprétation structurée du modèle configuré. Le bouton OpenAI et `/openai ...` sont une demande explicite, y compris en mode LOCAL. Un paramètre manquant déclenche une question locale ; il ne déclenche pas de fallback automatique.

Les deux interprètes produisent le même contrat, validé avant toute procédure. Le modèle ne choisit ni une URL d’Engine ni un privilège. Seules les procédures écrites dans `App/Supervisor/ChatBot/procedures.js` utilisent AgentEngineGateway : description, qualification, grant, validation, exécution autorisée, audit. Les métadonnées CP1 des JSON sont descriptives et ne permettent aucune séquence arbitraire.

## Couverture réelle

| Niveau | Nombre | Signification |
|---|---:|---|
| Opérations OKX recensées | 466 | 399 routes REST et 67 identifiants/opérations WebSocket tirés de la documentation officielle |
| Intentions usuelles | 24 | Modèles de reconnaissance locale FR/EN, avec questions et paramètres typés |
| Définitions reconnues | 490 | 24 intentions usuelles + 466 opérations identifiables exactement par méthode/route, identifiant ou titre unique |
| Procédures métier de lecture | 8 | Solde, frais, positions, ordres ouverts, bougies, carnet, Risk, état de la plateforme |
| Préparations financières | 6 | Achat, vente, ouverture, fermeture, annulation, modification ; confirmation toujours bloquée |
| Commandes CP1 qualifiées pour agent | 28 | Qualification dev.4 conservée et rejouée, soumise aux grants effectifs |

Recenser une route ne signifie pas implémenter son SDK ou son exécution. Les opérations génériques sont descriptives ; transferts, retraits, secrets, permissions, sous-comptes et algorithmes sans procédure qualifiée restent indisponibles. Les 466 identifiants ne disposent pas chacun d’une grammaire conversationnelle libre. Le catalogue est un instantané des exemples de la documentation, pas une garantie de couverture de futures routes, variantes dynamiques ou API régionales.

## Exemples

- `Achète du BTC.` puis `50 USDT`, `Demo`, `Spot`, `Market` : précision progressive, compte unique du profil et paire candidate ; préparation désactivée.
- `Vends 0,01 BTC` : quantité en actif ; la paire manquante est demandée, aucune conversion implicite.
- `Achète 50 USDT de BTC-USDT Spot Limit au prix de 60000 stop loss 57000 take profit 65000` : prix limite, SL et TP distincts ; aucune activation des protections n’est prétendue.
- `Montre mon solde sur OKX` : lecture du portefeuille propriétaire si le grant Portfolio est accordé.
- `Carnet de BTC-USDT`, `Bougies de BTC-USDT en 1m` : lectures MarketData qualifiées après grant.
- `Annule mon dernier ordre Bitcoin` : demande de l’identifiant exact ; aucun choix arbitraire du « dernier » ordre.
- `GET /api/v5/account/balance` : opération officielle reconnue, mais chemin générique descriptif sans invocation directe.
- `/openai bonjour` : interprétation structurée explicite avec la clé du profil Auth21, conservée dans Core.

## Autorité et données

Auth21 vérifie session, rôle, Origin et CSRF. Core dérive l’identité et le compte du profil, crée une session agent ANALYZE bornée et transmet une délégation liée au prompt. Aucun grant n’est créé implicitement. Les clés OKX/OpenAI restent dans le coffre propriétaire existant ; ni navigateur ni Supervisor ne reçoivent la clé. Le transport OpenAI réutilise le fournisseur existant, `store:false`, le modèle configuré et le suivi d’usage Core.

Le contexte hybride est indexé par propriétaire, hash de session Auth21 et conversation ; il expire après cinq minutes d’inactivité. Les messages sont bornés à 40. Une préparation dure 90 secondes, possède un identifiant et un digest exacts, et est invalidée par modification, remplacement, ambiguïté ou expiration. Annuler est idempotent ; confirmer ne peut appeler Trading, même après altération d’un état local. Le contexte cognitif historique conserve son fonctionnement distinct dans le même Supervisor.

Les résultats métier privés sont omis du contexte envoyé au LLM et le compte est retiré des paramètres en attente. Les motifs de secrets connus sont masqués dans messages, historique et contexte. Cela ne constitue pas une garantie de détection de tout secret arbitraire saisi par un utilisateur.

Un symbole local est un candidat jusqu’à correspondance avec les contraintes d’instrument retournées par Portfolio/OKX. Les données absentes restent nulles et affichées « Indisponible ». Les frais ne sont estimés que sur un montant de cotation et un taux vérifié du compte. Les prix, slippage, coût total, cible d’ordre/position et valeurs initiales restent indisponibles si aucune donnée vérifiée ne les établit. Les SL/TP proposés ne sont pas présentés comme actifs. La préparation ne transforme pas un Risk indisponible en accord.

## Structure et extension

- `App/Supervisor/ChatBot/Contracts` : contrat commun et schéma de paramètres.
- `Intents/manifest.json` et ses sept fichiers : intentions déclaratives, exemples, paramètres, risque, confirmation, référence officielle et correspondance CP1 descriptive.
- `Intents/okx-api-catalog.json` : routes et canaux officiels, sans copie de la documentation complète.
- `Resolver` : normalisation, règles, unités, ambiguïtés et suivi des paramètres.
- `state.js` : contexte privé et invalidation ; `procedures.js` : autorité métier fixe ; `llm.js` : transport propriétaire existant.
- `index.js` : orchestration commune, choix LOCAL/OPENAI et validation.

Pour ajouter une intention de reconnaissance, ajouter son JSON au manifeste avec un identifiant unique, un schéma de paramètres connu, des expressions bornées et une référence officielle existante. Le catalogue est rechargé à chaque demande ; aucun redémarrage n’est nécessaire pour la reconnaissance. Une nouvelle exécution requiert une procédure revue dans le code, une commande qualifiée et un grant effectif. Un JSON ne peut pas accorder un droit ou activer une mutation.

Le recensement peut être régénéré avec `python3 Tools/ChatBot/catalogue_okx.py --help`. Son entrée est une copie HTML officielle ; le rapport enregistre l’URL, la date et le SHA-256 de cette entrée. Les appels WebSocket ne sont pas ouverts par ce ChatBot.

## Validation reproductible

Node 22 et dépendances de `App/package-lock.json` :

```sh
cd App
npm ci --omit=dev --no-audit --no-fund
npm run test:chatbot
cd ..
node App/Tools_validate_release_version.js
node App/Tools/Tests/SupervisorSimulator/run_validation.js /tmp/iatb-chatbot-validation
python3 Tools/Build/build_risk_snapshot.py
python3 Tools/Build/verify_source_bundle.py artifacts/IA-TB-2.6.0-dev.5-debug-source.zip
```

La qualification de release est `node App/Tools/qualify_cp1_control.js`. Elle utilise de vrais processus isolés Core, Router, Firewall et Engines, avec profils et réponses OKX fictifs. Les appels externes OpenAI sont simulés dans le transport propriétaire réel : aucun appel payant n’est effectué. Les tests d’interface Playwright utilisent les vrais assets et le vrai ChatBot avec un profil fictif ; ils complètent les tests Auth21 réels et ne prétendent pas remplacer un déploiement de production.

La CI `.github/workflows/hybrid-chatbot.yml` exécute la suite complète, quatre captures desktop/mobile et les vérifications de fenêtre, clarification, clavier et confirmation bloquée, puis publie le build source et les rapports. Voir `DELIVERY.md`, `Results/` et `build-verification.json` pour les résultats de cette livraison.
