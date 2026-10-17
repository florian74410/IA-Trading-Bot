# Publication du Wiki GitHub

Les sources officielles du Wiki sont conservées dans `docs/wiki/` afin qu'elles soient versionnées avec le code et relisibles dans les pull requests.

## Wiki natif GitHub

Le dépôt doit avoir l'option **Wikis** activée dans `Settings > General > Features`.

Une fois le Wiki natif activé, les fichiers de `docs/wiki/` servent de source de publication : `Home.md`, `_Sidebar.md` et les pages associées.

## Règle de synchronisation

Le dépôt reste la source de vérité. Une modification faite directement dans le Wiki natif doit être répercutée dans `docs/wiki/` ou elle risque d'être perdue lors de la prochaine synchronisation.

## Pourquoi conserver les deux

- `/docs/wiki` : versionné avec le code, reviewable, rattaché aux releases ;
- Wiki GitHub natif : navigation plus agréable pour les utilisateurs.
