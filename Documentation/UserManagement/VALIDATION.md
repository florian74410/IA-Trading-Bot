# Validation exécutée — 2026-10-16

Référence stable : `43863e817b45c0821de3928d585cfc58f55ce9c5`.
Node 22.23.3 ; dépendances installées depuis le lockfile ; SQLite natif et Argon2 natif.

## Suites

Commande : `IATB_FIREFOX_CONTAINER=1 bash App/Tools/CI/test_user_management_v1.sh`.

| Périmètre | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| `App/Tools/Tests/*.test.js` : Core, Auth21, stockage, sessions, CLI, intégration | 467 | 0 | 2 |
| Six suites Indicator hors smoke exigeant un fournisseur de marché actif | 6 | 0 | 0 |
| UI : Visual Renderer V2, drawing contract, Chart Workspace V2.1 | 20 | 0 | 0 |

Rerun ciblé après extension de la vérification des routes et des derniers
contrôles : `IATB_BROWSER_QA=1 node --test App/Tools/Tests/user_management_v1.test.js`.
Résultat : 11 réussis, 0 échec, 1 ignoré (inclus dans les deux ignorés ci-dessus).

Les deux skips concernent les parcours CLI positifs sur terminal réel avec UID
non-root (ancien Auth21 et nouvelle CLI). Le conteneur ne mappe que UID 0 ;
`chown` vers un UID non-root échoue EINVAL. Les assertions injectées sur les
commandes et les tests natifs des magasins ADMIN passent, mais ne remplacent pas
ce test OS. Il a ensuite été exécuté avec succès sur GitHub Actions Linux :
les deux tests PTY y passent, sans skip.

Run CI : https://github.com/florian74410/IA-Trading-Bot/actions/runs/38903457563
(commit `71fb5c0cf05944c76028988f06e1c04220a0484b`). Les logs ont été lus :
469 tests Core réussis, 6 suites Indicator réussies, 20 tests UI réussis,
0 échec et 0 ignoré. Les workflows Core legacy gate, Chart Workspace et
Indicator Visual Renderer passent également sur ce commit.

Une correction ultérieure active le mode terminal sans écho avant d'afficher
l'invite et évite de suivre les liens symboliques lors de la préparation d'un
fixture POSIX root ; rerun ciblé local : 11 réussis, 0 échec, 1 ignoré local.

## Preuves spécifiques

- Import du schéma sur une base existante avec sauvegarde SQLite, conservation
  de la clé client, refus de créer un second premier ADMIN et protection SQL
  du dernier ADMIN actif.
- Mots de passe Argon2, login email réel, pas de token brut dans les tables,
  throttling persistant, révocation par désactivation/reset/changement de mot
  de passe/email et expiration auditée.
- Alice/Bob : préférences, secrets et sessions séparés ; révocation d'une session
  étrangère refusée ; GUEST sans écriture métier.
- HTTPS réel : cookie HttpOnly/Secure/SameSite, refus HTTP, Origin et CSRF,
  absence de route web d'administration, headers/identifiants falsifiés refusés.
- Processus réels Core + Gateway + Router + Indicator, ports temporaires ;
  préférences de langue distinctes, indicateur Custom visible et calculable
  uniquement par son propriétaire. Revalidation de session à Core avant calcul.
- Firefox : login, ouverture du Profil existant, sessions actives, modification
  du nom avec le mot de passe actuel ; aucune erreur JavaScript sur ce parcours.
- Les routes Core inventoriées sont sondées sans session ; les 75 routes
  classées refusées sont aussi sondées avec une session USER.
- Coffre RSA réel généré dans un fixture : mauvais mot de passe sans écriture,
  import attribué une fois, refus d'attribution à Bob, préservation après reset
  et fichier source inchangé octet pour octet.
- Aucun diff de la base stable pour `indicator_engine.js`, les JSON BuiltIn,
  les fichiers `indicator_visual*` et `chart_workspace_v2.1.js`.

## Échecs rencontrés, corrigés et exclusions

Une première exécution trop large incluait `test_indicator_cp1_v2.js`, smoke
ancien qui exige un Router et un provider OHLCV démarrés : il échouait lorsque
ces services étaient absents. Il n'est pas compté comme réussi ni inclus dans
la commande autonome. Le nouveau test d'intégration utilise de vrais processus
Router/Indicator et des chandelles fictives explicitement fournies ; il ne prouve
pas une collecte de marché externe.

Les méthodes MarketData ajoutées en 2.1.1 n'étaient pas toutes dans l'inventaire
snapshot Auth21. Les points d'entrée ont reçu le même garde snapshot et les
assertions d'inventaire ont été étendues. Le calcul métier n'a pas été changé.
Un fixture multi-Engine allouait parfois deux fois le même port temporaire :
le sélecteur évite désormais les doublons de sa propre liste.
Un champ `undefined` dans la nouvelle réponse de calcul provoquait un désaccord
de hash CP/1 après sérialisation JSON : le champ optionnel vaut maintenant null.

Le contrôle `node Tools/CI/verify_rbac_registry.js` passe : 128 routes explicites,
63 actions UI read et 19 write. Les cinq actions 2.1.1 absentes du registre
Auth21 historique sont désormais classées. La politique par propriétaire est
déclarée séparément dans `rbac-v1.json`, version de permissions 2 ; cette
déclaration n'est pas une approbation de déploiement.

## Ce qui reste non qualifié

Les 75 routes refusées ne sont pas des fonctionnalités métier migrées. Voir
`../USER_MANAGEMENT_V1.md` et `route-inventory.json`. La PR reste en brouillon.
Aucune installation, migration, sauvegarde de données réelles, connexion GEN-1,
fusion de PR ou opération de trading n'a été exécutée.
