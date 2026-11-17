# Livraison dev.5 DEBUG

Branche : `feature/iatb-2.6.0-dev.5-hybrid-chatbot`, issue de dev.4 `1296471ca890ced81f653290f216a331caa3c8cb`. Audit et architecture : [AUDIT.md](AUDIT.md), [README.md](README.md).

## Résultat livré

ChatBot hybride intégré au compagnon et au Supervisor existants ; préférences privées LOCAL/HYBRID/OPENAI, interprétation structurée, dialogue de précision par session Auth21, catalogue OKX descriptif et procédures CP1 bornées. Huit procédures de lecture/état réutilisent les commandes existantes ; six types de demandes financières produisent seulement une préparation détaillée et désactivée.

466 opérations recensées (399 REST, 67 identifiants WebSocket), 24 intentions usuelles, 490 définitions reconnues. Le périmètre réel et ses limites figurent dans README. Le recensement n’équivaut pas à une implémentation intégrale de toutes les opérations.

## Vérifications

- Suite complète : 108 tests sur 32 fichiers, zéro échec, ignoré ou annulé ; Node 22.23.5. Résultats dans `Results/validation.json` et `Results/tests.tap`.
- Qualification de release : 12 tests sur les processus isolés réels, incluant le parcours ChatBot → Supervisor → Core → Router → Portfolio/Risk, les grants et leur révocation, l’historique privé et le refus de confirmation.
- OpenAI : appel externe simulé, transport propriétaire réel, contrat strict et compteur d’usage exercés. LOCAL et HYBRID sans fallback font zéro appel ; une demande explicite traverse la délégation propriétaire. Aucune consommation payante.
- Sécurité : paramètres inconnus, secret connu masqué, comptes/sessions isolés, expiration, changement matériel, catalogue invalide, droits absents/révoqués, CSRF, GUEST et réglages d’un autre utilisateur sont contrôlés.
- Les 28 commandes agent CP1 restent qualifiées, sur 244 déclarées ; 37 handlers sont vérifiés dont neuf handlers propriétaires cognitifs/hybrides protégés. Les 216 autres entrées restent bloquées pour l’agent. Détail : `Results/coverage.json`.
- Validation Chromium et captures : workflow `hybrid-chatbot.yml`, rapports et images dans l’artefact de CI. L’interface utilise les vrais assets ; son serveur de capture utilise un profil fictif et ne contacte ni OKX ni OpenAI.

## Build et reproduction

Archive complète `artifacts/IA-TB-2.6.0-dev.5-debug-source.zip` : sources App, outils, documentation, workflows et fichiers compose suivis par Git, inventaire SHA-256 par fichier dans BUILD.json. Aucun coffre mutable, jeton, dépendance node_modules ou base utilisateur. La reconstruction déterministe et le contrôle d’inventaire sont consignés dans `build-verification.json`. Ce build est une archive source DEBUG ; il ne constitue pas un déploiement ni une image de production déjà validée.

## Limites assumées

Aucun ordre soumis, fill, mutation de transfert/retrait, stratégie automatique ou activation LIVE. Le bouton Confirmer et son endpoint restent bloqués. Données de prix/slippage/total/cible inconnues affichées « Indisponible » ; aucun score Risk ou prix n’est inventé. Les contrôles utilisent les réponses externes de test ; la connexion réelle au portefeuille utilisateur et la clé OpenAI de production ne sont pas appelées pendant cette mission.

Les opérations descriptives et les demandes sans procédure qualifiée retournent indisponible. Les langages usuels sont couverts par les 24 modèles documentés ; les 466 opérations sont reconnues par leurs identifiants/routes/titres exacts, sans prétendre à une compréhension libre universelle. WebSocket n’est pas connecté par le ChatBot.
