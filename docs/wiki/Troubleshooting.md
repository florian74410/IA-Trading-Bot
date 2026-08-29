# Dépannage

## `Version source incompatible`

Cause : le patch a été construit pour une version différente de celle installée.

Exemple :

```text
archive=1.6.1 / installee=1.7.3
```

Solution : utiliser un package dont `from_version` correspond à la base installée, ou une release complète explicitement prévue pour remplacer plusieurs versions.

## Pas de chandeliers / graphique vide

Vérifier :

1. la source sélectionnée ;
2. la paire ;
3. le timeframe ;
4. l'état du provider ;
5. l'accès réseau ;
6. les limites ou erreurs de l'API.

Ne pas considérer automatiquement une autre plateforme comme remplacement équivalent.

## Connexion API privée en erreur

Vérifier les champs de `Settings > API`, les permissions de la clé, le mode réel/démo et l'horloge de la machine lorsque l'API signe les requêtes avec un timestamp.

## Market Data public fonctionne mais compte privé non

C'est possible et normal : de nombreux exchanges exposent leurs marchés et OHLCV publiquement, tandis que les fonctions compte/ordres exigent une authentification distincte.
