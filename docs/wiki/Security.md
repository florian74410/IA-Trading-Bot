# Sécurité

## Secrets API

Tous les secrets nécessaires aux CEX/DEX doivent être configurables dans `Settings > API` et stockés via le mécanisme sécurisé de l'application.

Ne jamais :

- coder une clé en dur ;
- publier une vraie clé dans GitHub, le Wiki, un Issue ou un log ;
- inclure les secrets dans un package de mise à jour ;
- afficher un secret complet dans l'interface après sauvegarde.

## Principe du moindre privilège

Activer uniquement les permissions nécessaires : lecture et trading lorsque requis. IA-TB ne doit pas exiger de permission de retrait pour son fonctionnement normal.

## Données publiques

Les endpoints publics de Market Data doivent être utilisés sans authentification lorsque l'exchange le permet, afin de réduire l'exposition des secrets.

## Logs

Les logs peuvent contenir des erreurs techniques mais ne doivent pas enregistrer les clés, secrets, passphrases, tokens ou clés privées en clair.

## Dépôt GitHub

Avant tout commit : vérifier que les fichiers de configuration privés, caches et fichiers de secrets sont exclus du versionnage.
