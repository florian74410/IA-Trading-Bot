# Suppressions vérifiées

9 fichiers générés suivis retirés du checkout actif ; 1,740,614 octets bruts. Les résumés de remplacement et nouvelles preuves sont comptés séparément dans le bilan final.

| Fichier | Octets retirés | Justification |
|---|---:|---|
| `Documentation/Architecture/Rev3/Results/rev3-firewall-commands.json` | 192559 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |
| `Documentation/Architecture/Rev3/Results/rev3-fundamental-commands.json` | 193063 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |
| `Documentation/Architecture/Rev3/Results/rev3-indicator-commands.json` | 193271 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |
| `Documentation/Architecture/Rev3/Results/rev3-liquidity-commands.json` | 193391 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |
| `Documentation/Architecture/Rev3/Results/rev3-marketdata-commands.json` | 193727 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |
| `Documentation/Architecture/Rev3/Results/rev3-portfolio-commands.json` | 193887 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |
| `Documentation/Architecture/Rev3/Results/rev3-risk-commands.json` | 194031 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |
| `Documentation/Architecture/Rev3/Results/rev3-strategy-commands.json` | 194135 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |
| `Documentation/Architecture/Rev3/Results/rev3-trading-commands.json` | 192550 | Redundant full per-command matrix; final full matrix and all stage TAP/digest summaries retained |

Originaux récupérables au commit `c7a7841c7c47ac63edf19f0a7973ec3ecf5a1ab3`. Aucun source métier, test pertinent, migration SQL, secret, base ou donnée utilisateur supprimé. Les TAP de chaque étape, échecs compris, restent conservés. La matrice complète finale reste disponible. Le nom ancien d’un fichier n’a jamais été utilisé comme preuve d’inutilité.

La sortie App/artifacts/cp1-registry-report.json était déjà ignorée et non suivie, puis les tests la régénèrent. Elle ne compte ni comme suppression Git, ni comme gain net, ni comme fichier récupérable dans le checkpoint. Sa preuve de publication est copiée hors d’App ; les artifacts sont exclus de l’image Docker.
