# Livraison — IA-TB 2.6.0-dev.4 DEBUG

Base : `feature/risk-engine-parallel-snapshots`, commit `e115285a8d0484b139ecb706d2361193eda30f2d`, version 2.6.0-dev.3. Branche de livraison : `integration/iatb-2.6.0-dev.4`. Aucun merge dans main, aucun déploiement ni ordre réel.

Le rapport de consolidation et les SHA sources figurent dans CONSOLIDATION.md et consolidation.json. Les divergences utiles de synchronisation ont été réintégrées fonctionnellement dans le contrôle Auth21 commun ; les vieux relais à token partagé et changements de version dev.2 ne sont pas réintroduits. Les fonctionnalités Supervisor déjà ancêtres de Risk ont été conservées.

## Matrice de qualification

| Composant | Déclarées | Handlers vérifiés | Publiées | Routables par agent, après grant | Commandes agent testées | Bloquées pour agent |
|---|---:|---:|---:|---:|---:|---:|
| marketdata | 42 | 5 | 42 | 5 | 5 | 37 |
| indicator | 26 | 3 | 26 | 3 | 3 | 23 |
| fundamental | 63 | 2 | 63 | 2 | 2 | 61 |
| liquidity | 15 | 2 | 15 | 2 | 2 | 13 |
| strategy | 13 | 3 | 13 | 3 | 3 | 10 |
| risk | 17 | 7 | 17 | 7 | 7 | 10 |
| portfolio | 20 | 2 | 20 | 2 | 2 | 18 |
| firewall | 3 | 1 | 3 | 1 | 1 | 2 |
| trading | 11 | 2 | 11 | 2 | 2 | 9 |
| supervisor | 30 | 6 | 30 | 1 | 1 | 29 |
| **Total** | 240 | 33 | 240 | 28 | 28 | 212 |

Les neuf Engines et Supervisor sont découverts. Les 28 commandes agent qualifiées ont été exécutées : 23 sur le banc partagé, cinq sur le parcours propriétaire/market OKX. Les cinq handlers cognitifs supplémentaires sont vérifiés par les tests historiques propriétaire, tout en restant protégés et inaccessibles aux outils génériques. Ils sont donc inclus dans les handlers vérifiés et dans les commandes bloquées. La liste exacte des commandes indisponibles figure dans unavailable-commands.json.

## Tests et simulation

- 98 tests réussis sur 30 fichiers, zéro échec, zéro test ignoré ou annulé ; Node v22.23.5.
- Simulator Engines : 14 étapes, état True ; lectures réelles et refus attendus.
- Simulator OKX Spot : 6 étapes, état True ; résolution du compte fictif, données externes de test, snapshot et récupération Risk, puis refus de l’ordre.
- Le scénario conserve Risk UNAVAILABLE lorsque le PnL journalier ajusté des flux ou les protections nécessaires manquent. Il ne fabrique pas une approbation positive.
- Les vrais handlers risk.gate.evaluate et risk.gate.verify sont aussi exercés ; approbation absente/invalide refusée. Une soumission technique signée traverse Router et Firewall mais reste bloquée par les protections. L’appel direct à Trading, même muni d’une preuve machine, est refusé sans transmission Firewall.
- Le rejeu de soumission est refusé. Le journal du transport d’exchange de test contient uniquement des lectures et aucune requête de création d’ordre. Les écritures Portfolio observées proviennent des vrais snapshots de lecture ; aucun événement de fill n’est inventé.
- Permissions absentes, temporaires expirées, ONCE concurrent, révocation avant admission, contrat changé, identité falsifiée, contexte portefeuille étranger, requête invalide, handler inconnu et réponse malformée sont couverts.
- Chaque Engine et Supervisor est arrêté puis redémarré : appel refusé pendant la panne, publication et lecture récupérées. Core et Router sont aussi redémarrés. Un Risk réellement suspendu teste le timeout réseau et l’absence de resoumission automatique.

Les ordres acceptés, fills, déduplication d’un ordre réellement accepté et événements Portfolio issus d’un fill restent non exécutables dans ce profil : LIVE est désactivé et les fonctions financières ne sont pas qualifiées pour l’agent. Le résultat validé est leur refus, conformément aux protections demandées.

## Mesures locales

Sur 50 appels risk.status, P50 = 65.34 ms ; P95 = 91.79 ms ; P99 = 121.84 ms.
Le temps CPU du processus commun Core/harness est de 53391 µs par appel. Ce chiffre inclut le pilote et ne mesure pas le CPU cumulé de tous les processus.
Découverte du simulateur partagé : 72.62 ms. Les rapports JSON détaillent la validation des permissions et les segments de routage mesurés par Router. Les horloges et ressources de la machine influencent ces valeurs ; la procédure et les jeux de données sont versionnés.

## État réel et limites

- CP1, Router, Function Registry, permissions et Gateway sont opérationnels pour les contrats qualifiés dans le banc isolé.
- Les appels des neuf Engines et de Supervisor ont été exercés, avec authentification et réponses structurées. Les tests de reprise des dix processus sont enregistrés dans benchmark.json.
- Risk dev.3 et le raccordement au compte OKX du profil sont conservés. La Gateway utilise la même délégation propriétaire ; aucun secret API ne rejoint le modèle.
- Le build est prêt pour développer le Supervisor intelligent sur la Gateway, avec le périmètre de commandes qualifiées indiqué. Les 212 autres commandes restent bloquées ; leur migration et qualification supplémentaires sont explicites et ne sont pas annoncées comme terminées.
- ChatBot, intentions nouvelles, mémoire nouvelle, planification OpenAI et scalping natif ne sont pas développés ici. Les contrôles de trading réels restent désactivés.
- Le Core TLS du banc emploie les vrais modules de registre et de routage Auth21 ; les tests de rôles emploient aussi le vrai UserStore SQLite. Cette vérification ne valide pas un démarrage complet Core/UI sur le VPS, le réseau public ou les secrets de production.
- Le build livré est un bundle source intégral et reproductible, avec manifeste et SHA-256 ; les dépendances sont à installer par npm ci. Ce n’est pas une image de déploiement activée.

Voir README.md pour installation, tests, activation technique ultérieure, protection des clés et retour à e115285a. Le commit publié et l’artefact sont identifiables par le lien de branche et la CI ; le manifeste du bundle vérifie chaque fichier sans imposer de SHA de commit autoréférent.
