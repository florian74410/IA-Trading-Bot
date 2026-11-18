# Advanced Manual OKX — IA-TB 3.0.1_Rev1

Source obligatoire : `release/iatb-3.0.1-Rev1-full-source`, commit `41d9ea0b00ae0c59f3f58b0b403cde05d6fd8d58`.
Livraison : `feature/iatb-3.0.1-Rev1-advanced-okx-orders`. Le commit exact du paquet figure dans `BUILD.json`.

Cette extension conserve Core/Auth21, le coffre propriétaire, le Router CP1, le Supervisor, Risk, Firewall, Trading et Portfolio. Aucun second Supervisor ou Trading Engine n'est introduit. Le Supervisor cognitif conserve exclusivement ses permissions de lecture ; les mutations restent dans le parcours manuel confirmé.

## Audit de la Rev1

| Fonction | Existant au départ | Raccordement ou développement | Tests de référence |
|---|---|---|---|
| Spot Market Buy/Sell | Core, Risk strict, confirmation, OKX | Conservé ; contrat avancé et diagnostic manuel ajoutés | `manual_orders`, 41 scénarios dev.7, pipeline owner |
| Limit/Post-only/IOC/FOK | Catalogue et capacités déclarées ; adaptateur principal limité au Market | Parcours propriétaire complet, décimales exactes, états broker | T03–T07 |
| Cancel | Adaptateur présent, entrée LIVE non accessible dans ce parcours | Résolution exacte et vérification de l'état après ACK | T08–T09 |
| Amend | Reconnaissance uniquement | Validation de la cible et modification explicite | T10–T11 |
| TP/SL/OCO/Trigger/Trailing | Reconnaissance uniquement | Adaptateur existant étendu, routes explicites | T12–T22 |
| Levier et positions | Lectures partielles, aucune mutation manuelle raccordée | Portée instrument/marge/position, configuration distincte et vérifiée | T23–T32 |
| Ordres multiples | Pas de chaîne financière exécutable | Plans finis confirmés et batch Spot explicite | T53–T55, Q10–Q11 |
| Historique | JSONL et migration SQLite ; erreur SQLite parfois masquée | File durable, reprise indépendante des destinations, déduplication | T49–T50, tests outbox |
| Mémoire Supervisor | Foundation 3.0.1 SQLite et récupération | Conservée ; non-régression obligatoire | Qualification Foundation |

## Chemin d'exécution

1. LOCAL et OpenAI produisent les mêmes intentions validées par `ChatBot/Contracts`.
2. Le Supervisor conserve l'intention, son empreinte, la conversation et l'expiration. Il ne transmet pas de mutation à un sous-agent.
3. Core réalise les lectures privées et l'analyse Risk au nom du propriétaire Auth21.
4. La préparation contient les paramètres exacts, la révision du compte, les informations disponibles, les valeurs `null`, les avertissements et une nouvelle empreinte de confirmation.
5. L'utilisateur confirme cette empreinte et accepte explicitement les avertissements/N/C de cette seule demande.
6. Core réserve les ressources en SQLite, consomme la confirmation du Supervisor, vérifie à nouveau les paramètres techniques et émet une preuve Auth21 liée à la commande, au compte, au propriétaire et aux diagnostics affichés.
7. Risk conserve un verrou impératif d'activation et émet une autorisation à usage unique pour cette opération exacte. Les scores et limites analytiques ne constituent plus un veto automatique dans ce parcours.
8. Router CP1 et Firewall conservent authentification de service, signature, contrôle des commandes/instruments et protections contre le rejeu. Firewall consomme l'autorisation Risk et vérifie indépendamment la preuve Core.
9. Le Trading Engine existant vérifie une seconde fois l'autorité, le coffre et l'état d'urgence. Il réserve durablement l'opération avant l'appel de l'adaptateur OKX.
10. Les ACK, fills et annulations effectives restent distincts. Les résultats incertains sont recherchés par identifiant exact, sans renvoi financier automatique.
11. Les événements stables sont transmis à l'historique et à Portfolio par une outbox persistante.

## Contrats

Les commandes natives sont `trading.manual.order`, `.algo`, `.cancel`, `.amend`, `.cancel_algo`, `.amend_algo`, `.leverage` et `.batch` ; la lecture privée utilise `trading.account.inspect`. Risk reçoit `risk.manual.authorize` via l'enveloppe propriétaire authentifiée existante. Aucune règle générique n'accorde ces mutations aux agents.

Le modèle métier conserve montants, unités, instrument, mode de marge, position, protections et dépendances. `exchange-adapters/okx/order-model.js` centralise leur traduction et `manual.js` centralise les chemins HTTP et la signature OKX. Les champs non applicables à une famille sont refusés. Les tailles, ticks et conversions quote/base utilisent des opérations entières décimales avant envoi. Les valorisations et estimations restent informatives.

Les empreintes de qualification couvrent également les dépendances de sécurité partagées de `Core/Execution`. Les capacités publiées distinguent le contrat avancé et le chemin historique Spot Market. Les nouveaux contrats restent `hard_deny` pour les agents, même après qualification propriétaire.

## Risk, confirmation et interface

Une métrique absente reste `null`, affichée `N/C`. Les frais, funding, liquidation et total ne sont pas inventés. Un total futur d'algorithme ou un coût de marge non calculable demeure N/C. Pour une vente Spot, le produit estimé déduit les frais connus.

Les fonds connus insuffisants, un instrument inaccessible, une quantité/précision invalide, une cible absente, une session révoquée, un compte modifié, une confirmation périmée, une réservation conflictuelle, un état broker inconnu et un arrêt d'urgence restent impératifs. L'acceptation du risque ne les désactive pas. Le contrôle Risk doit être disponible et activé pour émettre l'autorisation technique.

Companion présente le récapitulatif complet, une case d'acceptation liée à la demande, les notifications d'état et un bouton de vérification/réconciliation. Le bouton de reprise d'un plan confirmé reste explicite. Les états finaux et les notifications sont persistés dans le journal manuel propriétaire.

## Reprise et Portfolio

Les tables manuelles sont ajoutées aux bases existantes, avec WAL/FULL. Les identifiants client sont déterministes et propres à chaque préparation. Les opérations inconnues ne sont jamais soumises à nouveau automatiquement. Une lecture de l'historique réactive le suivi ciblé des opérations du propriétaire authentifié ; le suivi ne soumet aucun ordre.

Les fills ont des identifiants d'événement stables. Les contrats linéaires conservent leur quantité brute et leur multiplicateur dans les métadonnées ; Portfolio reçoit aussi leur équivalent en actif sous-jacent. Les contrats inverses sont refusés tant que leurs calculs ne sont pas qualifiés.

La panne d'une destination ne bloque pas la livraison à l'autre. La file conserve les échecs d'écriture et de publication ; la reprise du JSONL déduplique tous les identifiants déjà écrits, indépendamment d'une fenêtre « derniers événements ».

## Plans et limites explicites

Les plans représentent des demandes finies, avec au maximum 20 étapes et des dépendances vers des étapes précédentes. Une dépendance financière attend `FILLED`, et une dépendance de configuration attend `LEVERAGE_VERIFIED`. Un échec annule les étapes dépendantes non envoyées ; aucune transaction inverse n'est exécutée pour compenser une opération acceptée. Les étapes indépendantes gardent des résultats distincts.

Un batch n'est produit que sur demande explicite, pour un même compte/instrument Spot et au maximum 20 ordres. Ses réponses sont contrôlées individuellement. Les groupes multi-instruments, dérivés ou dépendants utilisent des plans distincts, sans prétendre former une transaction atomique.

Les demandes incomplètes demandent une clarification. Une protection dépendante doit avoir une quantité explicite ; cette version ne devine pas une taille future à partir d'un achat en quote. Une position introuvable n'est jamais remplacée par une autre. Les étapes dont la confirmation est expirée exigent une nouvelle préparation.

L'ancien contrat strict Spot Market reste disponible avec `IATB_MANUAL_ORDERS_LEGACY_COMPAT=1` pour compatibilité/qualification historique. Il ne fournit aucune des nouvelles commandes. La politique avancée est le parcours par défaut des nouvelles préparations.

## Distribution et VPS

Le constructeur complet est `Tools/Build/build_rev1_full_source.py`. L'archive AdvancedOKX inclut tous les modules, assets, tests, CI et scripts de la Rev1 ; les secrets, bases runtime, dépendances et sorties de tests générées sont exclus. Le paquet original reste disponible sur sa branche source et n'est pas écrasé.

Aucun déploiement VPS ni aucune mutation sur OKX réel ou Demo ne fait partie de cette qualification. Voir `ADVANCED_ORDER_QUALIFICATION.md` pour les preuves, limites et procédures de déploiement/rollback.
