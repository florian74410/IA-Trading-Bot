# 📦 IA-TB — Répertoire des versions

Ce répertoire centralise désormais **les versions historiques, les patchs et les archives** du projet. Le regroupement est organisationnel : il ne change pas le contenu des fichiers.

| Dossier | Contenu |
|---|---|
| `Versions/v1.8.6.3/`, `Versions/v1.8.6.4/` | Index de versions historiques |
| `Versions/Patches/` | Anciens correctifs et archives de mise à jour (précédemment `Patches/`) |
| `Versions/Archives/` | Anciennes archives et historiques (précédemment `Archives/`) |

## Quelle version télécharger ?

La **dernière release publiée** se trouve dans [GitHub Releases](https://github.com/florian74410/IA-Trading-Bot/releases), avec ses archives et empreintes. **v2.2.0 est TEST**, publiée pour recette GEN-1. La dernière production validée connue reste **v2.1.1**.

Ce déplacement des archives historiques **ne crée pas un build v2.2.0** dans `Builds/`. Un packaging reproductible distinct est nécessaire si ce livrable est souhaité.

## Historique et compatibilité

Les anciens liens `Patches/...` deviennent `Versions/Patches/...`, et `Archives/...` deviennent `Versions/Archives/...`.

Les références écrites dans les anciens documents et scripts peuvent nécessiter une migration avant fusion. Ne pas déployer ou exécuter un updater basé sur ces chemins sans l'avoir vérifié.

**Sécurité :** aucun secret, aucune clé ni donnée utilisateur ne doit être ajouté ici. Les archives déjà publiées dans GitHub Releases ne sont pas modifiées.
