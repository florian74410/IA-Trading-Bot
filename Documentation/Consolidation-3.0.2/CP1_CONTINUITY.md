# Continuité Function Registry / CP1 — 3.0.2 Rev-X

La migration Rev3 et sa référence gelée restent documentées dans [CP1_REQUALIFICATION.md](../Architecture/Rev3/CP1_REQUALIFICATION.md). Les 258 commandes et 51 handlers qualifiés conservent leur identité, leurs schémas et leurs permissions. Les handlers et dépendances sont recalculés puis qualifiés par les outils existants, sans éditer artificiellement de digest attendu.

La version de l’application devient 3.0.2-dev.1 ; les contrats existants conservent leur contract_version. Le catalogue reprend ce champ du contrat existant, plutôt que de le remplacer implicitement par la version applicative. Les métadonnées engine_version des registres indiquent bien la version applicative courante. Le test release_version.test.js vérifie l’intégralité des fonctions lors d’un changement de version.

Le comparateur strict Rev3 reste inchangé : seules les différences de chemins de source et d’empreintes de migration étaient autorisées. Les baselines Rev2 ne sont jamais réécrites. Le workflow final répète l’intégration Core → Router → chacun des dix Engines, les protections et la qualification extraite du package. Sa matrice par commande est jointe aux artifacts du commit final.
