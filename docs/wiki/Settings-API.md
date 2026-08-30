# Settings / API

`Settings > API` est l'emplacement unique de configuration des informations d'authentification nécessaires aux connecteurs et providers.

## Règle obligatoire

Toute information privée requise doit être paramétrable ici : API Key, Secret, Passphrase, Token, identifiant / Key Name, clé privée, endpoint ou mode particulier lorsque nécessaire. Aucun secret ne doit être codé en dur dans l'application.

## Données publiques et fonctions privées

Lorsqu'une plateforme autorise ses Market Data publiques sans authentification, IA-TB doit pouvoir les récupérer sans exiger de clé privée. Les identifiants privés ne sont utilisés que pour les fonctions qui les nécessitent.

## CoinGecko — v1.7.9

CoinGecko peut recevoir une clé API depuis `Settings > API`. La clé est stockée dans le coffre RSA existant et n'est pas écrite en clair dans la configuration Market Data.

Lorsqu'elle est nécessaire au provider, elle est transmise au service Market Data uniquement en mémoire via le canal interne authentifié. Le provider expose son état d'authentification sans exposer la valeur du secret.

## OKX

Paramètres privés selon le mode utilisé : API Key, Secret Key, Passphrase et mode réel / démo lorsque applicable.

## Coinbase

Paramètres privés selon le type de clé : identifiant / Key Name, clé privée et paramètres supplémentaires imposés par l'API retenue si nécessaire.

## Binance / GMX

Leurs paramètres restent centralisés dans cette même section selon les besoins de chaque connecteur.

## Providers publics complémentaires

Blockchain.com et DefiLlama utilisent dans l'intégration v1.7.9 des données publiques pour les fonctions actuellement branchées. Ils ne doivent pas demander artificiellement un secret lorsqu'une commande publique n'en a pas besoin.

## Permissions

Le principe du moindre privilège s'applique. Une permission de retrait ne doit pas être exigée pour le fonctionnement normal de IA-TB, et les commandes privées de compte/trading/retrait restent séparées du catalogue Market Data.

## Test de connexion

Lorsqu'un connecteur possède des paramètres privés, l'interface doit permettre de distinguer clairement les états connecté, non configuré et erreur. Les diagnostics ne doivent jamais renvoyer le secret lui-même.
