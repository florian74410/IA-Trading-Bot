# Update Manager

L'Update Manager installe les mises à jour versionnées de IA-TB et protège l'application contre l'application d'un patch prévu pour une autre base.

## Compatibilité de version

Un package de mise à jour déclare notamment :

```text
package_type = UPDATE
from_version = X
 to_version = Y
```

`from_version` doit correspondre à la version installée lorsque le package est conçu comme patch incrémental.

Exemple : une application `1.7.3` doit recevoir un patch construit pour `from_version = 1.7.3`. Un patch ancien déclaré `1.6.1` doit être refusé plutôt que d'écraser une base différente.

## Manifest et intégrité

Le package doit identifier les fichiers attendus et permettre leur contrôle d'intégrité, par exemple via SHA-256 selon le format de release retenu.

## Données utilisateur

Une mise à jour ne doit pas écraser les secrets, paramètres personnels, journaux ou données runtime qui ne font pas partie explicitement de la migration.

## Rollback

Toute migration sensible doit prévoir un retour à l'état précédent ou une sauvegarde suffisante pour restaurer la version antérieure.

Voir également [Versionnage et releases](Versioning-and-Releases.md) et `docs/RELEASE_PROTOCOL.md`.
