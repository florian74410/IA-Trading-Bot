# IMPACT-003 — contexte Docker incomplet

Deuxième passe nécessaire avant correction. La règle préexistante `**/*test*.js` de App/.dockerignore exclut aussi le module de production `Core/Clients/auth21_trading_attestation.js`, utilisé par le bridge ADMIN et par Trading. Les exclusions `Tools/*preflight*.js`/`Tools/*smoke*.js` retirent également des commandes explicites des fichiers Compose et le COPY du Dockerfile de préflight. Preuve : contrôle des règles, consommateurs et commandes Compose ; l’exécution Docker n’est pas disponible localement.

Décision étudiée : garder les exclusions précises des dossiers Tests/tests et suffixes .test.js, préfixes test_ et self-test diagnostic. Retirer les exclusions globales des helpers CLI requis par Compose ; ils ne démarrent rien implicitement. Conserver toutes les exclusions des secrets, bases, données runtime et node_modules ; le CA public reste autorisé. Aucun privilège, API ou contrat CP1 n’est modifié, aucun service nouveau.

Bénéfice : les sources de sécurité et points d’entrée requis se retrouvent dans l’image. Risque : embarquer davantage de sources CLI ; ce coût est explicite, aucune réduction de taille n’autorise de supprimer un composant opérationnel. Alternative écartée : désactiver la signature/attestation ou ne plus tester les commandes Compose.

Validation : CI Ubuntu, validation Compose avec identifiants fictifs, construction effective des deux Dockerfiles et contrôle hors réseau du contenu de l’image complète (syntaxe, imports relatifs et points d’entrée des dix Engines). La qualification complète des sources et CP1 est répétée sur le commit livré, puis depuis son ZIP extrait. Pas de démarrage de stack connectée à un exchange, pas de VPS.

Rollback : restauration de App/.dockerignore et du commentaire Dockerfile du checkpoint c7a7841c ; cette restauration réintroduirait le défaut de packaging et ne doit pas être qualifiée. Aucun volume privé ni donnée touché.
