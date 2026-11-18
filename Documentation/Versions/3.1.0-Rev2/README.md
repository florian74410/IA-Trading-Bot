# IA-TB 3.1.0 Rev2

Version applicative `3.1.0`, révision `3.1.0_Rev2`. Le socle immédiat est [la PR #34](https://github.com/florian74410/IA-Trading-Bot/pull/34) au commit `ea4038a22b9bc91d42bc0ba7d50b2602f95af871`, descendant direct de [la PR #33](https://github.com/florian74410/IA-Trading-Bot/pull/33) au commit `b304f65e36107ffc78c9a5b1116433df7743adcf`. La base antérieure est [3.0.2 Rev-X / PR #32](https://github.com/florian74410/IA-Trading-Bot/pull/32) à `6bdfd362`. Les branches, tags et têtes de PR distantes, l’historique des deux commits Rev1 et la recherche des PR 3.1.0 ont été consultés. Aucun tag 3.1.0, commit de livraison 3.1 autonome ou chantier 3.1.0 Rev2 antérieur n’a été identifié. La Rev2 de la série 3.0.1 est déjà dans l’ascendance.

| Chantier | Référence 3.1 / Rev1 | Comportement Rev2 | Preuve exécutable |
| --- | --- | --- | --- |
| Auth21, rôles, permissions, CSRF | Rev-X `6bdfd362`, Rev1 `b304f65e` | Connexion, refus GUEST et refus ADMIN sans rôle ou anti-CSRF valide | `user_management_v1.test.js` et `control_http.integration.test.js` |
| Companion et CP1 inter-Engines | PR #33 `b304f65e` | Commandes, diagnostics et analyse croisée selon permissions | `hybrid.test.js`, `companion-frontend-v1.2.test.js`, runner CP1 |
| Aide et fiche par intention | Catalogue Rev1 `b304f65e`, implémentation Rev2 | Aide locale dans les trois modes, fiche détaillée, suggestions, visibilité, aucune exécution | `help.test.js`, flux HTTP Auth21 dans `user_management_v1.test.js` |
| Panneau Companion en viewport réduit | Panneau hérité de PR #33 | En-tête, onglets et saisie accessibles. Déplacement, redimensionnement et défilement vérifiés | Parcours Firefox et Chromium dans `user_management_v1.test.js` |
| AI Supervisor et ChatBot | PR #34 `ea4038a2` | Écrans et persistance, liens historiques | Parcours Auth21 Chromium et Firefox |
| Trading, sélecteur Risk | PR #34 `ea4038a2`, socle Trading Rev1 `b304f65e` | Comptes sur Trading, sélecteur sombre, chaîne d’ordre qualifiée sur broker fictif | Parcours Auth21, `advanced_orders.integration.test.js`, `test:risk` |
| ADMIN et Analyse structurelle | PR #33 `b304f65e`, PR #34 `ea4038a2` | ADMIN sans emplacement logo vide et contenu défilant. Atlas, explorateur original, audit 3.0.2 Rev-X séparé du build installé | Parcours Auth21 sur les deux vues et vérification des refus HTTP |
| Réduction des requêtes Fundamental | PR #34 `ea4038a2` | Politique de rafraîchissement et traitement des limites de débit conservés | `tests/auth21_fundamental_refresh_policy_r1.test.cjs` et suites Fundamental |
| Version active et archive VPS | Version et révision déjà déclarées par Rev1, source runtime unifiée en Rev2 | 3.1.0 Rev1 et Rev2 distinguées malgré un même numéro applicatif. Version indisponible si les métadonnées manquent. Le SHA du commit est lu dans le reçu du package. | `runtime_build.test.js`, `release_version.test.js`, assertions Auth21 et contrôle du ZIP extrait |

Le fournisseur OpenAI et le broker sont fictifs ou absents dans la qualification. L’aide ne modifie pas l’intention ou la préparation courante. Les fiches `api.*` documentent le catalogue OKX de manière descriptive. La version de protocole CP/1 et la version auditée de l’Atlas conservent leur propre signification.

Le workflow `.github/workflows/iatb-310-rev1.yml` utilise Node 22, exécute les parcours sur les deux navigateurs, construit le ZIP deux fois, vérifie les empreintes et rejoue la qualification depuis l’extraction. La procédure [VPS à blanc](../../../Deploy/VPS/README-3.1.0_Rev2.md) accompagne le build.
