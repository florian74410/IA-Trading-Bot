# Avant 3.0 — demandes d’ordres du ChatBot

État au 17 novembre 2026. Ce document fixe le lot suivant et ses critères de réception ; il ne certifie pas une chaîne financière déjà fonctionnelle. Base hybride auditée : dev.5, 109 tests validés. Publication audit : fa6ffdade3720d0173b2241c9d2b80ca0662c4e3.

## Objectif retenu

Stabiliser une chaîne explicite de demandes d’ordres avant le passage à 3.0. Le Supervisor actuel porte l’orchestration déterministe ; les capacités cognitives et la mémoire du Supervisor évolueront en 3.x sans devenir une autorité permettant de contourner Risk ou Firewall.

Chemin logique demandé : ChatBot (intention) → Router → Supervisor → Router → Risk Engine → Router → Trading Engine → API OKX. Dans l’implémentation : les entrées utilisateur traversent Core/Auth21 et les mutations Trading passent obligatoirement par le Firewall. Les échanges internes restent CP/1. Le résolveur actuel du ChatBot réside dans le processus Supervisor ; il ne faut pas créer un second Supervisor pour reproduire artificiellement un schéma de transport.

Le ChatBot peut proposer plusieurs actions pour une seule demande. Le Supervisor matérialise un plan borné de procédures connues, qualifiées et autorisées ; aucune liste arbitraire de routes fournie par le LLM n’est exécutée. Chaque mutation est évaluée par Risk et contrôlée par Firewall. Les demandes ambiguës restent en clarification.

## Constat vérifié sur dev.5

| Élément | État effectif | Travail requis |
|---|---|---|
| Intentions LOCAL/HYBRID/OpenAI, Auth21, CP1 | Validés par l’audit | Conserver les mêmes autorités et contrats |
| Préparation et confirmation | Préparation possible, confirmation serveur toujours bloquée | Ajouter le cycle transactionnel de confirmation exacte |
| Risk snapshot/2.0 | Scores, métriques, qualité, frais/contexte broker issus de Portfolio ; execution_authorization:false | Exposer un récapitulatif d’ordre complet et vérifié, lié à son propriétaire et au plan |
| Risk Gate historique | Jeton lié au hash, expirant et à usage unique ; la classe seule peut approuver sans snapshot de scores | Rendre le snapshot propriétaire frais et sa décision obligatoires pour le nouveau parcours ; pas de fallback legacy |
| Risk Gate natif | Certaines intentions déclenchent déjà nativeCheck dans risk_service | Étendre explicitement le contrat et l’identité au parcours ChatBot ; ne pas falsifier la source autonome |
| Grants agent | trading.execute/cancel/close_position et risk.gate.evaluate/verify ne sont pas qualifiés pour l’agent | Implémenter et qualifier une autorité d’exécution dédiée, distincte de la session ANALYZE |
| Trading / adaptateur OKX | liveExecutionEnabled forcé à false, LIVE_QUALIFIED=false | Remplacer les verrous seulement après qualification du nouveau parcours |
| Historique | Audit CP1, état ChatBot, journal Trading et événements Portfolio existent séparément | Journal de chaîne durable, propriétaire, corrélé et exporté vers Portfolio/Supervisor |
| Finalisation Trading | Échec history.append actuellement ignoré ; publication Portfolio sans outbox durable | Intention durable avant envoi ; résultat durable après ; reprise/outbox ; aucune réussite silencieuse sans trace |
| Adaptateur OKX | Code de requête existant non qualifié pour mutations | Vérifier unités sz/tgtCcy, clOrdId, hôte régional, Demo/Live, erreurs métier et ACK vs fill |

Diagnostic reproductible : `node --test --test-reporter=tap App/Supervisor/ChatBot/Tests/execution_readiness.test.js`. Trois tests passent : ils confirment les verrous et l’écart, PAS une exécution de bout en bout. Aucun accès à un broker ou secret réel.

## Configuration LIVE prévue

Prévoir une configuration serveur typée `live: true/false`, administrable avec Auth21. Valeur installée par défaut : false. La lecture d’un booléen accepte uniquement les valeurs explicitement documentées ; aucune conversion JavaScript Boolean('false'). L’utilisateur demande la capacité de configurer true, pas l’activation actuelle d’un compte réel.

`live=true` exprime une activation demandée ; l’état effectif doit également exiger : build qualifié, service Trading activé et RUNNING, compte propriétaire autorisé et identique au snapshot, permissions valides, environnement compte conforme, snapshot Risk frais, confirmation exacte et Firewall actif. Un champ fourni par le navigateur ou le LLM ne change jamais la politique serveur. L’arrêt d’urgence et la révocation invalident les préparations en attente. La simulation de broker ne doit pas être un mode déployable contournant la qualification LIVE.

## Snapshot de récapitulatif d’ordre

Risk doit retourner un objet versionné, immuable, propriétaire et lié à l’intention normalisée et au plan. Données minimales :

- Identités : plan_id, step_id, correlation_id, owner interne, compte, révision, intent_hash, snapshot_id, dates et expiration, références des sources.
- Ordre : exchange, environnement Demo/Live, instrument vérifié, marché, sens, type, quantité ET unité, montant de cotation, prix limite/déclencheur, levier, protections proposées, cible exacte en cas de modification ou fermeture.
- Portefeuille : solde disponible et devise, exposition avant/après estimée, positions utilisées, âge et état de réconciliation ; données obtenues par Portfolio, pas inventées par Risk.
- Broker : contraintes d’instrument, pas de quantité/prix, minimums, taux de frais du compte, frais estimés, devise de frais, spread, slippage estimé, prix de référence/VWAP et coût total estimé. Une estimation n’est jamais un prix garanti.
- Risk : scores et modules disponibles, décision, motifs, limites, métriques manquantes et qualité. BLOCK, REVIEW ou UNAVAILABLE ne deviennent pas un accord par simple confirmation utilisateur.
- Autorité : execution_authorization distinct du snapshot analytique ; un éventuel jeton est lié au propriétaire, compte, environnement, hash d’ordre/plan, état des grants et date limite. Consommation atomique côté Firewall, jamais par le LLM.

La notification d’exécution est construite à partir de ce snapshot. Une donnée inconnue reste explicitement indisponible et peut interdire l’exécution. Confirmer lie l’acceptation à l’identifiant et au digest exacts. Toute modification invalide la confirmation et déclenche un nouveau calcul Risk. Risk est revérifié avant admission ; un snapshot ancien ne suffit pas.

## Plans de plusieurs actions et historique

Cycle cible : RECEIVED → CLARIFYING ou PLANNED → RISK_CHECKED → AWAITING_CONFIRMATION → CONFIRMED → REVALIDATING → ADMITTED → SUBMITTED → ACKNOWLEDGED → PARTIALLY_FILLED/FILLED/CANCELLED/REJECTED. États supplémentaires nécessaires : BLOCKED, EXPIRED et UNKNOWN_RECONCILIATION_REQUIRED.

La confirmation couvre un plan immuable et ses dépendances. Les résultats de chaque étape modifient le contexte des suivantes : nouveau contrôle Risk sur l’état courant, pas réutilisation aveugle du premier snapshot. Une erreur arrête les étapes dépendantes ; aucune opération inverse financière automatique pour « annuler » un plan partiellement exécuté. Afficher les résultats partiels et demander une nouvelle décision si nécessaire.

Le journal durable enregistre avant toute mutation : identité propriétaire, intention expurgée, plan/révision/digest, décisions et références Risk/permissions, confirmation utilisateur et identifiants CP1/Firewall. Il enregistre ensuite tentative, clOrdId, ACK broker, rejets, fills et frais réalisés. La corrélation relie les événements de toute la chaîne. Les clés, signatures et preuves secrètes ne sont pas journalisées.

Idempotence persistante par étape et clOrdId stable. Après un timeout ou redémarrage entre l’envoi et la réponse : état inconnu à réconcilier auprès du broker, sans renvoi aveugle. Sauvegarde/restauration conserve les réservations, identifiants broker et états inconnus. Une restauration d’ancienne sauvegarde impose une réconciliation avant reprise des mutations.

Outbox transactionnelle pour publier les événements vers Portfolio et la mémoire du Supervisor, avec ACK, retries et déduplication. Les vues et souvenirs dérivés ne sont pas l’autorité d’exécution ; le journal et les confirmations broker font foi. Lectures propriétaires uniquement. Un ACK d’ordre n’est ni un fill ni une preuve de gain. Les protections proposées ne sont pas déclarées actives sans confirmation broker.

## Réception avant 3.0

1. Vérifier le parcours complet avec vrais processus Core/Auth21, Router, Supervisor, Risk, Firewall et Trading, et serveur OKX de test vérifiant la requête HTTP signée. Les adaptateurs sont réels, le broker et ses secrets sont fictifs. Réponses positives, sCode non nul, rejet, fill partiel et ACK sans fill.
2. Couvrir live=false, live=true demandé sans qualification, compte Demo/Live incompatible, refus Risk, Risk indisponible, snapshot expiré, digest modifié, révocation et arrêt d’urgence entre confirmation et envoi. Zéro appel broker sur refus.
3. Couvrir confirmation concurrente/doublée, retries Router, crash avant/après envoi, réponse perdue et restauration de sauvegarde. Une demande ne devient pas deux ordres ; l’état ambigu est visible et réconcilié.
4. Couvrir demande de plusieurs actions, dépendances, modification d’exposition entre étapes, échec partiel et confirmation du plan. Chaque mutation respecte Risk, permissions et Firewall.
5. Vérifier que Portfolio et Supervisor retrouvent l’historique après redémarrage sans doublon, fuite entre utilisateurs ou perte silencieuse si un consommateur est hors ligne.
6. Produire build, inventaire, rapports, test navigateur de la notification/confirmation et configuration opérateur documentée. Séparer qualification broker simulé, validation OKX Demo réelle et activation LIVE réelle. Sans VPS, seuls les deux derniers environnements restent non validés : ne pas prétendre les avoir exercés.

La 3.0 n’est pas déclarée prête tant que ce lot d’exécution n’est pas implémenté et qualifié. Le lot présent publie l’audit dev.5 et fixe le contrat de la prochaine étape ; il n’active pas LIVE.
