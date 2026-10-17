# IA-TB v2.2.5-R1 — Correctif de recette (PR #19, en cours)

## Références visuelles
- A : « Tableau de bord fintech IA en français(2).png » — vue d'ensemble Fundamental.
- B : « Image ChatGPT 17 oct. 2026, 21_37_47(1).png » — globe agrandi.
- C : « calendrier_économique_ia_tb_néon.png » — mois à gauche, agenda à droite, panneau de détails.
Les captures sont fournies dans la conversation et ne doivent pas devenir des données fictives dans le runtime.

## Travail codé
- Navigation : voyant vert retiré, espace pour Déconnexion et ADMIN.
- Trading IA : chargeur de barre de services partagé réactivé.
- Globe miniature : marqueurs agrandis au repos et au survol.
- Globe agrandi : contrôle de fermeture carré et meilleur usage des codes pays réels.
- Calendrier : vue mois/agenda/détail pilotée par l'adaptateur FED/CME existant.
- Tests : localisation indicative versus inconnue, valeurs de prévision nulles au sens numérique (0) préservées.

## Bloquants restant à résoudre
- Auth21 : Gateway et Router bloquent les écritures legacy sous Auth21 ; en mode authenticated l'ingress Engine refuse aussi les endpoints business. Ne supprimer aucune frontière de sécurité. Créer une permission serveur d'actualisation fondée sur la session vérifiée, protection CSRF, preuve action/body et validation côté Engine ; autoriser ADMIN et USER, interdire GUEST et anonyme.
- Globe : recette réelle de placement des points et validation du comportement au survol sans clipping.
- Calendriers : recette Firefox desktop/mobile, parsers CME PARSE_EMPTY et DYNAMIC_PAGE_NO_ROWS, événements date-only et disponibilité réelle.
- Trading IA : vérification du chargement de la barre d'état et absence de doublons.
- Fundamental : vérifier collecte, base SQLite, restitution UI, Supervisor et signaux chart, sans purge.
- Sécurité : tests de rôles, origine, expiration de session et absence de trading LIVE.

## Déploiement
La branche R1 n'est PAS déployée sur iatb-v225-test. La stack actuelle est encore l'image iatb:2.2.5-test. Ne pas toucher aux autres stacks ni promouvoir cette PR avant recette complète.

**Statut : EN COURS / brouillon / non livrable.**