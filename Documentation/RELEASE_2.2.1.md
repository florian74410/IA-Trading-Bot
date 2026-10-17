# IA-TB 2.2.1 — dernière version publiée, recette GEN-1

La 2.2.1 remplace la 2.2.0 comme version la plus récente à télécharger.
Elle conserve le statut applicatif **TEST** : la recette GEN-1 et la promotion
opérationnelle restent distinctes de la publication GitHub Latest.

## Contenu

- Tous les développements User Management V1 et ChartViewer présents en 2.2.0.
- Correction du normaliseur microstructure : un open interest absent reste
  indisponible ; il ne devient plus un zéro déclaré disponible avec un markPrice
  nul. Le carnet Kraken valide peut ainsi traverser le Firewall et être persisté.
- Un véritable open interest égal à zéro reste zéro ; aucune règle du Firewall
  n'est désactivée ou affaiblie.
- Runtime, Paramètres, paquet, manifeste, Compose et vérification CI en 2.2.1.

## Validation

14 tests locaux passent pour le correctif, la liquidité, la normalisation OI et
la frontière DEX. Le nouveau test exerce le fournisseur simulé, le collecteur,
le vrai Firewall, une vraie base SQLite et la relecture de l'historique.
La publication automatique exige aussi les suites sécurité/navigateur sans
skip et la qualification Docker des 13 services avant/après redémarrage.
La preuve distante de ces contrôles figure dans qualification.json.
Aucune validation de production GEN-1 n'est annoncée par cette publication.

## Déploiement

Utiliser le tag **v2.2.1**, construire l'image **iatb:2.2.1** et suivre
[la recette sur copie](GEN1_TEST_2.2.1.md). Le fichier Compose reste
`compose.v2.2.gen1-test.yml` et utilise désormais l'image 2.2.1.
Ne pas réutiliser une image 2.2.0 sous un nom différent.
Après démarrage, refaire la demande CP/1 BTCUSD/KRAKEN et vérifier l'augmentation
de microstructure_snapshots dans le volume de recette réellement monté.

Les limites et fonctions indisponibles de [2.2.0](RELEASE_2.2.0.md) restent
applicables : notamment exécution financière, REMOTE_LLM, email et snapshots à
chaud. Aucun service GEN-1 n'est modifié par la publication.
