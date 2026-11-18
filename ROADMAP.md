# Livraison courante : 3.0.2 Rev-X

La consolidation ci-dessous est intégrée au build complet 3.0.2 Rev-X, demandé explicitement après l’audit. [Rapport et qualification](Documentation/Consolidation-3.0.2/FINAL_REPORT.md). Runtime 3.0.2-dev.1, mêmes contrats CP1, aucun nouveau pouvoir financier.

# Roadmap IA-TB 3.0.1 — distribution Rev3

Le build conserve Advanced Manual Trading et le runtime 3.0.1-dev.1. La consolidation termine les dix déplacements vers App/Engines/, protège les racines persistantes et requalifie Function Registry/CP1.

- [x] Dix Engines canoniques, imports et lanceurs adaptés.
- [x] Compatibilité Fundamental/Indicators et tests sur données préexistantes fictives.
- [x] Comparaison des 258 commandes, 51 qualifiées, sans élargissement des permissions.
- [x] Nettoyage des sorties redondantes et preuves récupérables dans Git.
- [x] Second audit et qualification locale complète.
- [ ] Recette utilisateur sur sa propre installation : chantier distinct.
- [ ] Déploiement VPS et promotion stable : hors de cette mission.

La livraison exige le workflow de qualification et le test du ZIP extrait pour le commit de BUILD.json. Les fonctionnalités nouvelles du Supervisor, la création libre d’indicateurs et une éventuelle 3.0.2 restent des chantiers futurs.

[Rapport actuel](Documentation/Consolidation-3.0.1/FINAL_REPORT.md) · [Qualification](Documentation/Consolidation-3.0.1/QUALIFICATION.md)

<details><summary>Roadmap historique 2.4 (archive)</summary>

# Roadmap de la source 2.4

## Base intégrée

- [x] Finance Calendar structuré, calendrier unifié et données FED préservées.
- [x] Trading Logs V2 : JSONL et miroir SQLite réparable, masquage, gardes snapshot.
- [x] 2.4.1 : calendrier responsive, marqueurs temporels discrets, alignement Bank.
- [x] 2.4.1 : suspension Swap/Bridge, coffres et prêts ; lectures collecteur CP/1 pour Supervisor.

## 2.4.2-R1 — nettoyage de la copie source

- [x] Inventaire complet avant modification et plan détaillé versionné.
- [x] Retrait des anciens builds et artefacts inutilisés ; historique conservé par Git.
- [x] Retrait des fonctions/objets sans consommateur et du stub Liquidity obsolète.
- [x] Préservation des contrats CP/1, données de migration et contrôles Auth21/Firewall.
- [x] Contrôles de syntaxe, imports, ressources, versions et suites métier/UI.
- [ ] Recette utilisateur locale sur https://localhost:8000.
- [ ] Éventuelle promotion stable et déploiement : chantier distinct, après recette.

La branche de livraison est `2.4.2-R1`, version numérique `2.4.2`, révision `R1`,
statut DEV. Aucun déploiement GEN-1 ni fusion vers main n'est réalisé ici.

[Plan et preuves](Documentation/Cleanup/2.4.2-R1/REVIEW.md) ·
[Résultats et limites](Documentation/Cleanup/2.4.2-R1/RESULTS.md) ·
[Roadmap historique](https://github.com/florian74410/IA-Trading-Bot/blob/189e9c09f1549dd8f2f73bb62c62fc19d6f31d15/ROADMAP.md)

</details>
