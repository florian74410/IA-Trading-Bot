# Départ de 3.0.2 Rev-X

La version 3.0.2 Rev-X est créée à la demande explicite de l’utilisateur après la consolidation du build 3.0.1. Ce numéro n’est pas présenté comme une branche retrouvée lors de l’audit initial.

Source complète conservée : `c0e94a1c9be92282f04e0e2f1db647277e10b2b1`, branche `maintenance/iatb-3.0.1-full-consolidation`, PR #31. Départ antérieur de consolidation : `1b6a01f012169bfd4d1034c0d9d19b20b2fc9284`. Dernière référence qualifiée avant ces travaux : Rev2 `ef425e04182619e9992aa8a7368db2a30b2a0f87`.

Le candidat 3.0.1 a passé localement 414 exécutions / 0 FAIL / 1 SKIP, 80 scénarios inclus, 133 unités Engine, 23 tests calendrier et 93 tests CP1 du ZIP extrait. Sa CI a validé les deux builds Docker et le contenu des images ; la suite graphique Firefox a révélé une assertion exécutée avant stabilisation des deux rendus pendant un redimensionnement. La 3.0.2 corrige cette synchronisation et ne reçoit aucune qualification par héritage automatique.

Branche de livraison : `release/iatb-3.0.2-Rev-X-full-source`. Runtime : `3.0.2-dev.1`, distribution : `3.0.2_Rev-X`, statut DEBUG. Les versions des contrats CP1 et des composants indépendants sont conservées ; une évolution d’application ne constitue pas une modification de schéma.
