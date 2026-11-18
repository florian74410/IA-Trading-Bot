> Correction de comptage : les dix Engines exposent 258 commandes, dont 51 qualifiées ; le total manuel de 358 mentionné dans cette archive était erroné. Les inventaires par Engine et comparaisons de contrats étaient exacts.

> Archive de reprise : cet état suspendu a été repris par la consolidation. Le blocage de stockage et les autres résultats actuels sont documentés dans `Documentation/Consolidation-3.0.1/`. Ce document conserve la trace du diagnostic initial.

# Reprise suspendue — migration Rev3 NON QUALIFIÉE

Le 18 novembre 2026, la demande utilisateur a été réorientée vers la reformulation de la mission de consolidation du build le plus récent. Aucun nouveau déplacement ne doit être lancé sans reprendre cet état et ses blocages.

## Références à préserver

- Dernière référence qualifiée confirmée dans cette session : Rev2 `ef425e04182619e9992aa8a7368db2a30b2a0f87` (409 PASS CI, 0 FAIL, 0 SKIP, 80 scénarios et 7 workflows réussis).
- Branche de travail : `refactor/iatb-3.0.1-Rev3-engines-layout`.
- Étapes locales Trading, Firewall, Fundamental et Indicators : quatre migrations commitées, chacune avec 93 exécutions CP1 PASS et comparaison des 358 contrats/51 commandes qualifiées à la Rev2.
- Avant ce point de reprise, seul le checkpoint Trading `e5c311d331e8654c72ffd7fa836c53bbb519eb6d` était publié. Le SHA du prochain checkpoint distant pourra différer du SHA local, mais son arbre doit être identique.
- Les anciens dossiers retirés ont été conservés hors du dépôt dans `../rev3-preserved-old/` ; aucune donnée réelle ni aucun VPS n'a été utilisé.

## Blocage confirmé : racine persistante Fundamental

La migration du code a également transformé le segment `Fundamental` dans `App/Core/Shared/paths.js`, pour la construction de `FUNDAMENTAL_DATA`. Le chemin d'origine est `Shared Data/Fundamental` ; `Shared Data/Engines/Fundamental` n'est pas une migration de données autorisée. Cela pourrait créer une nouvelle base au lieu de retrouver la base existante. Les tests CP1 sur répertoires fictifs vides ne suffisent pas à détecter cette régression.

**Ne pas déployer ni déclarer cette branche qualifiée.** Rétablir la stabilité des chemins privés, puis ajouter un test de non-régression utilisant une base préexistante dans l'ancien emplacement et vérifier l'absence de nouvelle base à un autre endroit. Ne pas déplacer ni supprimer les données pour faire réussir ce contrôle.

La cause se trouve aussi dans `Tools/Architecture/Rev3/migrate.js` : le traitement des segments de `path.join/resolve` doit distinguer une racine de code App d'une racine de stockage. Ne pas relancer ce script sans corriger cette distinction. Contrôler toutes les autres ressources persistantes ainsi que le mécanisme d'import de l'ancienne base locale Fundamental.

## Travaux restant obligatoires

Les six autres Engines, la qualification globale Auth21/CP1/Firewall/Risk, les scripts Shell/Docker, les chemins dynamiques, la documentation active, la suppression contrôlée des anciens emplacements, le second audit complet et la requalification finale n'ont pas été terminés. Aucun package Rev3 final n'a été produit. Les deux essais CP1 Trading échoués et leurs corrections de fixtures sont conservés, sans suppression de preuves.

Les registres ont été régénérés avec le mécanisme existant ; les références historiques `Tools/CI/baselines/` sont conservées comme archives immuables et ne doivent pas être recalculées pour masquer une divergence.

Consulter `CP1_REQUALIFICATION.md`, `MIGRATION_PATH_CHANGES.json`, `REV2_BASELINE.json` et `Results/`. Les PASS intermédiaires ne constituent pas une qualification globale de Rev3.
