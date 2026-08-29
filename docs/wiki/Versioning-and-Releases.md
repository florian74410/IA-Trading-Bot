# Versionnage et releases

Le cycle de release officiel de IA-TB suit cet ordre :

1. Versionnage
2. Développement
3. Tests
4. Construction et validation du patch
5. CHANGELOG
6. Déploiement GitHub
7. Analyse d'impact Wiki
8. Mise à jour du Wiki

La procédure complète est définie dans `docs/RELEASE_PROTOCOL.md` et contrôlée avec `.github/RELEASE_CHECKLIST.md`.

## Compatibilité des patchs

Chaque patch doit déclarer explicitement :

- `from_version`
- `to_version`
- le type de package

`from_version` doit correspondre exactement à la version installée ciblée. Une incompatibilité de version source bloque l'installation et la release.

## Documentation Wiki

Après le déploiement GitHub :

- déterminer les pages impactées ;
- les mettre à jour ;
- ou inscrire explicitement `Wiki impact: NONE` lorsqu'aucune page n'est concernée.

Le Wiki ne doit jamais annoncer comme disponible une fonctionnalité non encore publiée.
