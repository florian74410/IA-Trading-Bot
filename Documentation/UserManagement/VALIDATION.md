# User Management V1 — preuves de qualification

Base stable : `43863e817b45c0821de3928d585cfc58f55ce9c5`.
Environnement : Node 22, SQLite et Argon2 natifs, Firefox/Playwright.
Comptes, clés et données fictifs uniquement. Aucun accès GEN-1, déploiement,
Trading Engine démarré, appel fournisseur facturé ni ordre réel.

## Preuves GitHub vérifiées sur a9d61354

Les logs des jobs ont été lus, au-delà du seul statut vert.

| Suite | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Core, Auth21, CLI, stockage, intégration | 478 | 0 | 0 |
| Six suites Indicator | 6 | 0 | 0 |
| UI, Chart Workspace, Renderer V2 | 20 | 0 | 0 |

[Run User Management](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38909148982).
Les workflows Core legacy gate, Chart Workspace et Indicator Visual Renderer
sont également verts sur ce commit. Les tests de terminal réel non-root ont
réussi sur le runner Linux GitHub.

[Recette Docker à 13 services](https://github.com/florian74410/IA-Trading-Bot/actions/runs/38909149157) :
construction de l'image, lancement des 13 conteneurs, sondes des services,
TLS avec certificat épinglé, socket UI, connexion Alice/Bob, isolation des
réglages/Mosaïques et lectures Strategy/Portfolio, arrêt et redémarrage sans
suppression des données, contrôle de persistance, déconnexion. Les deux sondes
avant/après redémarrage rapportent `services:13`, `ownerIsolation:true`,
`tradingStarted:false`, `network:internal-only`, `data:fictional`.
Cette recette ne couvre pas encore tous les parcours métier de chaque écran.
Le premier échec de sonde Router a été corrigé ; il n'est pas compté comme succès.

## Complément de finalisation

Commande complète :

```sh
IATB_FIREFOX_CONTAINER=1 bash App/Tools/CI/test_user_management_v1.sh
node Tools/CI/verify_rbac_registry.js
node App/Tools/CI/user_management_route_inventory.js
```

Le passage local complémentaire exécute 482 tests Core (480 réussis, deux
skips locaux de terminal non-root), six suites Indicator et 20 tests UI.
Le test additionnel de refus du fallback RPC opérateur passe séparément.
La CI doit requalifier le commit publié correspondant ; le dernier statut
est lié dans la PR. Les deux skips locaux ne sont pas transformés en succès.

Un premier passage a détecté l'absence du nouveau writer CLI dans l'inventaire
statique. Le fichier est désormais explicitement classé hors snapshot expérimental,
sans prétendre qu'il est coordonné par ce dernier. Les assertions d'inventaire
restent actives. Le contrôle RBAC statique passe : 212 déclarations,
130 routes littérales contrôlées, 63 actions UI read et 19 write.

Ajouts couverts par des tests natifs :

- Réauthentification des secrets, effacement personnel, refus de faux propriétaire.
- Fenêtre Firefox de réauthentification : saisie du mot de passe, requête reprise,
  succès de l'effacement et fermeture de la fenêtre, sans erreur JavaScript.
- RPC privé Alice absent pour Bob, rejet localhost/IP/HTTP/origine non approuvée,
  aucune sauvegarde partielle des secrets en cas d'entrée invalide.
- Supervisor personnel MOCK et refus explicite d'un REMOTE_LLM non qualifié.
- Import Portfolio des événements/balances/snapshots/trades/réglages vers un seul
  propriétaire, sauvegarde native incluant WAL, source inchangée, conflit et
  interruption annulant la copie.
- Import Settings chiffré par propriétaire et revendication d'attribution unique.
- Attribution wallet : même clé originale et mêmes enveloppes de secrets,
  déchiffrement par Alice et aucune lecture de wallet par Bob.
- Firewall machine : token et HMAC du corps obligatoires ; un secret machine
  seul ne permet pas d'arrêter une protection. Une capacité ADMIN liée au corps,
  au chemin et à une session vivante est désormais requise. La recette Docker
  étendue vérifie le refus machine et l'arrêt/redémarrage de la seule protection
  Data avec un ADMIN fictif. Elle doit réussir sur le nouveau commit.

## Migrations, crash et restauration

Schémas v3 et v4 conservés, migration additive v5 pour `permissions_version=3`.
Les anciennes sessions sont révoquées, les identifiants/empreintes PBKDF2,
chiffrements d'identité et clés originales sont conservés. Tests natifs SIGKILL
entre v3/v4 et au milieu de v4 : reprise vers v5, intégrité, sauvegarde de la
version initiale, restauration dans un nouveau fichier, déchiffrement avec la
même clé et conservation d'un marqueur historique. Une mauvaise clé est refusée
avant sauvegarde ou modification du schéma.

Les imports exigent des writers arrêtés et ne remplacent pas une sauvegarde
cohérente de la stack. Un rollback garde les données récentes séparées pour
réconciliation ; aucune suppression de volume ni restauration sur base ouverte.

## Limites de preuve et blocages

Les 75 routes initialement refusées sont classées individuellement dans
`legacy-route-decisions.json` : leur classification n'est pas une acceptation.
La validation de chaque écran métier, de tous les échanges privés inter-Engines,
des formats historiques de stratégies/Custom/dashboards et de la chaîne complète
d'exécution reste inachevée. Les tests IA utilisent des réponses fictives : ils
ne prouvent pas une disponibilité ou une facturation réelles du fournisseur.

Décisions explicites encore nécessaires pour accepter une limitation :
exécution Trading/transferts/swaps, ancien test Apple Mail sous Linux, REMOTE_LLM.
Les capacités non migrées restent refusées. Aucun refus n'est présenté comme
fonctionnalité livrée. La PR reste en brouillon et n'est pas prête à intégrer.
