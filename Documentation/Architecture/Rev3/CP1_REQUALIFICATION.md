# Function Registry / CP1 — requalification finale et continuité 3.0.2 Rev-X

Référence qualifiée : Rev2 ef425e04182619e9992aa8a7368db2a30b2a0f87, baseline gelée inchangée. La migration Rev3 est intégrée au build complet 3.0.2 Rev-X. Les 258 identifiants et leurs schémas, permissions et qualifications restent identiques ; les versions de contrats restent indépendantes de la version applicative.

| Engine | Commandes avant | Après | Qualifiées avant/après | Empreintes | Tests CP1/sécurité | Preuves | Résultat local |
|---|---:|---:|---:|---|---|---|---|
| trading | 20 | 20 | 11/11 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| firewall | 3 | 3 | 1/1 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| fundamental | 63 | 63 | 2/2 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| indicator | 26 | 26 | 3/3 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| liquidity | 15 | 15 | 2/2 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| marketdata | 42 | 42 | 5/5 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| portfolio | 20 | 20 | 2/2 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| risk | 18 | 18 | 8/8 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| strategy | 13 | 13 | 3/3 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |
| supervisor | 38 | 38 | 14/14 | Recalculées | Core TLS → Router → Engine ; refus/rejeu/reprise | [Matrice](CP1_FINAL_COMPARISON.json), [TAP](../../Consolidation-3.0.2/Results/final-local/foundation/qualification.tap) | PASS |

La qualification complète après second audit et dernières corrections passe localement : **417 exécutions PASS, 0 FAIL, 1 SKIP environnemental**, dont 80 scénarios fictifs. Elle inclut désormais l’indépendance des versions et deux tests déterministes de clés générées. Les chiffres représentent des exécutions de suites pouvant se recouper.

Les empreintes ont été recalculées par les mécanismes existants puis requalifiées, pas modifiées artificiellement. Les déplacements et Core/Shared/paths.js expliquent les changements initiaux. Les deux sources Bank de génération de clés sont désormais couvertes par les digests des parcours financiers Trading, Firewall, Risk et Supervisor ; IMPACT-004 documente cette dépendance et son correctif de largeur, sans changer les permissions ni les données existantes.

Les [synthèses intermédiaires](CP1_STAGE_SUMMARIES.json), toutes les tentatives TAP, le checkpoint c7a7841c et le candidat conservé c0e94a1c gardent les preuves précédentes. Le [rapport 3.0.2](../../Consolidation-3.0.2/FINAL_REPORT.md) distingue ces étapes de la nouvelle livraison.

Le workflow **IA-TB 3.0.2 Rev-X complete build qualification** répète intégralement la qualification, Chromium, Docker, la reproductibilité et le test CP1 depuis l’archive extraite pour le commit exact de BUILD.json. Son résultat et la matrice JSON par commande sont les preuves définitives. Un PASS local ne remplace pas ces contrôles.

Auth21, Risk, Firewall, signatures, rejets, expiration, révocation, arrêt d’urgence et namespaces propriétaires restent obligatoires. Aucune commande non qualifiée ne devient autorisée. Aucun ordre réel/Demo, appel IA payé, fusion ou VPS.
