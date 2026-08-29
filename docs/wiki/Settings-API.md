# Settings / API

`Settings > API` est l'emplacement unique de configuration des informations nécessaires aux connecteurs CEX / DEX.

## Règle obligatoire

Toute information requise par un connecteur doit être paramétrable ici :

- API Key ;
- Secret ;
- Passphrase ;
- Token ;
- identifiant / Key Name ;
- clé privée lorsque nécessaire ;
- endpoint ou mode particulier lorsque nécessaire.

Aucun secret ne doit être codé en dur dans l'application.

## Données publiques et fonctions privées

Lorsqu'une plateforme permet d'utiliser ses Market Data publiques sans authentification, IA-TB doit pouvoir récupérer ces données sans exiger de clé privée.

Les identifiants API servent uniquement aux fonctions qui le nécessitent, par exemple :

- compte ;
- portefeuille ;
- positions ;
- ordres ;
- trading privé.

## Permissions

Principe de moindre privilège : seules les permissions réellement nécessaires doivent être activées.

Par défaut, une permission de retrait ne doit pas être exigée pour le fonctionnement normal de IA-TB.

## Connecteurs

### OKX

Paramètres privés à prévoir selon le mode utilisé :

- API Key ;
- Secret Key ;
- Passphrase ;
- mode réel / démo lorsque applicable.

### Coinbase

Paramètres privés à prévoir selon le type de clé utilisé :

- identifiant / Key Name ;
- clé privée ;
- autres paramètres imposés par l'API retenue si nécessaire.

### Binance / GMX

Leurs paramètres restent centralisés dans la même section selon les besoins de chaque connecteur.

## Test de connexion

Lorsqu'un connecteur possède des paramètres privés, l'interface doit proposer un moyen de vérifier la configuration et afficher un état clair, par exemple :

- connecté ;
- non configuré ;
- erreur.
