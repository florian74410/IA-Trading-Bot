# ROADMAP — IA-TB_Dev_Updater

Cette feuille de route définit l'ordre de développement retenu pour `IA-TB_Dev_Updater`.

## Principe directeur

Construire d'abord une workstation de développement fiable, utilisable manuellement et testable sans IA. Les agents IA seront intégrés en dernier, une fois que les services qu'ils utiliseront seront stables et sécurisés.

---

## Phase 1 — Socle local

- [ ] Garantir un lancement propre de l'application sur macOS 10.13.6+.
- [x] Stabiliser la configuration de l'application.
- [x] Centraliser et fiabiliser les logs.
- [ ] Finaliser le stockage sécurisé des identifiants et secrets.
- [x] Améliorer la gestion et l'affichage des erreurs.
- [ ] Vérifier le comportement au démarrage, à l'arrêt et en cas d'échec d'un service.
- [ ] Finaliser un lanceur macOS exécutable / raccourci `.app` permettant de démarrer IA-TB_Dev_Updater par double-clic sans utiliser le Terminal manuellement.

### Socle local — état d'implémentation

- Journal applicatif centralisé `~/.ia_tb_dev_updater/logs/app.log` ajouté.
- Rotation des journaux applicatifs ajoutée pour limiter leur taille.
- Capture des exceptions Python non gérées ajoutée.
- Journal de bootstrap `~/.ia_tb_dev_updater/logs/bootstrap.log` ajouté au lanceur.
- Démarrage et arrêt de l'application désormais tracés.
- Sauvegarde des paramètres rendue atomique afin de limiter les fichiers partiellement écrits.
- Détection et sauvegarde de secours des paramètres JSON corrompus avant régénération des valeurs par défaut.
- Contrôles de démarrage ajoutés : version Python et accès en écriture aux dossiers de données, workspace et logs.
- Affichage d'une erreur bloquante lisible si le bootstrap local ne peut pas terminer.
- Tests ajoutés pour les logs, les contrôles de démarrage et la récupération des paramètres corrompus.
- Le lanceur `.command` reste disponible pendant le développement.
- Le raccourci `.app` final sera construit après stabilisation complète du programme afin qu'il repose sur un démarrage fiable.

### Validation encore nécessaire avant clôture de la Phase 1

- Test réel sur le MacBook Pro macOS 10.13.6 cible.
- Vérification du comportement de fermeture depuis l'interface et après erreur d'un service réel.
- Audit final du stockage sécurisé Keychain / coffre local.
- Packaging final du lanceur macOS `.app` en fin de projet.

## Phase 2 — Git local

- [ ] Lire et afficher l'état du dépôt local.
- [ ] Lister et gérer les branches.
- [ ] Afficher les modifications et les diffs.
- [ ] Gérer checkout, pull et push.
- [ ] Préparer et créer des commits de manière contrôlée.
- [ ] Afficher l'historique Git utile au développement.
- [ ] Gérer proprement les erreurs et conflits Git.

## Phase 3 — GitHub

- [ ] Connecter réellement l'application au dépôt IA-TB.
- [ ] Lire et gérer les branches distantes.
- [ ] Consulter et gérer les Issues.
- [ ] Consulter et gérer les Pull Requests.
- [ ] Récupérer les builds et patchs nécessaires au développement.
- [ ] Afficher les statuts utiles du dépôt et des opérations distantes.
- [ ] Assurer une séparation claire entre les branches de développement, sauvegarde et production.

## Phase 4 — Gestion de projet

- [ ] Finaliser la gestion des tâches et de leur état.
- [ ] Suivre les versions IA-TB.
- [ ] Gérer les builds et patchs.
- [ ] Structurer et indexer les archives.
- [ ] Maintenir un journal d'audit exploitable.
- [ ] Relier les opérations Git/GitHub aux tâches et versions concernées.

## Phase 5 — Interface fonctionnelle

- [ ] Rendre le Dashboard réellement opérationnel.
- [ ] Intégrer les fonctions Git et GitHub à l'interface.
- [ ] Afficher les tâches, leur progression et leurs résultats.
- [ ] Afficher les logs et erreurs utiles.
- [ ] Finaliser les paramètres nécessaires au fonctionnement réel.
- [ ] Permettre l'exécution manuelle des principales opérations de développement.

> Priorité : la fonctionnalité avant l'ajout de nouvelles couches visuelles.

## Phase 6 — Permissions et sécurité

- [ ] Définir précisément les permissions par type d'action.
- [ ] Contrôler les opérations Git, GitHub et Shell avant leur exécution.
- [ ] Protéger les secrets et données sensibles.
- [ ] Protéger `main` et les opérations liées aux versions STABLE.
- [ ] Interdire les suppressions ou modifications critiques non autorisées.
- [ ] Journaliser les opérations sensibles.

## Phase 7 — Automatisation classique

Automatiser d'abord les tâches déterministes qui ne nécessitent aucune IA.

- [ ] Vérification d'un build.
- [ ] Calcul et contrôle des hashes.
- [ ] Préparation et validation d'archives.
- [ ] Détection et contrôle des versions.
- [ ] Vérifications de cohérence avant commit/push.
- [ ] Automatisation des tâches répétitives et sûres.

## Phase 8 — Agents IA

Les agents IA ne seront activés qu'après validation du socle précédent.

- [ ] Connecter le runtime aux services OpenAI.
- [ ] Finaliser l'Agent Manager.
- [ ] Intégrer Le Geek.
- [ ] Intégrer La Puce.
- [ ] Intégrer l'Archiviste.
- [ ] Faire passer toutes leurs actions par le système de permissions.
- [ ] Faire utiliser aux agents les services Git/GitHub/Shell déjà validés.
- [ ] Relier leurs missions au Task Manager et au journal d'audit.
- [ ] Tester chaque agent sur des missions contrôlées avant d'augmenter son autonomie.

### Règle STABLE

Aucun agent IA ne peut déclarer seul une version STABLE, supprimer une archive critique, manipuler des secrets ou effectuer une opération de production sensible. La validation finale STABLE reste humaine.

---

## Ordre de priorité

`Socle local → Git local → GitHub → Gestion de projet → Interface → Sécurité → Automatisation classique → Agents IA`

L'objectif est simple : **construire d'abord la workstation, puis donner progressivement les outils aux agents IA.**
