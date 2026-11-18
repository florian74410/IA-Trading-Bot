# Function Registry / CP1 — requalification après second audit

Base qualifiée de comparaison : `ef425e04182619e9992aa8a7368db2a30b2a0f87`. Les 258 identifiants, schémas, permissions, hard_deny et qualifications sont préservés. Les empreintes ont été recalculées par le mécanisme existant ; les baselines historiques restent immuables.

| Engine | Commandes avant | Commandes après | Qualifiées avant/après | Empreintes | Tests CP1 réels | Preuves | Résultat |
|---|---:|---:|---:|---|---|---|---|
| trading | 20 | 20 | 11/11 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| firewall | 3 | 3 | 1/1 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| fundamental | 63 | 63 | 2/2 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| indicator | 26 | 26 | 3/3 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| liquidity | 15 | 15 | 2/2 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| marketdata | 42 | 42 | 5/5 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| portfolio | 20 | 20 | 2/2 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| risk | 18 | 18 | 8/8 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| strategy | 13 | 13 | 3/3 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |
| supervisor | 38 | 38 | 14/14 | Recalculées | Core TLS → Router → Engine ; redémarrage/refus | [Matrice](CP1_FINAL_COMPARISON.json) et [TAP](../../Consolidation-3.0.1/Results/final-local/foundation/qualification.tap) | PASS local |

La qualification complète après audit a réussi localement : 414 exécutions PASS, 0 FAIL, 1 SKIP environnemental, dont 80 scénarios fictifs. Le workflow de consolidation répète cette qualification et les deux parcours Chromium sur le commit publié, puis exécute la suite CP1 depuis le ZIP extrait. Le résultat définitif correspond au workflow attaché au commit de BUILD.json ; aucun PASS local ne remplace ces contrôles.

Détails par commande : [CP1_FINAL_COMPARISON.json](CP1_FINAL_COMPARISON.json). Les synthèses intermédiaires et empreintes sont dans [CP1_STAGE_SUMMARIES.json](CP1_STAGE_SUMMARIES.json). Les matrices intermédiaires intégrales sont récupérables au checkpoint `c7a7841c7c47ac63edf19f0a7973ec3ecf5a1ab3` ; tous les TAP sont conservés.

Les changements de chemins et la couverture supplémentaire de Core/Shared/paths.js expliquent les nouvelles empreintes. Les contraintes Auth21, Risk, Firewall, signatures, rejeu, révocation, namespaces propriétaires et arrêt d’urgence restent obligatoires. Les commandes non qualifiées restent non qualifiées.

La correction du diagnostic Trading en cas de journal indisponible change de nouveau l’empreinte Trading ; cette modification est documentée dans IMPACT-002, puis les empreintes et la qualification complète sont recalculées après le dernier audit. Aucun pin historique n’est retouché.
